import { getContacts as getInstanceContacts, getInstances } from '@/services/whatsapp'

export const getContacts = async () => {
  const instances = await getInstances()
  const instance = instances[0]
  return instance ? getInstanceContacts(instance.id, instance.organization_id) : []
}
