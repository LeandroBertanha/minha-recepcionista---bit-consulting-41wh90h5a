import pb from '@/lib/pocketbase/client'

export type ReceptionistConfiguration = {
  respond_in_groups: boolean
  knowledge: { company_info: string }
  behavior: {
    company_name: string
    market: string
    activities: string[]
    tone: string
    success_definition: string
    discovery_questions: string[]
    never_do: string[]
    adjustment: string
  }
  handoff: {
    intervention_number: string
    resume_after: '1h' | '3h' | '6h' | '12h' | '24h' | 'manual'
    triggers: string[]
    keywords: string[]
    business_hours_enabled: boolean
    business_hours: string
  }
  scheduling: { enabled: boolean; instructions: string }
  pricing: { instructions: string }
  blocked_numbers: string[]
}

export const defaultReceptionistConfiguration: ReceptionistConfiguration = {
  respond_in_groups: false,
  knowledge: { company_info: '' },
  behavior: {
    company_name: '',
    market: '',
    activities: [],
    tone: 'Próximo e acolhedor',
    success_definition: 'Cliente interessado encaminhado para a equipe',
    discovery_questions: [],
    never_do: [
      'Prometer resultado garantido',
      'Dar preço fechado sem informação suficiente',
      'Oferecer desconto por conta própria',
      'Insistir depois de uma recusa clara',
    ],
    adjustment: '',
  },
  handoff: {
    intervention_number: '',
    resume_after: '1h',
    triggers: [
      'Pediu para falar com uma pessoa',
      'Reclamou ou está irritado',
      'A recepcionista não sabe a resposta',
    ],
    keywords: [],
    business_hours_enabled: false,
    business_hours: '',
  },
  scheduling: { enabled: false, instructions: '' },
  pricing: { instructions: '' },
  blocked_numbers: [],
}

export const normalizeReceptionistConfiguration = (
  value?: Partial<ReceptionistConfiguration> | null,
): ReceptionistConfiguration => ({
  ...defaultReceptionistConfiguration,
  ...value,
  knowledge: { ...defaultReceptionistConfiguration.knowledge, ...value?.knowledge },
  behavior: { ...defaultReceptionistConfiguration.behavior, ...value?.behavior },
  handoff: { ...defaultReceptionistConfiguration.handoff, ...value?.handoff },
  scheduling: { ...defaultReceptionistConfiguration.scheduling, ...value?.scheduling },
  pricing: { ...defaultReceptionistConfiguration.pricing, ...value?.pricing },
  blocked_numbers: value?.blocked_numbers || [],
})

export type AiAgent = {
  id: string
  user_id: string
  organization_id: string
  instance_id: string
  name: string
  description?: string
  provider: 'openai' | 'gemini' | 'grok'
  system_prompt: string
  configuration?: ReceptionistConfiguration
  active: boolean
  created: string
  updated: string
  expand?: {
    instance_id?: {
      id: string
      status?: string
      instance_name?: string
    }
  }
}

export type AiSimulationResult = {
  reply: string
  provider: 'openai' | 'gemini' | 'grok'
}

export const getAiAgents = () =>
  pb.collection<AiAgent>('ai_agents').getFullList({ expand: 'instance_id', sort: '-created' })

export const getAiAgent = (id: string) =>
  pb.collection<AiAgent>('ai_agents').getOne(id, { expand: 'instance_id' })

export const createAiAgent = (data: Record<string, unknown>) =>
  pb.collection<AiAgent>('ai_agents').create(data)

export const updateAiAgent = (id: string, data: Record<string, unknown>) =>
  pb.collection<AiAgent>('ai_agents').update(id, data)

export const deleteAiAgent = (id: string) => pb.collection('ai_agents').delete(id)

export type AgentKnowledgeSource = {
  id: string
  agent_id: string
  user_id: string
  organization_id: string
  type: 'file' | 'link'
  name: string
  url?: string
  file?: string
  content?: string
  status: 'stored' | 'ready' | 'error'
  created: string
}

export const getAgentKnowledgeSources = (agentId: string) =>
  pb.collection<AgentKnowledgeSource>('agent_knowledge_sources').getFullList({
    filter: pb.filter('agent_id = {:agentId}', { agentId }),
    sort: '-created',
  })

export const createAgentKnowledgeLink = (data: {
  agent_id: string
  user_id: string
  organization_id: string
  url: string
}) =>
  pb.collection<AgentKnowledgeSource>('agent_knowledge_sources').create({
    ...data,
    type: 'link',
    name: data.url,
    status: 'ready',
  })

export const createAgentKnowledgeFile = (data: {
  agent_id: string
  user_id: string
  organization_id: string
  file: File
  content?: string
}) => {
  const body = new FormData()
  body.append('agent_id', data.agent_id)
  body.append('user_id', data.user_id)
  body.append('organization_id', data.organization_id)
  body.append('type', 'file')
  body.append('name', data.file.name)
  body.append('file', data.file)
  body.append('content', data.content || '')
  body.append('status', data.content ? 'ready' : 'stored')
  return pb.collection<AgentKnowledgeSource>('agent_knowledge_sources').create(body)
}

export const deleteAgentKnowledgeSource = (id: string) =>
  pb.collection('agent_knowledge_sources').delete(id)

export const simulateAiAgent = (agentId: string, message: string) => {
  if (!pb.authStore.record?.id) throw new Error('Entre na sua conta para testar a recepcionista.')

  return pb.send<AiSimulationResult>('/backend/v1/ai/simulate', {
    method: 'POST',
    body: { agent_id: agentId, message },
  })
}
