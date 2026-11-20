import pb from '@/lib/pocketbase/client'

export type AttentionContact = {
  id: string
  organization_id: string
  instance_id: string
  remote_jid: string
  name: string
  phone: string
  last_message: string
  last_message_at: string
  status: string
  agent_paused: boolean
  created: string
  updated: string
}

const requireUserId = () => {
  const userId = pb.authStore.record?.id
  if (!userId) throw new Error('Entre na sua conta para acessar a fila humana.')
  return userId
}

export const getAttentionContacts = (organizationId: string) => {
  const userId = requireUserId()
  return pb.collection<AttentionContact>('whatsapp_contacts').getFullList({
    sort: 'last_message_at',
    filter: pb.filter(
      'organization_id = {:organizationId} && instance_id.user_id = {:userId} && status = "waiting"',
      { organizationId, userId },
    ),
  })
}

export const assumeAttentionContact = (contactId: string) => {
  requireUserId()
  return pb.collection<AttentionContact>('whatsapp_contacts').update(contactId, {
    agent_paused: true,
    status: 'in_conversation',
  })
}
