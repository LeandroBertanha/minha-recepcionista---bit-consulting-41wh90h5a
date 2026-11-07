import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import vm from 'node:vm'

const source = await readFile(new URL('../pocketbase/hooks/instance_qr.js', import.meta.url), 'utf8')
const instanceName = 'org_company-1_user_owner-1'

function record(values) {
  return {
    id: values.id,
    values,
    getString: (field) => String(values[field] ?? ''),
    set: (field, value) => { values[field] = value },
  }
}

function execute({
  userId = 'owner-1',
  instanceOwner = 'owner-1',
  membershipRole = 'owner',
  membershipActive = true,
  organizationStatus = 'active',
  storedStatus = 'pending',
  responses = {},
} = {}) {
  const values = {
    id: 'instance-1',
    organization_id: 'company-1',
    user_id: instanceOwner,
    instance_name: instanceName,
    status: storedStatus,
    qrcode: '',
  }
  const instance = record(values)
  const calls = []
  const saves = []
  let route
  vm.runInNewContext(source, {
    routerAdd(_method, _path, handler) { route = handler },
    $apis: { requireAuth: () => Symbol('auth') },
    $secrets: {
      get: (name) => ({
        EVOLUTION_API_URL: 'https://evolution.example.test',
        EVOLUTION_API_KEY: 'test-api-key',
        APP_WEBHOOK_URL: 'https://app.example.test',
        EVOLUTION_WEBHOOK_SECRET: 'test-webhook-secret',
      })[name],
    },
    $app: {
      findRecordById(collection, id) {
        if (collection === 'whatsapp_instances' && id === values.id) return instance
        if (collection === 'organizations' && id === values.organization_id) {
          return record({ id, owner_id: 'owner-1', status: organizationStatus })
        }
        throw new Error('Record not found')
      },
      findFirstRecordByFilter(collection, filter, params) {
        assert.equal(collection, 'organization_members')
        assert.match(filter, /status\s*=\s*"active"/)
        assert.equal(params.organizationId, values.organization_id)
        assert.equal(params.userId, userId)
        if (membershipRole && membershipActive) {
          return record({ role: membershipRole, status: 'active', user_id: userId, organization_id: 'company-1' })
        }
        throw new Error('Membership not found')
      },
      saveNoValidate(row) { saves.push(row.id) },
      logger: () => ({ error() {} }),
    },
    $http: {
      send(request) {
        calls.push(JSON.parse(JSON.stringify(request)))
        return responses[request.url] || { statusCode: 200, json: {} }
      },
    },
  })
  let response
  try {
    response = route({
      auth: { id: userId },
      request: { pathValue: () => values.id },
      json: (status, body) => ({ status, body }),
      notFoundError: (message) => ({ status: 404, body: { message } }),
      forbiddenError: (message) => ({ status: 403, body: { message } }),
    })
  } catch (error) {
    response = { status: error.status, body: { message: error.message } }
  }
  return { response, calls, saves, values }
}

test('administrador da mesma empresa não pode obter nem renovar o QR de outro login', () => {
  const result = execute({ userId: 'admin-1', membershipRole: 'admin', instanceOwner: 'owner-1' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
  assert.equal(result.values.status, 'pending')
})

test('proprietário da empresa não pode operar a sessão pessoal de outro administrador', () => {
  const result = execute({ userId: 'owner-1', instanceOwner: 'admin-1' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
})

test('proprietário sem associação ativa não obtém QR mesmo sendo dono da instância', () => {
  const result = execute({ membershipActive: false })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
})

test('organização inativa bloqueia QR antes de alterar ou conectar qualquer aparelho', () => {
  const result = execute({ organizationStatus: 'inactive' })

  assert.equal(result.response.status, 403)
  assert.equal(result.calls.length, 0)
  assert.equal(result.saves.length, 0)
})

test('o dono da sessão conectada ainda recebe o próprio QR sem chamadas que alterem o pareamento', () => {
  const result = execute({
    storedStatus: 'connected',
    responses: {
      'https://evolution.example.test/instance/connectionState/org_company-1_user_owner-1': {
        statusCode: 200,
        json: { instance: { state: 'open' } },
      },
      'https://evolution.example.test/webhook/set/org_company-1_user_owner-1': {
        statusCode: 200,
        json: {},
      },
    },
  })

  assert.equal(result.response.status, 200)
  assert.equal(result.calls.some((call) => call.url.includes('/instance/connect/')), false)
})
