import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')

const loadModule = (file, modules) => {
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const exports = {}
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (!(name in modules)) throw new Error(`Importação não simulada: ${name}`)
      return modules[name]
    },
  })
  return exports
}

const fixture = () => {
  const calls = []
  const pb = {
    authStore: { record: { id: 'richard' } },
    filter: (expression, parameters) => JSON.stringify({ expression, parameters }),
    collection: (name) => ({
      getFullList: async (options) => {
        calls.push({ collection: name, ...JSON.parse(options.filter), sort: options.sort })
        return []
      },
    }),
    send: async (url, options) => {
      calls.push({ url, ...options })
      return { instance: { id: 'instance-richard' }, created: true }
    },
  }
  const service = loadModule('src/services/whatsapp.ts', {
    '@/lib/pocketbase/client': { __esModule: true, default: pb },
  })
  return { pb, service, calls }
}

test('a listagem de sessões sempre exige o login, mesmo sem organização informada', async () => {
  const { service, calls, pb } = fixture()
  await service.getInstances('bit-consulting')
  assert.match(calls[0].expression, /user_id = \{:userId\}/)
  assert.equal(calls[0].parameters.userId, 'richard')
  assert.equal(calls[0].parameters.organizationId, 'bit-consulting')

  pb.authStore.record = { id: 'leandro' }
  await service.getInstances()
  assert.match(calls[1].expression, /user_id = \{:userId\}/)
  assert.equal(calls[1].parameters.userId, 'leandro')
})

test('sem usuário autenticado não é feita consulta ampla de WhatsApp', () => {
  const { service, calls, pb } = fixture()
  pb.authStore.record = null
  assert.throws(() => service.getInstances('bit-consulting'), /Entre na sua conta/)
  assert.throws(() => service.getContacts('instance-richard'), /Entre na sua conta/)
  assert.throws(() => service.getMessages('contact-richard', 'instance-richard'), /Entre na sua conta/)
  assert.equal(calls.length, 0)
})

test('contatos e mensagens ficam na instância própria sem filtrar pelo autor histórico', async () => {
  const { service, calls } = fixture()
  await service.getContacts('instance-richard', 'bit-consulting')
  await service.getMessages('contact-richard', 'instance-richard')
  for (const call of calls) {
    assert.match(call.expression, /instance_id = \{:instanceId\}/)
    assert.match(call.expression, /instance_id\.user_id = \{:userId\}/)
    assert.doesNotMatch(call.expression, /(?:^|&&\s*)user_id\s*=/)
    assert.equal(call.parameters.instanceId, 'instance-richard')
    assert.equal(call.parameters.userId, 'richard')
  }
  assert.equal(calls[1].parameters.contactId, 'contact-richard')
})

test('contato ou instância ausente não dispara consulta sem escopo', () => {
  const { service, calls } = fixture()
  assert.throws(() => service.getContacts(''), /Selecione a conexão/)
  assert.throws(() => service.getMessages('contact-richard', ''), /Selecione uma conversa/)
  assert.equal(calls.length, 0)
})

test('eventos da mesma empresa mas de outro WhatsApp são descartados', () => {
  const { service } = fixture()
  assert.equal(
    service.isRecordFromInstance(
      { instance_id: 'instance-leandro', organization_id: 'bit-consulting' },
      'instance-richard',
      'bit-consulting',
    ),
    false,
  )
  assert.equal(
    service.isRecordFromInstance(
      { instance_id: 'instance-richard', organization_id: 'outra-empresa' },
      'instance-richard',
      'bit-consulting',
    ),
    false,
  )
  assert.equal(
    service.isRecordFromInstance(
      { instance_id: 'instance-richard', organization_id: 'bit-consulting', user_id: 'autor-historico' },
      'instance-richard',
      'bit-consulting',
    ),
    true,
  )
})

test('preparação explícita envia somente a empresa, deixando o dono a cargo do backend', async () => {
  const { service, calls } = fixture()
  await service.ensureOwnInstance('bit-consulting')
  assert.equal(calls[0].url, '/backend/v1/instance/ensure')
  assert.equal(calls[0].method, 'POST')
  assert.equal(calls[0].body.organization_id, 'bit-consulting')
  assert.equal(calls[0].body.user_id, undefined)
})

const authFixture = () => {
  const calls = []
  const pb = {
    authStore: { record: null },
    collection: (collection) => ({
      create: async (data) => calls.push({ action: 'create', collection, data }),
      authWithPassword: async (email, password) => calls.push({ action: 'login', collection, email, password }),
    }),
  }
  const auth = loadModule('src/hooks/use-auth.tsx', {
    '@/lib/pocketbase/client': { __esModule: true, default: pb },
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useState: (value) => [value, () => {}],
      useEffect: () => {},
    },
    'react/jsx-runtime': { jsx: (_type, props) => props },
  })
  return { context: auth.AuthProvider({ children: null }).value, calls }
}

test('login aceita maiúsculas e espaços no e-mail sem transformar a senha', async () => {
  const { context, calls } = authFixture()
  const password = ' Senha-de-teste! '
  const result = await context.signIn('  Richard.Duarte.Silva@GMAIL.com  ', password)
  assert.equal(result.error, null)
  assert.equal(calls[0].email, 'richard.duarte.silva@gmail.com')
  assert.equal(calls[0].password, password)
})

test('cadastro e primeiro login usam a mesma identidade normalizada', async () => {
  const { context, calls } = authFixture()
  await context.signUp('  Richard.Duarte.Silva@GMAIL.com  ', 'Senha-de-teste!', 'Senha-de-teste!', 'Richard')
  assert.equal(calls[0].data.email, 'richard.duarte.silva@gmail.com')
  assert.equal(calls[1].email, calls[0].data.email)
  assert.equal(calls[0].data.passwordConfirm, 'Senha-de-teste!')
})
