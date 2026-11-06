import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8')

test('a infraestrutura não publica PostgreSQL, Redis ou a porta interna da Evolution', async () => {
  const compose = await read('infra/evolution/compose.yaml')

  assert.doesNotMatch(compose, /5432:5432/)
  assert.doesNotMatch(compose, /6379:6379/)
  assert.doesNotMatch(compose, /8080:8080/)
  assert.match(compose, /- ['"]80:80['"]/)
  assert.match(compose, /- ['"]443:443['"]/)
})

test('a infraestrutura protege dados e credenciais com volumes e variáveis', async () => {
  const compose = await read('infra/evolution/compose.yaml')

  assert.match(compose, /postgres_data:\/var\/lib\/postgresql\/data/)
  assert.match(compose, /redis_data:\/data/)
  assert.match(compose, /REDIS_PASSWORD: \$\{REDIS_PASSWORD\}/)
  assert.match(compose, /evolution_instances:\/evolution\/instances/)
  assert.match(compose, /AUTHENTICATION_API_KEY: \$\{EVOLUTION_API_KEY\}/)
  assert.match(compose, /AUTHENTICATION_EXPOSE_IN_FETCH_INSTANCES: ['"]false['"]/)
})

test('o proxy exige domínio e aplica HTTPS com cabeçalhos mínimos', async () => {
  const caddy = await read('infra/evolution/Caddyfile')

  assert.match(caddy, /\{\$EVOLUTION_DOMAIN\}/)
  assert.match(caddy, /Strict-Transport-Security/)
  assert.match(caddy, /X-Content-Type-Options/)
  assert.match(caddy, /reverse_proxy evolution:8080/)
})

test('o exemplo de ambiente contém apenas placeholders', async () => {
  const env = await read('infra/evolution/.env.example')

  assert.match(env, /EVOLUTION_API_KEY=substitua_por_/)
  assert.match(env, /POSTGRES_PASSWORD=substitua_por_/)
  assert.match(env, /REDIS_PASSWORD=substitua_por_/)
  assert.match(env, /NGROK_AUTHTOKEN=substitua_pelo_/)
  assert.doesNotMatch(env, /@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/)
})

test('o modo local publica somente portas de loopback e usa HTTPS no ngrok', async () => {
  const compose = await read('infra/evolution/compose.local.yaml')

  assert.match(compose, /127\.0\.0\.1:8080:8080/)
  assert.match(compose, /127\.0\.0\.1:4040:4040/)
  assert.match(compose, /https:\/\/\$\{NGROK_DOMAIN\}/)
  assert.match(compose, /NGROK_AUTHTOKEN: \$\{NGROK_AUTHTOKEN\}/)
  assert.doesNotMatch(compose, /['"]0\.0\.0\.0:/)
})
