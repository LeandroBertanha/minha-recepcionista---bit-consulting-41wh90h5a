import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { deleteAiAgent, type AiAgent } from '@/services/ai_agents'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DeleteAgentDialogProps {
  agent: AiAgent | null
  onClose: () => void
  onDeleted: () => void | Promise<void>
}

export function DeleteAgentDialog({ agent, onClose, onDeleted }: DeleteAgentDialogProps) {
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    if (!agent || deleting) return
    setDeleting(true)
    try {
      await deleteAiAgent(agent.id)
      await onDeleted()
      toast.success(`Recepcionista "${agent.name}" excluída.`)
      onClose()
    } catch {
      toast.error('Não foi possível excluir a recepcionista.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={!!agent} onOpenChange={(open) => !open && !deleting && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir recepcionista</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a recepcionista <strong>{agent?.name}</strong>? Esta ação
            não pode ser desfeita e o histórico de configuração será perdido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-600"
          >
            {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {deleting ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
