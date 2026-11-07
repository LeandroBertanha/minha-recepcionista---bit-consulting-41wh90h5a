import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { DatabaseSync } from 'node:sqlite'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../pocketbase/migrations/0016_whatsapp_user_scope.js', import.meta.url), 'utf8')

function harness({ duplicateOwner = false, missingOwner = false, documents = false, chunksOnly = false } = {}) {
  const db = new DatabaseSync(':memory:')
  db.exec(`
    CREATE TABLE whatsapp_instances (id TEXT PRIMARY KEY, user_id TEXT, organization_id TEXT, instance_name TEXT);
    CREATE TABLE whatsapp_contacts (id TEXT PRIMARY KEY, user_id TEXT, organization_id TEXT, instance_id TEXT, remote_jid TEXT);
    CREATE TABLE whatsapp_messages (id TEXT PRIMARY KEY, user_id TEXT, organization_id TEXT, instance_id TEXT, contact_id TEXT, message_id TEXT, body TEXT);
    INSERT INTO whatsapp_instances VALUES ('leandro-instance', 'leandro', 'company-1', 'user_leandro');
    INSERT INTO whatsapp_contacts VALUES ('contact-legacy', 'leandro', 'company-1', 'leandro-instance', '5511999999999@s.whatsapp.net');
    INSERT INTO whatsapp_messages VALUES ('message-legacy', 'richard', 'company-1', 'leandro-instance', 'contact-legacy', 'same-provider-id', 'Histórico preservado');
    CREATE UNIQUE INDEX idx_wi_name ON whatsapp_instances (instance_name);
    CREATE INDEX idx_wc_jid ON whatsapp_contacts (user_id, remote_jid);
    CREATE UNIQUE INDEX idx_wm_id ON whatsapp_messages (message_id);
    CREATE INDEX idx_messages_contact_legacy ON whatsapp_messages (contact_id);
  `)
  if (duplicateOwner) db.exec("INSERT INTO whatsapp_instances VALUES ('other-legacy', 'leandro', 'company-1', 'other-legacy-name')")
  if (missingOwner) db.exec("UPDATE whatsapp_instances SET user_id = '' WHERE id = 'leandro-instance'")
  const media = { name: 'media_file', protected: false }
  const oldAccess = "@request.auth.id != ''"
  const collection = (name, indexes = []) => ({
    name, indexes: [...indexes], listRule: oldAccess, viewRule: oldAccess,
    createRule: oldAccess, updateRule: oldAccess, deleteRule: oldAccess,
    fields: { getByName: (field) => name === 'whatsapp_messages' && field === 'media_file' ? media : null },
  })
  const collections = {
    whatsapp_instances: collection('whatsapp_instances', ['CREATE UNIQUE INDEX idx_wi_name ON whatsapp_instances (instance_name)']),
    whatsapp_contacts: collection('whatsapp_contacts', ['CREATE INDEX idx_wc_jid ON whatsapp_contacts (user_id, remote_jid)']),
    whatsapp_messages: collection('whatsapp_messages', [
      'CREATE UNIQUE INDEX idx_wm_id ON whatsapp_messages (message_id)',
      'CREATE INDEX idx_messages_contact_legacy ON whatsapp_messages (contact_id)',
    ]),
    ai_agents: collection('ai_agents'),
  }
  if (documents) collections.agent_documents = collection('agent_documents')
  if (documents || chunksOnly) collections.agent_document_chunks = collection('agent_document_chunks')
  const persisted = new Map(Object.values(collections).map((item) => [item.name, [...item.indexes]]))
  const saves = []
  let up
  let down
  const indexName = (sql) => sql.match(/\bINDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?["`\[]?([a-z_][a-z_0-9]*)/i)?.[1]
  vm.runInNewContext(source, { migrate(forward, backward) { up = forward; down = backward } })
  const app = {
    findCollectionByNameOrId(name) {
      if (!collections[name]) throw new Error('Collection not found')
      return collections[name]
    },
    findAllRecords(name) {
      assert.equal(name, 'whatsapp_instances')
      return db.prepare('SELECT * FROM whatsapp_instances ORDER BY id').all().map((row) => ({ id: row.id, getString: (field) => String(row[field] ?? '') }))
    },
    save(item) {
      assert.equal(collections[item.name], item, 'A migration não pode salvar ou reatribuir registros operacionais')
      saves.push({ name: item.name, indexes: [...item.indexes], listRule: item.listRule, viewRule: item.viewRule })
      const previous = persisted.get(item.name) || []
      for (const sql of previous) {
        if (!item.indexes.some((next) => indexName(next) === indexName(sql))) db.exec(`DROP INDEX "${indexName(sql)}"`)
      }
      for (const sql of item.indexes) {
        if (!previous.some((before) => indexName(before) === indexName(sql))) db.exec(sql)
      }
      persisted.set(item.name, [...item.indexes])
    },
    delete() { assert.fail('A migration não pode excluir registros ou coleções') },
  }
  const rows = () => ({
    instances: db.prepare('SELECT * FROM whatsapp_instances ORDER BY id').all().map((row) => ({ ...row })),
    contacts: db.prepare('SELECT * FROM whatsapp_contacts ORDER BY id').all().map((row) => ({ ...row })),
    messages: db.prepare('SELECT * FROM whatsapp_messages ORDER BY id').all().map((row) => ({ ...row })),
  })
  return { db, collections, saves, media, rows, run: () => up(app), rollback: () => down(app) }
}

test('migration preserva históricos e usa a sessão como autoridade, inclusive em mensagens escritas por outro usuário', () => {
  const h = harness({ documents: true })
  try {
    const before = h.rows()
    h.run()
    assert.deepEqual(h.rows(), before)
    assert.match(h.collections.whatsapp_instances.viewRule, /user_id = @request\.auth\.id/)
    for (const name of ['whatsapp_contacts', 'whatsapp_messages', 'ai_agents']) {
      assert.match(h.collections[name].viewRule, /instance_id\.user_id = @request\.auth\.id/)
      assert.match(h.collections[name].viewRule, /instance_id\.organization_id = organization_id/)
    }
    assert.doesNotMatch(h.collections.whatsapp_messages.viewRule, /(?:^|&&)\s*user_id = @request\.auth\.id/)
    assert.equal(h.media.protected, true)
    assert.equal(h.collections.whatsapp_messages.createRule, null)
    assert.equal(h.collections.whatsapp_instances.updateRule, null)
    assert.match(h.collections.agent_documents.viewRule, /agent_id\.instance_id\.user_id = @request\.auth\.id/)
    assert.match(h.collections.agent_document_chunks.viewRule, /document_id\.agent_id\.instance_id\.user_id = @request\.auth\.id/)
  } finally { h.db.close() }
})

test('índice real SQLite permite mesmo ID em sessões distintas, mas continua bloqueando duplicata na mesma sessão', () => {
  const h = harness()
  try {
    h.run()
    const insert = h.db.prepare('INSERT INTO whatsapp_messages VALUES (?, ?, ?, ?, ?, ?, ?)')
    assert.doesNotThrow(() => insert.run('message-richard', 'richard', 'company-1', 'richard-instance', 'contact-richard', 'same-provider-id', 'Mensagem independente'))
    assert.throws(() => insert.run('message-duplicate', 'richard', 'company-1', 'richard-instance', 'contact-richard', 'same-provider-id', 'Duplicata'), /UNIQUE constraint failed/)
    assert.equal(h.db.prepare('SELECT COUNT(*) AS count FROM whatsapp_messages').get().count, 2)
    assert.equal(h.db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_messages_contact_legacy'").get().name, 'idx_messages_contact_legacy')
    const messageSaves = h.saves.filter((item) => item.name === 'whatsapp_messages')
    assert.equal(messageSaves.length, 2)
    assert.ok(messageSaves[0].indexes.some((sql) => sql.includes('idx_wm_id')))
    assert.ok(messageSaves[0].indexes.some((sql) => sql.includes('idx_whatsapp_messages_instance_message')))
    assert.equal(messageSaves[1].indexes.some((sql) => /\bidx_wm_id\b/.test(sql)), false)
  } finally { h.db.close() }
})

test('índice real impede preparar duas sessões do mesmo login na mesma empresa e permite outro login', () => {
  const h = harness()
  try {
    h.run()
    assert.throws(() => h.db.prepare('INSERT INTO whatsapp_instances VALUES (?, ?, ?, ?)').run('duplicate', 'leandro', 'company-1', 'different-name'), /UNIQUE constraint failed/)
    assert.doesNotThrow(() => h.db.prepare('INSERT INTO whatsapp_instances VALUES (?, ?, ?, ?)').run('richard-instance', 'richard', 'company-1', 'user_richard'))
  } finally { h.db.close() }
})

for (const [name, options] of [
  ['proprietário duplicado', { duplicateOwner: true }],
  ['sessão sem proprietário', { missingOwner: true }],
]) {
  test(`preflight rejeita ${name} antes de salvar qualquer coleção ou alterar histórico`, () => {
    const h = harness(options)
    try {
      const before = h.rows()
      assert.throws(() => h.run())
      assert.equal(h.saves.length, 0)
      assert.deepEqual(h.rows(), before)
      assert.ok(h.db.prepare("SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_wm_id'").get())
    } finally { h.db.close() }
  })
}

test('rollback não apaga dados nem reabre o acesso compartilhado às sessões', () => {
  const h = harness()
  try {
    h.run()
    const before = h.rows()
    const rules = Object.fromEntries(Object.values(h.collections).map((item) => [item.name, item.viewRule]))
    const saves = h.saves.length
    h.rollback()
    assert.deepEqual(h.rows(), before)
    assert.deepEqual(Object.fromEntries(Object.values(h.collections).map((item) => [item.name, item.viewRule])), rules)
    assert.equal(h.saves.length, saves)
  } finally { h.db.close() }
})
