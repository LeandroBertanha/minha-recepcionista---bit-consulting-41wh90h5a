export type Plan = {
  id: string
  name: string
  description: string
  monthlyPrice: number | null
  annualPrice: number | null
  usageLimits: string[]
  features: string[]
  whatsappConnections: number | null
  aiFeatures: string[]
  recommended: boolean
  /** URL de contratação; quando nulo, o botão abre o diagnóstico com o plano pré-selecionado. */
  checkoutUrl: string | null
}

export type Testimonial = { name: string; role: string; company: string; quote: string }
export type ResultMetric = { label: string; value: string; context: string }

export const landingConfig = {
  productName: 'Minha Recepcionista',
  companyName: 'Bit Consulting',
  partners: 'Bit Consulting e AI.R Innovation',
  siteUrl: 'https://minharecepcionista.com.br',
  /** Rota do app (login e painel). */
  appUrl: '/app',
  /** Cadastro hoje é por convite; quando houver cadastro aberto, aponte para a rota pública. */
  signupUrl: null as string | null,
  trialAvailable: false,
  /** Número comercial no formato 55DDDNUMERO. Quando nulo, demonstração é registrada como lead. */
  salesWhatsapp: null as string | null,
  contactEmail: null as string | null,
  supportEmail: null as string | null,
  social: [] as { label: string; url: string }[],
}

/** Preencha preços e limites quando a oferta comercial estiver definida. Campos nulos não são exibidos. */
export const plans: Plan[] = [
  {
    id: 'inicial',
    name: 'Inicial',
    description: 'Para quem quer começar a automatizar o atendimento.',
    monthlyPrice: null,
    annualPrice: null,
    usageLimits: [],
    features: ['Respostas automáticas com IA', 'Caixa de conversas centralizada', 'Atendimento humano quando necessário'],
    whatsappConnections: null,
    aiFeatures: [],
    recommended: false,
    checkoutUrl: null,
  },
  {
    id: 'crescimento',
    name: 'Crescimento',
    description: 'Para empresas com volume diário de conversas e equipe de atendimento.',
    monthlyPrice: null,
    annualPrice: null,
    usageLimits: [],
    features: [
      'Tudo do Inicial',
      'Recepcionistas com instruções por área',
      'Acompanhamento do status dos contatos',
    ],
    whatsappConnections: null,
    aiFeatures: [],
    recommended: true,
    checkoutUrl: null,
  },
  {
    id: 'escala',
    name: 'Escala',
    description: 'Para operações com alto volume e vários atendentes.',
    monthlyPrice: null,
    annualPrice: null,
    usageLimits: [],
    features: ['Tudo do Crescimento', 'Equipe com papéis e permissões', 'Acompanhamento comercial dedicado'],
    whatsappConnections: null,
    aiFeatures: [],
    recommended: false,
    checkoutUrl: null,
  },
]

/** Somente depoimentos e resultados reais, com autorização do cliente. */
export const testimonials: Testimonial[] = []
export const clientLogos: { name: string; src: string }[] = []
export const resultMetrics: ResultMetric[] = []
