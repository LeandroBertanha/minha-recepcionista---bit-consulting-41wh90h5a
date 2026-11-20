import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')

const loadAttentionService = (pb) => {
  const file = 'src/services/attention.ts'
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === '@/lib/pocketbase/client') return { __esModule: true, default: pb }
      throw new Error(`Importação não simulada: ${name}`)
    },
  })
  return exports
}

test('fila humana lista somente contatos aguardando na sessão do login', async () => {
  const calls = []
  const pb = {
    authStore: { record: { id: 'richard' } },
    filter: (expression, parameters) => JSON.stringify({ expression, parameters }),
    collection: (name) => ({
      getFullList: async (options) => {
        calls.push({ name, ...JSON.parse(options.filter), sort: options.sort })
        return []
      },
      update: async () => ({}),
    }),
  }
  const service = loadAttentionService(pb)

  await service.getAttentionContacts('bit-consulting')

  assert.equal(calls[0].name, 'whatsapp_contacts')
  assert.match(calls[0].expression, /organization_id = \{:organizationId\}/)
  assert.match(calls[0].expression, /instance_id\.user_id = \{:userId\}/)
  assert.match(calls[0].expression, /status = "waiting"/)
  assert.equal(calls[0].parameters.userId, 'richard')
  assert.equal(calls[0].parameters.organizationId, 'bit-consulting')
})

test('assumir atendimento mantém a IA pausada e retira o contato da fila', async () => {
  const calls = []
  const pb = {
    authStore: { record: { id: 'richard' } },
    filter: () => '',
    collection: (name) => ({
      getFullList: async () => [],
      update: async (id, body) => {
        calls.push({ name, id, body })
        return { id, ...body }
      },
    }),
  }
  const service = loadAttentionService(pb)

  await service.assumeAttentionContact('contact-richard')

  assert.deepEqual(JSON.parse(JSON.stringify(calls[0])), {
    name: 'whatsapp_contacts',
    id: 'contact-richard',
    body: { agent_paused: true, status: 'in_conversation' },
  })
})

test('tela Precisa de você usa a fila real e abre o contato assumido no Inbox', () => {
  const app = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8')

  assert.match(app, /getAttentionContacts\(tenant\.id\)/)
  assert.match(app, /assumeAttentionContact\(row\.contactId\)/)
  assert.match(app, /initialContactId=\{attentionConversation\.contactId\}/)
  assert.match(app, /instanceIdOverride=\{attentionConversation\.instanceId\}/)
  assert.doesNotMatch(app, /Carlos Eduardo|Beatriz Nunes|Fernando Alves|Camila Rocha/)
})
