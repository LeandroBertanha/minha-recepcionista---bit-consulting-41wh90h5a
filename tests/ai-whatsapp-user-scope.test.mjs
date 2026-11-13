import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../pocketbase/hooks/on_message_create_ai.js', import.meta.url), 'utf8')

function record(values) {
  return {
    id: values.id,
    values,
    getString: (field) => String(values[field] ?? ''),
    getBool: (field) => values[field] === true,
    set: (field, value) => { values[field] = value },
  }
}

function matches(row, filter, params = {}) {
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*\{:(\w+)\}/g)) {
    if (row.getString(match[1]) !== String(params[match[2]] ?? '')) return false
  }
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*["']([^"']*)["']/g)) {
    if (row.getString(match[1]) !== match[2]) return false
  }
  return true
}

async function execute({ contactInstance = 'richard-instance', contactOrganization = 'company-1', messageUser = 'richard' } = {}) {
  const current = record({
    id: 'incoming-richard', direction: 'in', user_id: messageUser,
    organization_id: 'company-1', instance_id: 'richard-instance',
    contact_id: 'richard-contact', body: 'Pergunta de Richard',
  })
  const contact = record({ id: 'richard-contact', user_id: 'richard', organization_id: contactOrganization, instance_id: contactInstance, remote_jid: '5511999999999@s.whatsapp.net', agent_paused: false })
  const session = record({ id: 'richard-instance', user_id: 'richard', organization_id: 'company-1', instance_name: 'session-richard' })
  // Um agente associado indevidamente à mesma sessão e uma mensagem histórica
  // da sessão de Leandro aparecem antes dos registros legítimos de propósito.
  const agents = [
    record({ id: 'foreign-agent', organization_id: 'company-1', instance_id: session.id, user_id: 'leandro', active: true, provider: 'openai', api_key: 'foreign-fixture-key', system_prompt: 'Fonte de outro login' }),
    record({ id: 'own-agent', organization_id: 'company-1', instance_id: session.id, user_id: 'richard', active: true, provider: 'openai', api_key: 'own-fixture-key', system_prompt: 'Atenda Richard' }),
  ]
  const messages = [
    record({ id: 'foreign-message', direction: 'in', user_id: 'leandro', organization_id: 'company-1', instance_id: 'leandro-instance', contact_id: current.getString('contact_id'), body: 'Histórico privado de outro login' }),
    current,
  ]
  const calls = []
  const queries = []
  const saves = []
  let nextCount = 0
  let handler
  vm.runInNewContext(source, {
    onRecordAfterCreateSuccess(fn) { handler = fn },
    Record: class { constructor() { return record({ id: 'new-ai-message' }) } },
    $security: { randomString: () => 'fixture-id' },
    $secrets: { get: (name) => ({ EVOLUTION_API_URL: 'https://evolution.example.test', EVOLUTION_API_KEY: 'evolution-fixture-key' })[name] },
    $app: {
      findRecordById(collection, id) {
        if (collection === 'whatsapp_contacts' && id === contact.id) return contact
        if (collection === 'whatsapp_instances' && id === session.id) return session
        throw new Error('Record not found')
      },
      findRecordsByFilter(collection, filter, _sort, limit, offset, params) {
        queries.push({ collection, filter, params })
        return (collection === 'ai_agents' ? agents : messages).filter((row) => matches(row, filter, params)).slice(offset, offset + limit)
      },
      findCollectionByNameOrId: (name) => ({ name }),
      saveNoValidate(row) { saves.push({ ...row.values }) },
      logger: () => ({ error() {} }),
    },
    $http: {
      send(request) {
        const call = JSON.parse(JSON.stringify(request))
        calls.push(call)
        if (call.url === 'https://httpbin.org/delay/7') return { statusCode: 200 }
        if (call.url === 'https://api.openai.com/v1/responses') {
          return {
            statusCode: 200,
            json: {
              output: [
                {
                  type: 'message',
                  content: [{ type: 'output_text', text: 'Resposta isolada' }],
                },
              ],
            },
          }
        }
        if (call.url === 'https://evolution.example.test/message/sendText/session-richard') return { statusCode: 201, json: { key: { id: 'ai-provider-id' } } }
        throw new Error('Chamada externa inesperada')
      },
    },
  })
  await handler({ record: current, next: () => { nextCount++ } })
  return { calls, queries, saves, nextCount }
}

for (const [description, fixture] of [
  ['contato associado à sessão de outro login', { contactInstance: 'leandro-instance' }],
  ['contato de outra organização', { contactOrganization: 'company-2' }],
  ['mensagem com autor incompatível com o dono da sessão', { messageUser: 'leandro' }],
]) {
  test(`IA rejeita ${description} antes de qualquer consulta externa ou gravação`, async () => {
    const result = await execute(fixture)

    assert.equal(result.calls.length, 0)
    assert.equal(result.queries.length, 0)
    assert.equal(result.saves.length, 0)
    assert.equal(result.nextCount, 1)
  })
}

test('IA usa somente o agente, histórico e instância do login que recebeu a mensagem', async () => {
  const result = await execute()
  const completion = result.calls.find(
    (call) => call.url === 'https://api.openai.com/v1/responses',
  )
  assert.ok(completion)
  assert.equal(completion.headers.Authorization, 'Bearer own-fixture-key')
  const request = JSON.parse(completion.body)
  assert.equal(request.model, 'gpt-6-luna')
  assert.equal(request.store, false)
  assert.equal(request.max_output_tokens, 500)
  assert.doesNotMatch(completion.body, /Histórico privado de outro login|Fonte de outro login/)
  assert.doesNotMatch(completion.body, /own-fixture-key|foreign-fixture-key/)
  assert.match(completion.body, /Pergunta de Richard/)
  const send = result.calls.find((call) => call.url.includes('/message/sendText/'))
  assert.equal(send.url, 'https://evolution.example.test/message/sendText/session-richard')
  assert.equal(result.calls.filter((call) => call.url.includes('/message/sendText/')).length, 1)
  const response = result.saves.find((row) => row.message_id === 'ai-provider-id')
  assert.equal(response.instance_id, 'richard-instance')
  assert.equal(response.organization_id, 'company-1')
  assert.equal(response.contact_id, 'richard-contact')
})
