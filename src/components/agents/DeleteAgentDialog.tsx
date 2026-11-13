import { toast } from 'sonner'
import { deleteAiAgent } from '@/services/ai_agents'
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
import { Loader2 } from 'lucide-react'
import type { AiAgent } from '@/services/ai_agents'

interface DeleteAgentDialogProps {
  agent: AiAgent | null
  loading?: boolean
  onClose: () => void
}

export function DeleteAgentDialog({ agent, loading = false, onClose }: DeleteAgentDialogProps) {
  const handleDelete = async () => {
    if (!agent || loading) return
    try {
      await deleteAiAgent(agent.id)
      toast.success(`Recepcionista "${agent.name}" excluída.`)
      onClose()
    } catch {
      toast.error('Não foi possível excluir a recepcionista.')
    }
  }

  return (
    <AlertDialog open={!!agent} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir recepcionista</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a recepcionista <strong>{agent?.name}</strong>? Esta ação
            não pode ser desfeita e o histórico de configuração será perdido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault()
              void handleDelete()
            }}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600"
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {loading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
