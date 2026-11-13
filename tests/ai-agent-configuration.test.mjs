import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('tela de recepcionistas usa registros reais e formulário persistente', async () => {
  const app = await readProjectFile('src/App.tsx')

  assert.match(app, /getAiAgents\(\)/)
  assert.match(app, /<AgentFormSheet/)
  assert.match(app, /updateAiAgent\(agent\.id, \{ active \}\)/)
  assert.doesNotMatch(app, /receptionistCards/)
})

test('edição nunca reutiliza nem envia a chave já armazenada', async () => {
  const form = await readProjectFile('src/components/agents/AgentFormSheet.tsx')

  assert.doesNotMatch(form, /agent\.api_key/)
  assert.match(form, /api_key: ''/)
  assert.match(form, /if \(apiKey\) data\.api_key = apiKey/)
  assert.match(form, /active: false/)
})

test('migração oculta a chave da API sem alterar registros', async () => {
  const migration = await readProjectFile('pocketbase/migrations/0017_protect_ai_agent_credentials.js')
  const states = []
  const apiKeyField = { hidden: false }
  let up
  let down

  vm.runInNewContext(migration, {
    migrate(upFn, downFn) {
      up = upFn
      down = downFn
    },
  })

  const app = {
    findCollectionByNameOrId(name) {
      assert.equal(name, 'ai_agents')
      return { fields: { getByName: () => apiKeyField } }
    },
    save() {
      states.push(apiKeyField.hidden)
    },
  }

  up(app)
  down(app)

  assert.deepEqual(states, [true, false])
  assert.doesNotMatch(migration, /delete|truncate|findRecords|new Record/i)
})

test('hooks OpenAI usam Responses API sem registrar corpo ou URL sensível', async () => {
  const [messageHook, crmHook] = await Promise.all([
    readProjectFile('pocketbase/hooks/on_message_create_ai.js'),
    readProjectFile('pocketbase/hooks/crm_cron.js'),
  ])

  for (const source of [messageHook, crmHook]) {
    assert.match(source, /https:\/\/api\.openai\.com\/v1\/responses/)
    assert.match(source, /gpt-6-luna/)
    assert.match(source, /store: false/)
    assert.doesNotMatch(source, /chat\/completions|gpt-3\.5-turbo|gpt-4o-mini/)
  }

  assert.doesNotMatch(messageHook, /JSON\.stringify\(completionRes\.json/)
  assert.doesNotMatch(messageHook, /'url',\s*requestUrl/)
  assert.doesNotMatch(messageHook, /⚠️ Falha na resposta da IA/)
  assert.doesNotMatch(crmHook, /e\.toString\(\)/)
})
