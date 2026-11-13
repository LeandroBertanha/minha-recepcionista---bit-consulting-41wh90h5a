import pb from '@/lib/pocketbase/client'

export type WhatsAppInstance = {
  id: string
  user_id: string
  organization_id: string
  instance_name: string
  status: string
  created: string
  updated: string
}

export type IntegrationStatus = {
  ready: boolean
  evolution: {
    urlConfigured: boolean
    keyConfigured: boolean
  }
  webhook: {
    urlConfigured: boolean
    secretConfigured: boolean
  }
  instance: {
    id?: string
    userId?: string
    status: string
  }
  provider?: {
    remoteState?: string
  }
}

export const reconcileInstanceStatus = (
  instances: WhatsAppInstance[],
  integration: IntegrationStatus | null,
) => {
  const instanceId = integration?.instance.id
  const remoteState = integration?.provider?.remoteState
  if (!instanceId || remoteState !== 'open') return instances

  return instances.map((instance) =>
    instance.id === instanceId ? { ...instance, status: 'connected' } : instance,
  )
}

const requireUserId = () => {
  const userId = pb.authStore.record?.id
  if (!userId) throw new Error('Entre na sua conta para acessar o WhatsApp.')
  return userId
}

export const getInstances = (organizationId?: string) => {
  const userId = requireUserId()
  const filter = organizationId
    ? pb.filter('user_id = {:userId} && organization_id = {:organizationId}', {
        userId,
        organizationId,
      })
    : pb.filter('user_id = {:userId}', { userId })

  return pb.collection<WhatsAppInstance>('whatsapp_instances').getFullList({
    sort: '-created',
    filter,
  })
}

export const getContacts = (instanceId: string, organizationId?: string) => {
  const userId = requireUserId()
  if (!instanceId) throw new Error('Selecione a conexão do seu WhatsApp.')
  return pb.collection('whatsapp_contacts').getFullList({
    sort: '-last_message_at',
    filter: pb.filter(
      'instance_id = {:instanceId} && instance_id.user_id = {:userId}' +
        (organizationId ? ' && organization_id = {:organizationId}' : ''),
      { instanceId, userId, organizationId },
    ),
  })
}

export const isRecordFromInstance = (
  record: { instance_id?: string; organization_id?: string },
  instanceId: string | undefined,
  organizationId: string,
) => !!instanceId && record.instance_id === instanceId && record.organization_id === organizationId

export const ensureOwnInstance = (organizationId: string) => {
  requireUserId()
  return pb.send<{ instance: any; created: boolean }>('/backend/v1/instance/ensure', {
    method: 'POST',
    body: { organization_id: organizationId },
  })
}

export const getIntegrationStatus = () =>
  pb.send<IntegrationStatus>('/backend/v1/integration/status', { method: 'GET' })

export const toggleContactAgent = (contactId: string, paused: boolean) =>
  pb.collection('whatsapp_contacts').update(contactId, { agent_paused: paused })

export const getMessages = (contactId: string, instanceId: string) => {
  const userId = requireUserId()
  if (!contactId || !instanceId) throw new Error('Selecione uma conversa do seu WhatsApp.')
  return pb.collection('whatsapp_messages').getFullList({
    filter: pb.filter(
      'contact_id = {:contactId} && instance_id = {:instanceId} && instance_id.user_id = {:userId}',
      { contactId, instanceId, userId },
    ),
    sort: 'sent_at',
  })
}

export const fetchInstanceQR = (instanceId: string) =>
  pb.send<{ status: string; qrcode: string; pending?: boolean }>(
    `/backend/v1/instance/${instanceId}/qr`,
    { method: 'GET' },
  )

export const sendMessage = (
  contactId: string,
  data: {
    text: string
    file?: File
    type?: string
    base64?: string
    instance_id?: string
    remote_jid?: string
  },
) => {
  const formData = new FormData()
  formData.append('contact_id', contactId)
  formData.append('text', data.text || '')
  formData.append('body', data.text || '')
  formData.append('type', data.type || 'text')

  if (data.instance_id) {
    formData.append('instance_id', data.instance_id)
  }
  if (data.remote_jid) {
    formData.append('remote_jid', data.remote_jid)
  }

  if (data.file) {
    formData.append('media_file', data.file)
    formData.append('file_name', data.file.name)
    formData.append('mime_type', data.file.type)
  }

  if (data.base64) {
    formData.append('media_base64', data.base64)
  }

  return pb.send(`/backend/v1/messages/send`, {
    method: 'POST',
    body: formData,
  })
}

export const logoutInstance = () => pb.send(`/backend/v1/instance/logout`, { method: 'POST' })
