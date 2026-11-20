import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('tela de recepcionistas usa registros reais e formulário persistente', async () => {
  const app = await readProjectFile('src/App.tsx')

  assert.match(app, /getAiAgents\(\)/)
  assert.match(app, /getInstances\(organizationId\)/)
  assert.match(app, /instance\.id === agent\.instance_id/)
  assert.match(app, /<AgentFormSheet/)
  assert.match(app, /updateAiAgent\(agent\.id, \{ active \}\)/)
  assert.doesNotMatch(app, /receptionistCards/)
})

test('painel de recepcionistas mantém ações tipadas e atualiza a lista após exclusão', async () => {
  const [app, board, deleteDialog] = await Promise.all([
    readProjectFile('src/App.tsx'),
    readProjectFile('src/components/agents/AgentsBoard.tsx'),
    readProjectFile('src/components/agents/DeleteAgentDialog.tsx'),
  ])

  assert.match(app, /<AgentCard/)
  assert.match(app, /onDeleted=\{loadData\}/)
  assert.match(app, /togglingId === agent\.id/)
  assert.match(board, /agent: AiAgent/)
  assert.match(board, /instance\?: WhatsAppInstance/)
  assert.match(deleteDialog, /agent: AiAgent \| null/)
  assert.match(deleteDialog, /await onDeleted\(\)/)
  assert.match(deleteDialog, /disabled=\{deleting\}/)
  assert.doesNotMatch(deleteDialog, /agent: any/)
})

test('estado remoto conectado libera a recepcionista sem alterar a instância no banco', async () => {
  const service = await readProjectFile('src/services/whatsapp.ts')

  assert.match(service, /remoteState !== 'open'/)
  assert.match(service, /instance\.id === instanceId \? \{ \.\.\.instance, status: 'connected' \}/)
  assert.doesNotMatch(service, /collection<WhatsAppInstance>\('whatsapp_instances'\)\.update/)
})

test('consulta de instâncias não envia parâmetro de organização indefinido', async () => {
  const service = await readProjectFile('src/services/whatsapp.ts')

  assert.match(service, /organizationId\s*\?\s*pb\.filter/)
  assert.match(service, /pb\.filter\('user_id = \{:userId\}', \{ userId \}\)/)
  assert.doesNotMatch(service, /\{ userId, organizationId \},\s*\)\s*,/)
})

test('formulário nunca solicita nem envia chave de provedor pelo navegador', async () => {
  const form = await readProjectFile('src/components/agents/AgentFormSheet.tsx')

  assert.doesNotMatch(form, /api_key|Chave da API|type="password"/)
  assert.match(form, /credencial do provedor é gerenciada com segurança no servidor/)
  assert.match(form, /active: false/)
})

test('system prompt aceita e informa o limite de 7.000 caracteres', async () => {
  const form = await readProjectFile('src/components/agents/AgentFormSheet.tsx')

  assert.match(form, /SYSTEM_PROMPT_MAX_LENGTH = 7_000/)
  assert.match(form, /\.max\(\s*SYSTEM_PROMPT_MAX_LENGTH/)
  assert.match(form, /maxLength=\{SYSTEM_PROMPT_MAX_LENGTH\}/)
  assert.match(form, /field\.value\.length\.toLocaleString\('pt-BR'\)/)
})

test('simulador da recepcionista usa endpoint autenticado sem enviar WhatsApp nem gravar conversa', async () => {
  const [workspace, service, hook] = await Promise.all([
    readProjectFile('src/components/agents/AgentWorkspaceDialog.tsx'),
    readProjectFile('src/services/ai_agents.ts'),
    readProjectFile('pocketbase/hooks/on_message_create_ai.js'),
  ])
  const simulatorRoute = hook.slice(hook.indexOf("'/backend/v1/ai/simulate'"))

  assert.match(workspace, /simulateAiAgent\(agent\.id, customerMessage\)/)
  assert.match(workspace, /TabsTrigger value="simulator"/)
  assert.match(workspace, /Resposta da recepcionista/)
  assert.match(workspace, /role="alert"/)
  assert.match(workspace, /setSimulationError\(responseMessage/)
  assert.doesNotMatch(workspace, /Simulador na próxima etapa/)
  assert.match(service, /pb\.send<AiSimulationResult>\('\/backend\/v1\/ai\/simulate'/)
  assert.match(simulatorRoute, /\$apis\.requireAuth\(\)/)
  assert.match(simulatorRoute, /agent\.getString\('user_id'\) !== e\.auth\.id/)
  assert.match(simulatorRoute, /instance\.getString\('user_id'\) !== e\.auth\.id/)
  assert.match(simulatorRoute, /\$secrets\.get\('OPENAI_API_KEY'\)/)
  assert.match(simulatorRoute, /provider_invalid_key/)
  assert.match(simulatorRoute, /provider_quota_exceeded/)
  assert.match(simulatorRoute, /provider_configuration_error/)
  assert.match(simulatorRoute, /store: false/)
  assert.doesNotMatch(simulatorRoute, /saveNoValidate|message\/sendText/)
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
    assert.doesNotMatch(source, /chat\/completions|gpt-3\.5-turbo|gpt-4o-mini(?=['"])/)
    assert.doesNotMatch(source, /getString\('api_key'\)/)
  }

  assert.match(messageHook, /\$secrets\.get\('OPENAI_API_KEY'\)/)
  assert.match(crmHook, /\$secrets\.get\('OPENAI_API_KEY'\)/)
  assert.doesNotMatch(messageHook, /JSON\.stringify\(completionRes\.json/)
  assert.doesNotMatch(messageHook, /'url',\s*requestUrl/)
  assert.doesNotMatch(messageHook, /Falha na resposta da IA/)
  assert.doesNotMatch(crmHook, /e\.toString\(\)/)
})


