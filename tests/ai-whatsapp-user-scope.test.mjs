import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../pocketbase/hooks/on_message_create_ai.js', import.meta.url), 'utf8')

function record(values) {
  return {
    id: values.id,
    values,
    get: (field) => values[field],
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

async function execute({
  contactInstance = 'richard-instance',
  contactOrganization = 'company-1',
  messageUser = 'richard',
  messageBody = 'Pergunta de Richard',
  agentConfiguration = {},
  agentProvider = 'openai',
  openAiKey = 'server-fixture-key',
  grokKey = 'grok-server-fixture-key',
} = {}) {
  const current = record({
    id: 'incoming-richard', direction: 'in', user_id: messageUser,
    organization_id: 'company-1', instance_id: 'richard-instance',
    contact_id: 'richard-contact', body: messageBody,
  })
  const contact = record({ id: 'richard-contact', user_id: 'richard', organization_id: contactOrganization, instance_id: contactInstance, remote_jid: '5511999999999@s.whatsapp.net', agent_paused: false })
  const session = record({ id: 'richard-instance', user_id: 'richard', organization_id: 'company-1', instance_name: 'session-richard' })
  // Um agente associado indevidamente à mesma sessão e uma mensagem histórica
  // da sessão de Leandro aparecem antes dos registros legítimos de propósito.
  const agents = [
    record({ id: 'foreign-agent', organization_id: 'company-1', instance_id: session.id, user_id: 'leandro', active: true, provider: 'openai', api_key: 'foreign-fixture-key', system_prompt: 'Fonte de outro login' }),
    record({ id: 'own-agent', organization_id: 'company-1', instance_id: session.id, user_id: 'richard', active: true, provider: agentProvider, api_key: 'own-fixture-key', system_prompt: 'Atenda Richard', configuration: agentConfiguration }),
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
    routerAdd() {},
    $apis: { requireAuth: () => 'auth-middleware' },
    Record: class { constructor() { return record({ id: 'new-ai-message' }) } },
    $security: { randomString: () => 'fixture-id' },
    $secrets: {
      get: (name) =>
        ({
          EVOLUTION_API_URL: 'https://evolution.example.test',
          EVOLUTION_API_KEY: 'evolution-fixture-key',
          EVOLUTION_API_ORIGIN: 'https://airecepcionista.com.br',
          OPENAI_API_KEY: openAiKey,
          OPENAI_MODEL: 'gpt-6-luna',
          GROK_API_KEY: grokKey,
          GROK_MODEL: 'grok-4.7',
        })[name],
    },
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
      logger: () => ({ error() {}, info() {} }),
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
        if (call.url === 'https://api.x.ai/v1/responses') {
          return {
            statusCode: 200,
            json: {
              output: [
                {
                  type: 'message',
                  content: [{ type: 'output_text', text: 'Resposta Grok isolada' }],
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
  assert.equal(completion.headers.Authorization, 'Bearer server-fixture-key')
  const request = JSON.parse(completion.body)
  assert.equal(request.model, 'gpt-6-luna')
  assert.equal(request.store, false)
  assert.equal(request.max_output_tokens, 500)
  assert.doesNotMatch(completion.body, /Histórico privado de outro login|Fonte de outro login/)
  assert.doesNotMatch(completion.body, /own-fixture-key|foreign-fixture-key/)
  assert.match(completion.body, /Pergunta de Richard/)
  const send = result.calls.find((call) => call.url.includes('/message/sendText/'))
  assert.equal(send.url, 'https://evolution.example.test/message/sendText/session-richard')
  assert.equal(send.headers.Origin, 'https://airecepcionista.com.br')
  assert.equal(result.calls.filter((call) => call.url.includes('/message/sendText/')).length, 1)
  const response = result.saves.find((row) => row.message_id === 'ai-provider-id')
  assert.equal(response.instance_id, 'richard-instance')
  assert.equal(response.organization_id, 'company-1')
  assert.equal(response.contact_id, 'richard-contact')
})

test('IA não chama o provedor quando o segredo OpenAI não está configurado', async () => {
  const result = await execute({ openAiKey: '' })

  assert.equal(
    result.calls.filter((call) => call.url === 'https://api.openai.com/v1/responses').length,
    0,
  )
  assert.equal(result.calls.filter((call) => call.url.includes('/message/sendText/')).length, 0)
  assert.equal(result.saves.length, 0)
  assert.equal(result.nextCount, 1)
})

test('IA usa Grok com segredo exclusivo do servidor e Responses API', async () => {
  const result = await execute({ agentProvider: 'grok' })
  const completion = result.calls.find((call) => call.url === 'https://api.x.ai/v1/responses')

  assert.ok(completion)
  assert.equal(completion.headers.Authorization, 'Bearer grok-server-fixture-key')
  const request = JSON.parse(completion.body)
  assert.equal(request.model, 'grok-4.7')
  assert.equal(request.store, false)
  assert.doesNotMatch(completion.body, /grok-server-fixture-key|own-fixture-key/)
  assert.equal(
    result.calls.filter((call) => call.url === 'https://api.openai.com/v1/responses').length,
    0,
  )
  assert.ok(result.saves.some((row) => row.body === 'Resposta Grok isolada'))
})

test('transferência humana pausa a conversa e avisa a equipe sem chamar o provedor de IA', async () => {
  const result = await execute({
    messageBody: 'Quero falar com um atendente humano',
    openAiKey: '',
    agentConfiguration: {
      handoff: {
        intervention_number: '55 (11) 98888-7777',
        keywords: ['atendente humano'],
      },
    },
  })

  assert.equal(
    result.calls.filter((call) => call.url === 'https://api.openai.com/v1/responses').length,
    0,
  )
  const notifications = result.calls.filter(
    (call) => call.url === 'https://evolution.example.test/message/sendText/session-richard',
  )
  assert.equal(notifications.length, 1)
  assert.deepEqual(JSON.parse(notifications[0].body), {
    number: '5511988887777',
    text: 'A recepcionista pausou uma conversa que precisa de atendimento humano. Acesse a plataforma AI Recepcionista para assumir.',
    delay: 0,
  })
  assert.ok(result.saves.some((row) => row.agent_paused === true && row.status === 'waiting'))
  assert.equal(result.nextCount, 1)
})

