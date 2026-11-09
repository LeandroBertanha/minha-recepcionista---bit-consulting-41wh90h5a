import type { Plan } from '../landing.config.ts'

export type Option = { value: string; label: string }

export type Question =
  | { id: keyof DiagnosticAnswers; kind: 'choice'; prompt: string; options: Option[] }
  | { id: keyof DiagnosticAnswers; kind: 'text'; prompt: string; placeholder: string }

export type DiagnosticAnswers = {
  segment: string
  companyName: string
  monthlyClients: string
  dailyMessages: string
  teamSize: string
  mainPain: string
  currentTool: string
  goal: string
}

export type Contact = { name: string; whatsapp: string; email: string }

export type Diagnosis = {
  currentSituation: string
  painPoints: string[]
  opportunities: string[]
  automatableProcesses: string[]
  recommendedFeatures: string[]
  recommendation: string
}

export const questions: Question[] = [
  {
    id: 'segment',
    kind: 'choice',
    prompt: 'Qual é o segmento da sua empresa?',
    options: [
      { value: 'clinica', label: 'Clínica ou consultório' },
      { value: 'loja', label: 'Loja ou e-commerce' },
      { value: 'restaurante', label: 'Restaurante' },
      { value: 'servicos', label: 'Prestação de serviços' },
      { value: 'imobiliaria', label: 'Imobiliária' },
      { value: 'outro', label: 'Outro segmento' },
    ],
  },
  { id: 'companyName', kind: 'text', prompt: 'Qual é o nome da empresa?', placeholder: 'Ex.: Clínica Bem Estar' },
  {
    id: 'monthlyClients',
    kind: 'choice',
    prompt: 'Quantos clientes você atende por mês?',
    options: [
      { value: 'ate100', label: 'Até 100' },
      { value: '100a500', label: 'De 100 a 500' },
      { value: '500a2000', label: 'De 500 a 2.000' },
      { value: 'mais2000', label: 'Mais de 2.000' },
    ],
  },
  {
    id: 'dailyMessages',
    kind: 'choice',
    prompt: 'Quantas mensagens chegam por dia no WhatsApp?',
    options: [
      { value: 'ate20', label: 'Até 20' },
      { value: '20a100', label: 'De 20 a 100' },
      { value: '100a300', label: 'De 100 a 300' },
      { value: 'mais300', label: 'Mais de 300' },
    ],
  },
  {
    id: 'teamSize',
    kind: 'choice',
    prompt: 'Quantas pessoas trabalham no atendimento?',
    options: [
      { value: '1', label: 'Só eu' },
      { value: '2a3', label: '2 a 3 pessoas' },
      { value: '4a10', label: '4 a 10 pessoas' },
      { value: 'mais10', label: 'Mais de 10' },
    ],
  },
  {
    id: 'mainPain',
    kind: 'choice',
    prompt: 'Qual é a maior dificuldade no atendimento hoje?',
    options: [
      { value: 'demora', label: 'Clientes esperando resposta' },
      { value: 'repetitivas', label: 'Perguntas repetitivas' },
      { value: 'foraHorario', label: 'Mensagens fora do horário' },
      { value: 'organizacao', label: 'Conversas desorganizadas' },
      { value: 'agendamentos', label: 'Agendamentos manuais' },
      { value: 'vendas', label: 'Vendas que se perdem' },
    ],
  },
  {
    id: 'currentTool',
    kind: 'choice',
    prompt: 'Você já usa alguma ferramenta de automação?',
    options: [
      { value: 'nenhuma', label: 'Não, respondo tudo manualmente' },
      { value: 'respostasRapidas', label: 'Só respostas rápidas do WhatsApp Business' },
      { value: 'chatbotMenu', label: 'Um chatbot de menu (digite 1, 2, 3)' },
      { value: 'outraPlataforma', label: 'Outra plataforma com IA' },
    ],
  },
  {
    id: 'goal',
    kind: 'choice',
    prompt: 'Qual é o seu principal objetivo?',
    options: [
      { value: 'vender', label: 'Vender mais' },
      { value: 'automatizar', label: 'Automatizar atendimentos' },
      { value: 'agendar', label: 'Realizar agendamentos' },
      { value: 'organizar', label: 'Organizar as conversas' },
    ],
  },
]

export function optionLabel(questionId: keyof DiagnosticAnswers, value: string): string {
  const question = questions.find((q) => q.id === questionId)
  if (!question || question.kind !== 'choice') return value
  return question.options.find((o) => o.value === value)?.label ?? value
}

const volumeScore: Record<string, number> = { ate20: 0, '20a100': 1, '100a300': 2, mais300: 3 }
const teamScore: Record<string, number> = { '1': 0, '2a3': 1, '4a10': 2, mais10: 3 }
const clientsScore: Record<string, number> = { ate100: 0, '100a500': 1, '500a2000': 2, mais2000: 3 }

/** 0 = operação pequena, 1 = média, 2 = alto volume. */
export function operationTier(answers: Pick<DiagnosticAnswers, 'dailyMessages' | 'teamSize' | 'monthlyClients'>): 0 | 1 | 2 {
  const score =
    (volumeScore[answers.dailyMessages] ?? 0) * 2 +
    (teamScore[answers.teamSize] ?? 0) +
    (clientsScore[answers.monthlyClients] ?? 0)
  if (score >= 8) return 2
  if (score >= 3) return 1
  return 0
}

export function recommendPlan(
  answers: Pick<DiagnosticAnswers, 'dailyMessages' | 'teamSize' | 'monthlyClients'>,
  availablePlans: Plan[],
): Plan | null {
  if (availablePlans.length === 0) return null
  const index = Math.min(operationTier(answers), availablePlans.length - 1)
  return availablePlans[index]
}

const painCopy: Record<string, { pain: string; process: string }> = {
  demora: {
    pain: 'Clientes aguardando resposta, o que aumenta o risco de desistência.',
    process: 'Primeira resposta imediata a toda mensagem recebida',
  },
  repetitivas: {
    pain: 'Equipe ocupada respondendo as mesmas perguntas várias vezes ao dia.',
    process: 'Respostas para dúvidas frequentes sobre preços, horários e serviços',
  },
  foraHorario: {
    pain: 'Mensagens recebidas fora do horário comercial ficam sem retorno.',
    process: 'Atendimento contínuo à noite, fins de semana e feriados',
  },
  organizacao: {
    pain: 'Conversas espalhadas, sem visão clara do que está pendente.',
    process: 'Centralização das conversas com status de cada contato',
  },
  agendamentos: {
    pain: 'Agendamentos combinados manualmente, mensagem por mensagem.',
    process: 'Consulta de horários disponíveis e confirmação do agendamento',
  },
  vendas: {
    pain: 'Interessados que não recebem as informações a tempo e não compram.',
    process: 'Apresentação de produtos e condução do interessado até a compra',
  },
}

const segmentProcess: Record<string, string> = {
  clinica: 'Informações sobre especialidades, convênios e preparo para consultas',
  loja: 'Dúvidas sobre produtos, disponibilidade, formas de pagamento e entrega',
  restaurante: 'Envio de cardápio, pedidos e reservas',
  servicos: 'Triagem de pedidos de orçamento e coleta de detalhes do serviço',
  imobiliaria: 'Qualificação de interessados por região, faixa de valor e tipo de imóvel',
  outro: 'Respostas sobre produtos, serviços e condições comerciais',
}

const goalCopy: Record<string, { feature: string; opportunity: string }> = {
  vender: {
    feature: 'Vendas automatizadas com apresentação de produtos',
    opportunity: 'Transformar mais conversas em vendas respondendo no momento do interesse.',
  },
  automatizar: {
    feature: 'Atendimento inteligente com respostas automáticas',
    opportunity: 'Liberar a equipe das perguntas repetitivas para casos que exigem atenção humana.',
  },
  agendar: {
    feature: 'Agendamentos pelo WhatsApp, organizados na página Agendamentos',
    opportunity: 'Reduzir a troca de mensagens até o agendamento ser combinado.',
  },
  organizar: {
    feature: 'Gestão de conversas centralizada',
    opportunity: 'Ter uma visão única de todos os atendimentos e do que precisa de retorno.',
  },
}

const volumeLabel: Record<string, string> = {
  ate20: 'até 20 mensagens por dia',
  '20a100': 'entre 20 e 100 mensagens por dia',
  '100a300': 'entre 100 e 300 mensagens por dia',
  mais300: 'mais de 300 mensagens por dia',
}

const teamLabel: Record<string, string> = {
  '1': 'uma pessoa',
  '2a3': '2 a 3 pessoas',
  '4a10': '4 a 10 pessoas',
  mais10: 'mais de 10 pessoas',
}

/** Diagnóstico determinístico, usado quando a análise por IA não estiver disponível. */
export function buildRuleDiagnosis(answers: DiagnosticAnswers): Diagnosis {
  const pain = painCopy[answers.mainPain] ?? painCopy.demora
  const goal = goalCopy[answers.goal] ?? goalCopy.automatizar
  const company = answers.companyName.trim() || 'Sua empresa'
  const tier = operationTier(answers)

  const painPoints = [pain.pain]
  if (tier >= 1 && answers.mainPain !== 'repetitivas') painPoints.push(painCopy.repetitivas.pain)
  if (answers.currentTool === 'nenhuma') painPoints.push('Todo o atendimento depende de alguém disponível para responder.')
  if (answers.currentTool === 'chatbotMenu')
    painPoints.push('Menus numerados limitam o cliente e não interpretam perguntas abertas.')

  const automatableProcesses = Array.from(
    new Set([
      pain.process,
      segmentProcess[answers.segment] ?? segmentProcess.outro,
      'Encaminhamento para um atendente quando o caso exigir',
    ]),
  )

  const recommendedFeatures = Array.from(
    new Set([goal.feature, 'Atendimento humano quando necessário', 'Gestão de conversas centralizada']),
  )

  return {
    currentSituation: `${company} recebe ${volumeLabel[answers.dailyMessages] ?? 'mensagens diariamente'} com ${
      teamLabel[answers.teamSize] ?? 'uma equipe'
    } no atendimento.`,
    painPoints,
    opportunities: [goal.opportunity, 'Responder clientes 24 horas por dia, inclusive fora do expediente.'],
    automatableProcesses,
    recommendedFeatures,
    recommendation: `Identificamos que ${company} pode automatizar boa parte das perguntas repetitivas, agilizar o primeiro atendimento e manter a equipe focada nos casos que precisam de uma pessoa.`,
  }
}

export function normalizeWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return digits
}

export function isValidWhatsapp(value: string): boolean {
  const digits = normalizeWhatsapp(value)
  return /^55\d{10,11}$/.test(digits)
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim())
}
