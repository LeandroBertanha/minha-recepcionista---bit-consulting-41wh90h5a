import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const readHook = (name) => readFile(new URL(`../pocketbase/hooks/${name}.js`, import.meta.url), 'utf8')
const [sendSource, logoutSource, webhookSource] = await Promise.all([
  readHook('message_send'),
  readHook('instance_logout'),
  readHook('webhook_evolution'),
])

const apiUrl = 'https://evolution.example.test'
const secret = 'test-webhook-secret'
const apiKey = 'test-api-key'

function record(values) {
  return {
    id: values.id,
    values,
    getString: (field) => String(values[field] ?? ''),
    getBool: (field) => values[field] === true,
    set: (field, value) => { values[field] = value },
    toJSON: () => ({ ...values }),
  }
}

// Executa apenas comparações parametrizadas usadas pelos hooks. Sem o predicado
// de usuário/instância, o registro alheio (primeiro da lista) realmente é escolhido.
function matches(row, filter, params = {}) {
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*\{:(\w+)\}/g)) {
    if (row.getString(match[1]) !== String(params[match[2]] ?? '')) return false
  }
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*["']([^"']*)["']/g)) {
    // Papéis agrupados por OR são tratados no acesso à associação abaixo.
    if (match[1] === 'role') continue
    if (row.getString(match[1]) !== match[2]) return false
  }
  return true
}

function errors() {
  return Object.fromEntries([
    ['ForbiddenError', 403], ['BadRequestError', 400],
    ['InternalServerError', 500], ['UnauthorizedError', 401],
  ].map(([name, status]) => [name, class extends Error {
    constructor(message) { super(message); this.name = name; this.status = status }
  }]))
}

function executeSend({
  userId = 'richard',
  instanceOwner = 'richard',
  contactAuthor = instanceOwner,
  organization = 'company-1',
  organizationStatus = 'active',
  membership = true,
  role = 'admin',
} = {}) {
  const calls = []
  const saved = []
  const contact = record({
    id: 'contact-1', user_id: contactAuthor, organization_id: organization,
    instance_id: 'instance-1', remote_jid: '5511999999999@s.whatsapp.net',
  })
  const instance = record({
    id: 'instance-1', user_id: instanceOwner, organization_id: organization,
    instance_name: `session-${instanceOwner}`, status: 'connected',
  })
  let route
  const errorTypes = errors()
  vm.runInNewContext(sendSource, {
    ...errorTypes,
    routerAdd: (_method, _path, handler) => { route = handler },
    Record: class { constructor(collection) { return record({ id: 'new-message', collection: collection.name }) } },
    $apis: { requireAuth: () => Symbol('auth'), bodyLimit: () => Symbol('limit') },
    $security: { randomString: () => 'random-id' },
    $secrets: { get: (name) => ({ EVOLUTION_API_URL: apiUrl, EVOLUTION_API_KEY: apiKey })[name] },
    $app: {
      findRecordById(collection, id) {
        if (collection === 'whatsapp_contacts' && id === contact.id) return contact
        if (collection === 'whatsapp_instances' && id === instance.id) return instance
        if (collection === 'organizations' && id === organization) return record({ id, owner_id: 'leandro', status: organizationStatus })
        throw new Error('Record not found')
      },
      findFirstRecordByFilter(collection, filter, params) {
        assert.equal(collection, 'organization_members')
        if (!membership || organization !== 'company-1') throw new Error('Membership not found')
        const row = record({ user_id: userId, organization_id: 'company-1', status: 'active', role })
        if (!matches(row, filter, params)) throw new Error('Membership not found')
        return row
      },
      findCollectionByNameOrId: (name) => ({ name }),
      saveNoValidate(row) { saved.push({ ...row.values }) },
      logger: () => ({ error() {}, warn() {} }),
    },
    $http: { send(request) { calls.push(JSON.parse(JSON.stringify(request))); return { statusCode: 201, json: { key: { id: 'upstream-message' } } } } },
  })
  let response
  try {
    response = route({
      auth: { id: userId },
      requestInfo: () => ({ body: { contact_id: contact.id, text: 'Mensagem de teste', type: 'text' } }),
      findUploadedFiles: () => [],
      json: (status, body) => ({ status, body }),
    })
  } catch (error) {
    response = { status: error.status, body: { message: error.message } }
  }
  return { response, calls, saved, contact, instance }
}

test('administrador da mesma empresa não envia mensagem pela sessão de outro login', () => {
  const result = executeSend({ userId: 'richard', instanceOwner: 'leandro' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

test('o autor histórico do contato não concede propriedade sobre a sessão de outra pessoa', () => {
  const result = executeSend({ userId: 'richard', instanceOwner: 'leandro', contactAuthor: 'richard' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

test('proprietário da empresa também não envia pela sessão pessoal de Richard', () => {
  const result = executeSend({ userId: 'leandro', instanceOwner: 'richard' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

test('envio permitido usa somente a própria sessão e preserva a empresa e o contato', () => {
  const result = executeSend()

  assert.equal(result.response.status, 200)
  assert.equal(result.calls.length, 1)
  assert.equal(result.calls[0].url, `${apiUrl}/message/sendText/session-richard`)
  const message = result.saved.find((item) => item.collection === 'whatsapp_messages')
  assert.equal(message.instance_id, 'instance-1')
  assert.equal(message.organization_id, 'company-1')
  assert.equal(message.contact_id, 'contact-1')
  assert.equal(message.user_id, 'richard')
  assert.equal(message.message_id, 'upstream-message')
})

test('membro sem vínculo ativo não envia nem usando uma sessão com seu user_id', () => {
  const result = executeSend({ membership: false })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

test('organização inativa impede envio pela própria sessão antes de qualquer chamada externa', () => {
  const result = executeSend({ organizationStatus: 'inactive' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

test('membro somente leitura não envia mesmo na própria sessão', () => {
  const result = executeSend({ role: 'viewer' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saved.length, 0)
})

function executeLogout({ ownInstance = true, membership = true } = {}) {
  const userId = 'richard'
  const foreign = record({ id: 'leandro-instance', user_id: 'leandro', organization_id: 'company-1', instance_name: 'session-leandro', status: 'connected' })
  const own = record({ id: 'richard-instance', user_id: userId, organization_id: 'company-1', instance_name: 'session-richard', status: 'connected' })
  const candidates = [foreign, ...(ownInstance ? [own] : [])]
  const calls = []
  const saves = []
  let route
  vm.runInNewContext(logoutSource, {
    routerAdd: (_method, _path, handler) => { route = handler },
    $apis: { requireAuth: () => Symbol('auth') },
    $secrets: { get: (name) => ({ EVOLUTION_API_URL: apiUrl, EVOLUTION_API_KEY: apiKey })[name] },
    $app: {
      findFirstRecordByFilter(collection, filter, params) {
        if (collection === 'organization_members') {
          if (!membership) throw new Error('Membership not found')
          return record({ role: 'admin', status: 'active', user_id: userId, organization_id: 'company-1' })
        }
        assert.equal(collection, 'whatsapp_instances')
        const selected = candidates.find((candidate) => matches(candidate, filter, params))
        if (!selected) throw new Error('Instance not found')
        return selected
      },
      findFirstRecordByData: () => foreign,
      findRecordById(collection, id) {
        assert.equal(collection, 'organizations')
        return record({ id, owner_id: 'leandro', status: 'active' })
      },
      save(row) { saves.push(row.id) },
      saveNoValidate(row) { saves.push(row.id) },
      logger: () => ({ error() {} }),
    },
    $http: { send(request) { calls.push(JSON.parse(JSON.stringify(request))); return { statusCode: 200, json: {} } } },
  })
  const response = route({
    auth: { id: userId },
    requestInfo: () => ({ body: {} }),
    json: (status, body) => ({ status, body }),
    notFoundError: (message) => ({ status: 404, body: { message } }),
    forbiddenError: (message) => ({ status: 403, body: { message } }),
    unauthorizedError: (message) => ({ status: 401, body: { message } }),
  })
  return { response, calls, saves, foreign, own }
}

test('logout sem sessão própria não desconecta a primeira sessão conectada da empresa', () => {
  const result = executeLogout({ ownInstance: false })

  assert.equal(result.response.status, 404)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
  assert.equal(result.foreign.getString('status'), 'connected')
})

test('logout da própria sessão preserva a sessão conectada de Leandro', () => {
  const result = executeLogout()

  assert.equal(result.response.status, 200)
  assert.equal(result.calls.length, 1)
  assert.equal(result.calls[0].url, `${apiUrl}/instance/logout/session-richard`)
  assert.deepEqual(result.saves, ['richard-instance'])
  assert.equal(result.foreign.getString('status'), 'connected')
  assert.equal(result.own.getString('status'), 'disconnected')
})

test('logout sem associação ativa não chama o provedor', () => {
  const result = executeLogout({ membership: false })

  assert.ok([403, 404].includes(result.response.status))
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
})

function webhookHarness() {
  const instances = [
    record({ id: 'leandro-instance', user_id: 'leandro', organization_id: 'company-1', instance_name: 'session-leandro', status: 'connected' }),
    record({ id: 'richard-instance', user_id: 'richard', organization_id: 'company-1', instance_name: 'session-richard', status: 'pending' }),
  ]
  const contacts = []
  const messages = []
  const httpCalls = []
  const saves = []
  const collections = { whatsapp_instances: instances, whatsapp_contacts: contacts, whatsapp_messages: messages }
  let route
  let sequence = 0
  vm.runInNewContext(webhookSource, {
    routerAdd: (_method, _path, handler) => { route = handler },
    console: { info() {}, error() {} },
    Record: class { constructor(collection) { return record({ id: `new-${++sequence}`, collection: collection.name }) } },
    $secrets: { get: (name) => ({ EVOLUTION_WEBHOOK_SECRET: secret, EVOLUTION_API_URL: apiUrl, EVOLUTION_API_KEY: apiKey })[name] },
    $app: {
      findFirstRecordByData(collection, field, value) {
        const selected = collections[collection]?.find((row) => row.getString(field) === String(value))
        if (!selected) throw new Error('Record not found')
        return selected
      },
      findRecordsByFilter(collection, filter, _sort, limit, offset, params) {
        return (collections[collection] || []).filter((row) => matches(row, filter, params)).slice(offset, offset + limit)
      },
      findFirstRecordByFilter(collection, filter, params) {
        const selected = (collections[collection] || []).find((row) => matches(row, filter, params))
        if (!selected) throw new Error('Record not found')
        return selected
      },
      findCollectionByNameOrId: (name) => ({ name }),
      saveNoValidate(row) {
        saves.push(row.id)
        const list = collections[row.values.collection]
        if (list && !list.some((existing) => existing.id === row.id)) list.push(row)
      },
      logger: () => ({ error() {}, warn() {} }),
    },
    $http: { send(request) { httpCalls.push(request); throw new Error('Nenhum HTTP é necessário para texto') } },
  })
  const emit = (instance, { event = 'messages.upsert', messageId = 'same-upstream-id', text = 'Teste isolado', data, header = secret } = {}) => route({
    request: { header: { get: () => header } },
    requestInfo: () => ({ body: {
      event, instance,
      data: data || { key: { id: messageId, remoteJid: '5511999999999@s.whatsapp.net', fromMe: false }, pushName: 'Contato de teste', message: { conversation: text } },
    } }),
    json: (status, body) => ({ status, body }),
  })
  return { emit, instances, contacts, messages, httpCalls, saves }
}

test('mesmo contato e mesmo message_id em duas sessões geram históricos independentes', () => {
  const h = webhookHarness()
  assert.equal(h.emit('session-leandro').status, 200)
  assert.equal(h.emit('session-richard').status, 200)

  assert.equal(h.contacts.length, 2)
  assert.equal(h.messages.length, 2)
  for (const owner of ['leandro', 'richard']) {
    const contact = h.contacts.find((row) => row.getString('instance_id') === `${owner}-instance`)
    const message = h.messages.find((row) => row.getString('instance_id') === `${owner}-instance`)
    assert.ok(contact, `Contato de ${owner} ausente`)
    assert.ok(message, `Mensagem de ${owner} ausente`)
    assert.equal(contact.getString('user_id'), owner)
    assert.equal(message.getString('user_id'), owner)
    assert.equal(message.getString('contact_id'), contact.id)
    assert.equal(message.getString('organization_id'), 'company-1')
  }
  assert.equal(h.httpCalls.length, 0)
})

test('reenvio do mesmo webhook é deduplicado somente dentro da própria sessão', () => {
  const h = webhookHarness()
  h.emit('session-leandro')
  h.emit('session-richard')
  h.emit('session-richard')

  assert.equal(h.contacts.length, 2)
  assert.equal(h.messages.length, 2)
  assert.equal(h.messages.filter((row) => row.getString('instance_id') === 'richard-instance').length, 1)
})

test('evento de conexão de Richard não altera o status da instância de Leandro', () => {
  const h = webhookHarness()
  const response = h.emit('session-richard', { event: 'connection.update', data: { state: 'close' } })

  assert.equal(response.status, 200)
  assert.equal(h.instances[0].getString('status'), 'connected')
  assert.equal(h.instances[1].getString('status'), 'disconnected')
  assert.equal(h.contacts.length, 0)
  assert.equal(h.messages.length, 0)
})

test('webhook não autenticado não cria contato, mensagem nem altera conexão', () => {
  const h = webhookHarness()
  const response = h.emit('session-richard', { header: 'wrong-secret' })

  assert.equal(response.status, 401)
  assert.equal(h.saves.length, 0)
  assert.equal(h.httpCalls.length, 0)
  assert.equal(h.contacts.length, 0)
  assert.equal(h.messages.length, 0)
})
