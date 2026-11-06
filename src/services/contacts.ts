import pb from '@/lib/pocketbase/client'

export const getContacts = () =>
  pb.collection('whatsapp_contacts').getFullList({
    sort: '-updated',
  })
