import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildRuleDiagnosis,
  isValidEmail,
  isValidWhatsapp,
  normalizeWhatsapp,
  operationTier,
  questions,
  recommendPlan,
} from '../src/landing/diagnostic/engine.ts'
import { plans } from '../src/landing/landing.config.ts'
import { captureLeadSource, track } from '../src/landing/analytics.ts'
import { faqs, pillars, scenarios } from '../src/landing/content.ts'

const baseAnswers = {
  segment: 'clinica',
  companyName: 'Clínica Bem Estar',
  monthlyClients: '100a500',
  dailyMessages: '20a100',
  teamSize: '2a3',
  mainPain: 'agendamentos',
  currentTool: 'nenhuma',
  goal: 'agendar',
}

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  }
}

test('o diagnóstico tem as 8 perguntas pedidas, na ordem', () => {
  assert.deepEqual(
    questions.map((q) => q.id),
    ['segment', 'companyName', 'monthlyClients', 'dailyMessages', 'teamSize', 'mainPain', 'currentTool', 'goal'],
  )
})

test('o porte da operação cresce com volume e equipe', () => {
  assert.equal(operationTier({ dailyMessages: 'ate20', teamSize: '1', monthlyClients: 'ate100' }), 0)
  assert.equal(operationTier(baseAnswers), 1)
  assert.equal(operationTier({ dailyMessages: 'mais300', teamSize: 'mais10', monthlyClients: 'mais2000' }), 2)
})

test('a recomendação funciona com planos sem preço e sem planos cadastrados', () => {
  assert.ok(plans.every((p) => p.monthlyPrice === null && p.annualPrice === null))
  assert.equal(recommendPlan({ dailyMessages: 'ate20', teamSize: '1', monthlyClients: 'ate100' }, plans).id, plans[0].id)
  assert.equal(recommendPlan({ dailyMessages: 'mais300', teamSize: 'mais10', monthlyClients: 'mais2000' }, plans.slice(0, 2)).id, plans[1].id)
  assert.equal(recommendPlan(baseAnswers, []), null)
})

test('o diagnóstico por regras usa as respostas e não promete números', () => {
  const diagnosis = buildRuleDiagnosis(baseAnswers)
  assert.match(diagnosis.currentSituation, /Clínica Bem Estar/)
  assert.match(diagnosis.currentSituation, /entre 20 e 100 mensagens por dia/)
  assert.ok(diagnosis.painPoints.some((p) => /Agendamentos combinados manualmente/.test(p)))
  assert.ok(diagnosis.recommendedFeatures.includes('Agendamentos pelo WhatsApp, organizados na página Agendamentos'))
  const text = JSON.stringify(diagnosis)
  assert.doesNotMatch(text, /\d+\s?%/)
  assert.doesNotMatch(text, /garantid/i)
})

test('o desfecho de cada cenário cabe em uma linha do celular', () => {
  for (const s of scenarios) assert.ok(s.outcome.length <= 24, `${s.id}: "${s.outcome}" (${s.outcome.length})`)
})

test('o cenário de suporte termina com a transferência para uma pessoa da equipe', () => {
  const support = scenarios.find((s) => s.id === 'suporte')
  assert.equal(support.messages.at(-1).from, 'human')
  assert.ok(support.messages.length <= 4, 'mensagens demais para caber na tela do celular')
})

test('agendamento é apresentado como agenda própria, sem "em breve"', () => {
  const copy = JSON.stringify([pillars, faqs, buildRuleDiagnosis(baseAnswers)])
  assert.doesNotMatch(copy, /em breve|em desenvolvimento|agendas externas/i)
  assert.match(copy, /página Agendamentos/)
})

test('validação de WhatsApp e e-mail', () => {
  assert.equal(normalizeWhatsapp('(11) 98888-7777'), '5511988887777')
  assert.ok(isValidWhatsapp('(11) 98888-7777'))
  assert.ok(isValidWhatsapp('11 3333-4444'))
  assert.ok(!isValidWhatsapp('9888-7777'))
  assert.ok(isValidEmail('nome@empresa.com'))
  assert.ok(!isValidEmail('nome@empresa'))
})

test('track vira no-op sem window e não quebra sem GA ou Pixel', () => {
  assert.doesNotThrow(() => track('cta_click', { cta_id: 'hero_primary' }))
})

test('a origem do lead guarda as UTMs da primeira visita', () => {
  const storage = memoryStorage()
  const first = captureLeadSource('?utm_source=instagram&utm_campaign=lancamento', 'https://instagram.com', '/', storage)
  assert.equal(first.utm_source, 'instagram')
  assert.equal(first.utm_campaign, 'lancamento')
  const second = captureLeadSource('?utm_source=google', '', '/', storage)
  assert.equal(second.utm_source, 'instagram')
})
