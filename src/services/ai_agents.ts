import pb from '@/lib/pocketbase/client'

export type AiAgent = {
  id: string
  user_id: string
  organization_id: string
  instance_id: string
  name: string
  description?: string
  provider: 'openai' | 'gemini'
  system_prompt: string
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

export const getAiAgents = () =>
  pb.collection<AiAgent>('ai_agents').getFullList({ expand: 'instance_id', sort: '-created' })

export const getAiAgent = (id: string) =>
  pb.collection<AiAgent>('ai_agents').getOne(id, { expand: 'instance_id' })

export const createAiAgent = (data: Record<string, unknown>) =>
  pb.collection<AiAgent>('ai_agents').create(data)

export const updateAiAgent = (id: string, data: Record<string, unknown>) =>
  pb.collection<AiAgent>('ai_agents').update(id, data)

export const deleteAiAgent = (id: string) => pb.collection('ai_agents').delete(id)
