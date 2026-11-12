import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const realtimeSource = await readFile(
  new URL('../src/hooks/use-realtime.ts', import.meta.url),
  'utf8',
)
const monitorSource = await readFile(
  new URL('../pocketbase/hooks/connection_monitor.js', import.meta.url),
  'utf8',
)

test('limpeza realtime usa uma janela curta para evitar clientId obsoleto em troca de rota', () => {
  assert.match(realtimeSource, /REALTIME_CLEANUP_GRACE_MS\s*=\s*250/)
  assert.match(realtimeSource, /window\.setTimeout/)
  assert.equal((realtimeSource.match(/releaseSubscription\(/g) || []).length, 2)
  assert.doesNotMatch(realtimeSource, /unsubscribeFn\(\)\.catch/)
})

test('monitor identifica conexões antigas sem expor número, mensagem ou segredo', () => {
  let cron
  const warnings = []
  const rows = [
    { id: 'instance-a', getString: () => 'disconnected' },
    { id: 'instance-b', getString: () => 'connecting' },
  ]

  vm.runInNewContext(monitorSource, {
    cronAdd: (name, schedule, handler) => {
      cron = { name, schedule, handler }
    },
    console: { warn: (message) => warnings.push(message) },
    $app: {
      findRecordsByFilter(collection, filter, sort, limit, offset, params) {
        assert.equal(collection, 'whatsapp_instances')
        assert.match(filter, /status != "connected"/)
        assert.match(filter, /updated <= \{:staleBefore\}/)
        assert.equal(sort, '-updated')
        assert.equal(limit, 100)
        assert.equal(offset, 0)
        assert.ok(params.staleBefore)
        return rows
      },
    },
  })

  assert.equal(cron.name, 'whatsapp_connection_health')
  assert.equal(cron.schedule, '*/15 * * * *')
  cron.handler()
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /stale=2/)
  assert.match(warnings[0], /connecting=1/)
  assert.match(warnings[0], /disconnected=1/)
  assert.match(warnings[0], /sampleIds=instance-a,instance-b/)
  assert.doesNotMatch(warnings[0], /remote_jid|message|secret|api[_-]?key/i)
})
