import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const readProjectFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('criação reúne WhatsApp exclusivo e modelos de prompt', async () => {
  const [form, templates, service] = await Promise.all([
    readProjectFile('src/components/agents/AgentFormSheet.tsx'),
    readProjectFile('src/data/receptionist-prompt-templates.ts'),
    readProjectFile('src/services/whatsapp.ts'),
  ])

  assert.match(form, /name="instance_id"/)
  assert.match(form, /prepareDedicatedInstance\(organizationId\)/)
  assert.match(form, /QR Code para conectar o WhatsApp/)
  assert.match(form, /Cada recepcionista utiliza uma conexão exclusiva/)
  assert.match(service, /body: \{ organization_id: organizationId, dedicated: true \}/)

  for (const label of [
    'Clínica de Estética',
    'Clínicas Médicas',
    'Provedores de Internet',
    'Clínica de Odonto',
    'Loja de Carros',
    'Imobiliárias',
    'Escritório de Advocacia',
    'Escritório de Arquitetura',
    'Loja de iPhone',
    'E-commerce',
  ]) {
    assert.match(templates, new RegExp(label))
  }
})

test('conversas e simulador pertencem ao espaço da recepcionista', async () => {
  const [app, board, workspace, inbox] = await Promise.all([
    readProjectFile('src/App.tsx'),
    readProjectFile('src/components/agents/AgentsBoard.tsx'),
    readProjectFile('src/components/agents/AgentWorkspaceDialog.tsx'),
    readProjectFile('src/pages/Inbox.tsx'),
  ])

  assert.match(board, /Abrir recepcionista/)
  assert.match(app, /instance\.id === agent\.instance_id/)
  assert.match(app, /<AgentWorkspaceDialog/)
  assert.doesNotMatch(app, /Simulador antes da publicação/)
  assert.match(workspace, /TabsTrigger value="conversations"/)
  assert.match(workspace, /TabsTrigger value="simulator"/)
  assert.match(workspace, /TabsTrigger value="whatsapp"/)
  assert.match(workspace, /instanceIdOverride=\{agent\.instance_id\}/)
  assert.match(workspace, /logoutInstance\(agent\.instance_id\)/)
  assert.match(workspace, /Desconectar WhatsApp/)
  assert.match(workspace, /Conectar novamente/)
  assert.match(workspace, /será necessário escanear um novo QR Code/)
  assert.match(inbox, /instanceIdOverride\?: string/)
})

test('migration permite várias conexões do usuário e impede compartilhamento entre recepcionistas', async () => {
  const migration = await readProjectFile(
    'pocketbase/migrations/0018_receptionist_dedicated_whatsapp.js',
  )
  const ensure = await readProjectFile('pocketbase/hooks/instance_ensure.js')

  assert.match(
    migration,
    /CREATE INDEX idx_whatsapp_instances_org_user ON whatsapp_instances \(organization_id, user_id\)/,
  )
  assert.doesNotMatch(
    migration,
    /CREATE UNIQUE INDEX idx_whatsapp_instances_org_user ON whatsapp_instances/,
  )
  assert.match(
    migration,
    /CREATE UNIQUE INDEX idx_ai_agents_instance_unique ON ai_agents \(instance_id\)/,
  )
  assert.match(ensure, /const dedicated = body\.dedicated === true/)
  assert.match(ensure, /\$security\.randomString\(8\)/)
})
