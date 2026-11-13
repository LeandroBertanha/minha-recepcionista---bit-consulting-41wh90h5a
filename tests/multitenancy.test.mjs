import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(
  new URL('../pocketbase/hooks/on_message_create_ai.js', import.meta.url),
  'utf8',
)

test('respostas da IA mantêm o escopo da organização da mensagem recebida', async () => {
  assert.match(source, /const organizationId = msg\.getString\('organization_id'\)/)
  assert.match(
    source,
    /organization_id = \{:organizationId\} && instance_id = \{:instanceId\} && user_id = \{:userId\}/,
  )
  assert.equal(
    (source.match(/msgRecord\.set\('organization_id', organizationId\)/g) || []).length,
    1,
  )
  assert.doesNotMatch(source, /message_id', 'err_'/)
})
