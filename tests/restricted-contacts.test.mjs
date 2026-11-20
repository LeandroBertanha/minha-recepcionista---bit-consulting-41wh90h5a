import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')

const source = fs.readFileSync(path.join(root, 'src/lib/restricted-contacts.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  fileName: 'src/lib/restricted-contacts.ts',
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText
const restrictedContacts = {}
vm.runInNewContext(compiled, { exports: restrictedContacts })

test('normaliza números brasileiros com DDD e remove duplicados', () => {
  const result = restrictedContacts.parseRestrictedContacts(
    '(11) 99999-8888\n5511999998888; +55 (21) 98888-7777',
  )

  assert.deepEqual(Array.from(result.valid), ['5511999998888', '5521988887777'])
  assert.deepEqual(Array.from(result.invalid), [])
})

test('aceita inclusão em lote e preserva entradas inválidas para correção', () => {
  const result = restrictedContacts.parseRestrictedContacts(
    '5511999998888, número inválido\n5521988887777',
  )

  assert.deepEqual(Array.from(result.valid), ['5511999998888', '5521988887777'])
  assert.deepEqual(Array.from(result.invalid), ['número inválido'])
})

test('normalização da configuração descarta valores vazios ou fora do padrão', () => {
  assert.deepEqual(
    Array.from(
      restrictedContacts.normalizeRestrictedContacts([
        '11999998888',
        '5511999998888',
        '',
        '123',
      ]),
    ),
    ['5511999998888'],
  )
})
