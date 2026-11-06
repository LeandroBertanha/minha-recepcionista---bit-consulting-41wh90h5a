import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('o webhook exige o segredo configurado no servidor', async () => {
  const source = await read('pocketbase/hooks/webhook_evolution.js')

  assert.match(source, /EVOLUTION_WEBHOOK_SECRET/)
  assert.match(source, /X-Bitzaap-Webhook-Secret/)
  assert.match(source, /return e\.json\(401/)
  assert.match(source, /return e\.json\(503/)
})

test('a Evolution API recebe o segredo no cadastro do webhook', async () => {
  const source = await read('pocketbase/hooks/instance_create.js')

  assert.match(source, /EVOLUTION_WEBHOOK_SECRET/)
  assert.match(source, /headers:[\s\S]*X-Bitzaap-Webhook-Secret/)
  assert.match(source, /webhookByEvents: false/)
  assert.match(source, /webhookBase64: false/)
})

test('mensagens não são persistidas como enviadas sem configuração', async () => {
  const source = await read('pocketbase/hooks/message_send.js')
  const validationIndex = source.indexOf('Evolution API configuration missing')
  const persistenceIndex = source.indexOf("findCollectionByNameOrId('whatsapp_messages')")

  assert.ok(validationIndex >= 0)
  assert.ok(persistenceIndex > validationIndex)
})

test('as regras de tenant vinculam criação e alteração ao usuário autenticado', async () => {
  const source = await read('pocketbase/migrations/0012_harden_tenant_rules.js')

  assert.match(source, /collection\.createRule = .*user_id = @request\.auth\.id/)
  assert.match(source, /collection\.updateRule = .*user_id = @request\.auth\.id/)
})

test('o endpoint de diagnóstico não retorna valores dos segredos', async () => {
  const source = await read('pocketbase/hooks/integration_status.js')

  assert.match(source, /\/backend\/v1\/integration\/status/)
  assert.match(source, /urlConfigured/)
  assert.match(source, /secretConfigured/)
  assert.doesNotMatch(source, /e\.json\([^]*EVOLUTION_API_KEY/)
})
