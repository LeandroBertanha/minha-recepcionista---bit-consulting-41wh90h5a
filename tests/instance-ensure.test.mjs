import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../pocketbase/hooks/instance_ensure.js', import.meta.url), 'utf8')

function record(values) {
  return {
    id: values.id,
    values,
    getString: (field) => String(values[field] ?? ''),
    set: (field, value) => { values[field] = value },
    toJSON: () => ({ ...values }),
  }
}

function matches(row, filter, params) {
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*\{:(\w+)\}/g)) {
    if (row.getString(match[1]) !== String(params[match[2]] ?? '')) return false
  }
  for (const match of filter.matchAll(/\b([a-z_]+)\s*=\s*["']([^"']*)["']/g)) {
    if (row.getString(match[1]) !== match[2]) return false
  }
  return true
}

function harness({ ownInstance = false, role = 'admin', memberStatus = 'active', orgStatus = 'active', concurrentSave = false } = {}) {
  const foreign = record({ id: 'leandro-instance', user_id: 'leandro', organization_id: 'company-1', instance_name: 'user_leandro', status: 'connected' })
  const records = [foreign]
  if (ownInstance) records.push(record({ id: 'richard-existing', user_id: 'richard', organization_id: 'company-1', instance_name: 'richard-existing-name', status: 'pending' }))
  // Há outro membro ativo antes de Richard, para a consulta não poder escolher qualquer membro da empresa.
  const memberships = [
    record({ user_id: 'leandro', organization_id: 'company-1', status: 'active', role: 'owner' }),
    record({ user_id: 'richard', organization_id: 'company-1', status: memberStatus, role }),
  ]
  const saves = []
  let route
  let competingSaveInserted = false
  vm.runInNewContext(source, {
    routerAdd(method, path, handler) {
      assert.equal(method, 'POST')
      assert.equal(path, '/backend/v1/instance/ensure')
      route = handler
    },
    Record: class { constructor() { return record({ id: 'richard-created' }) } },
    $apis: { requireAuth: () => Symbol('auth') },
    $app: {
      findFirstRecordByFilter(collection, filter, params) {
        const candidates = collection === 'organization_members' ? memberships : records
        assert.ok(['organization_members', 'whatsapp_instances'].includes(collection))
        const found = candidates.find((row) => matches(row, filter, params))
        if (!found) throw new Error('Record not found')
        return found
      },
      findRecordById(collection, id) {
        assert.equal(collection, 'organizations')
        if (id !== 'company-1') throw new Error('Organization not found')
        return record({ id, status: orgStatus, owner_id: 'leandro' })
      },
      findCollectionByNameOrId: (name) => ({ name }),
      save(row) {
        saves.push({ ...row.values })
        if (concurrentSave && !competingSaveInserted) {
          competingSaveInserted = true
          records.push(record({ ...row.values, id: 'richard-concurrent' }))
          throw new Error('UNIQUE constraint failed: whatsapp_instances.organization_id, whatsapp_instances.user_id')
        }
        records.push(row)
      },
      logger: () => ({ error() {} }),
    },
    $http: { send() { assert.fail('O endpoint não deve chamar a Evolution diretamente') } },
  })
  const invoke = (body = {}) => route({
    auth: { id: 'richard' },
    requestInfo: () => ({ body }),
    json: (status, data) => ({ status, body: JSON.parse(JSON.stringify(data)) }),
    forbiddenError: (message) => ({ status: 403, body: { message } }),
  })
  return { invoke, records, saves, foreign }
}

test('preparar WhatsApp cria uma sessão pendente própria sem reutilizar a sessão conectada da empresa', () => {
  const h = harness()
  const response = h.invoke({ organization_id: 'company-1' })

  assert.equal(response.status, 201)
  assert.equal(response.body.created, true)
  assert.equal(response.body.instance.user_id, 'richard')
  assert.equal(response.body.instance.organization_id, 'company-1')
  assert.equal(response.body.instance.status, 'pending')
  assert.equal(response.body.instance.qrcode, '')
  assert.notEqual(response.body.instance.instance_name, h.foreign.getString('instance_name'))
  assert.equal(h.saves.length, 1)
  assert.equal(h.foreign.getString('status'), 'connected')
})

test('preparação repetida é idempotente e mantém o nome da instância legada do próprio login', () => {
  const h = harness({ ownInstance: true })
  const first = h.invoke()
  const second = h.invoke()

  assert.equal(first.status, 200)
  assert.equal(second.status, 200)
  assert.equal(first.body.created, false)
  assert.equal(second.body.instance.id, 'richard-existing')
  assert.equal(first.body.instance.instance_name, 'richard-existing-name')
  assert.equal(h.saves.length, 0)
  assert.equal(h.records.length, 2)
})

test('não aceita user_id ou instance_id do corpo para preparar sessão em nome de outro usuário', () => {
  const h = harness()
  const response = h.invoke({ organization_id: 'company-1', user_id: 'leandro', instance_id: 'leandro-instance' })

  assert.equal(response.status, 201)
  assert.equal(response.body.instance.user_id, 'richard')
  assert.notEqual(response.body.instance.id, 'leandro-instance')
  assert.equal(h.foreign.getString('status'), 'connected')
})

for (const role of ['agent', 'supervisor', 'viewer']) {
  test(`perfil ${role} não provisiona sessão administrativa`, () => {
    const h = harness({ role })
    const response = h.invoke()

    assert.equal(response.status, 403)
    assert.equal(h.saves.length, 0)
    assert.equal(h.records.length, 1)
  })
}

test('associação inativa não herda os direitos do proprietário ativo da mesma organização', () => {
  const h = harness({ memberStatus: 'inactive' })
  const response = h.invoke({ organization_id: 'company-1' })

  assert.equal(response.status, 403)
  assert.equal(h.saves.length, 0)
})

test('empresa não vinculada e organização inativa são rejeitadas antes de criar registros', () => {
  const wrongOrg = harness()
  assert.equal(wrongOrg.invoke({ organization_id: 'company-2' }).status, 403)
  assert.equal(wrongOrg.saves.length, 0)

  const inactiveOrg = harness({ orgStatus: 'inactive' })
  assert.equal(inactiveOrg.invoke({ organization_id: 'company-1' }).status, 403)
  assert.equal(inactiveOrg.saves.length, 0)
})

test('colisão com preparação concorrente retorna a sessão própria vencedora sem criar outra', () => {
  const h = harness({ concurrentSave: true })
  const response = h.invoke({ organization_id: 'company-1' })

  assert.equal(response.status, 200)
  assert.equal(response.body.created, false)
  assert.equal(response.body.instance.id, 'richard-concurrent')
  assert.equal(response.body.instance.user_id, 'richard')
  assert.equal(h.records.filter((row) => row.getString('user_id') === 'richard').length, 1)
  assert.equal(h.foreign.getString('status'), 'connected')
})
