import { useEffect, useState, useRef, useCallback } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getContacts } from '@/services/contacts'
import { useRealtime } from '@/hooks/use-realtime'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Loader2, MessageSquare } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

export default function Pipeline() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [contacts, setContacts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const currentUserId = useRef(user?.id)
  currentUserId.current = user?.id

  const userId = user?.id
  const loadData = useCallback(async () => {
    if (!userId) return
    const requestedUserId = userId
    try {
      const data = await getContacts()
      if (currentUserId.current !== requestedUserId) return
      setContacts(data)
    } catch (e) {
      console.error(e)
    } finally {
      if (currentUserId.current === requestedUserId) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setContacts([])
    setLoading(true)
    loadData()
  }, [loadData])

  useRealtime(
    'whatsapp_contacts',
    () => {
      loadData()
    },
    !!user,
    user?.id || '',
  )

  if (loading) {
    return (
      <div className="flex h-full min-h-[400px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const columns = [
    {
      id: 'new',
      label: 'Novos',
      statuses: ['new', 'in_conversation', ''],
    },
    {
      id: 'waiting',
      label: 'Aguardando',
      statuses: ['waiting'],
    },
    {
      id: 'resolved',
      label: 'Resolvidos',
      statuses: ['resolved'],
    },
    {
      id: 'lost',
      label: 'Perdidos',
      statuses: ['lost'],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline de Atendimento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o status dos seus atendimentos
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const columnContacts = contacts.filter((c) => column.statuses.includes(c.status || ''))
          return (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium text-muted-foreground">{column.label}</h2>
                <span className="text-xs text-muted-foreground">{columnContacts.length}</span>
              </div>
              <ScrollArea className="h-[calc(100dvh-320px)] min-h-[300px]">
                <div className="space-y-2 pr-2">
                  {columnContacts.length === 0 ? (
                    <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                      Nenhum atendimento
                    </div>
                  ) : (
                    columnContacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="rounded-lg border bg-card p-3 space-y-1 cursor-pointer hover:border-brand-300 transition-colors"
                        onClick={() => navigate('/inbox', { state: { contactId: contact.id } })}
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="h-4 w-4 text-brand-500 shrink-0" />
                          <span className="text-sm font-medium truncate">
                            {contact.name || contact.phone}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.last_message || 'Sem mensagens'}
                        </p>
                        {contact.last_message_at && (
                          <p className="text-[11px] text-muted-foreground">
                            {formatDistanceToNow(parseISO(contact.last_message_at), {
                              addSuffix: true,
                              locale: ptBR,
                            })}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )
        })}
      </div>
    </div>
  )
}
