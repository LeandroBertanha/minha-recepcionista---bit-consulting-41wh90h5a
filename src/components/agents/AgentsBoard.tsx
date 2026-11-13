/* Componentes visuais da tela Recepcionistas (cards, skeletons, estado vazio).
   Apenas apresentação: toda a lógica de dados permanece em App.tsx (AgentsView). */
import type { AiAgent } from '@/services/ai_agents'
import type { WhatsAppInstance } from '@/services/whatsapp'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import {
  Bot,
  Loader2,
  MessageCircle,
  Plug,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'

function AgentStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        active
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
          : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-300',
      )}
    >
      <span
        className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-emerald-500' : 'bg-neutral-400')}
      />
      {active ? 'Ativa' : 'Pausada'}
    </span>
  )
}

export function NewReceptionistButton({
  disabled,
  reason,
  onClick,
  className,
}: {
  disabled?: boolean
  reason?: string
  onClick: () => void
  className?: string
}) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-bold text-[#0A0A0A] shadow-[0_10px_24px_-12px_rgba(37,211,102,0.9)] transition hover:bg-[#1EBE5A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366]/50 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none',
        className,
      )}
    >
      <Plus className="h-4 w-4" />
      Nova recepcionista
    </button>
  )

  if (!disabled || !reason) return button

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-not-allowed">{button}</span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-56 text-center">
          {reason}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export function AgentCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#141414]"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-3.5 w-full" />
      <Skeleton className="mt-2 h-3.5 w-4/5" />
      <div className="mt-5 space-y-2.5 rounded-2xl bg-neutral-50 p-3 dark:bg-white/[0.04]">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
      <div className="mt-5 flex gap-2">
        <Skeleton className="h-11 flex-1 rounded-full" />
        <Skeleton className="h-11 w-24 rounded-full" />
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
    </div>
  )
}

export function AgentsEmptyState({
  canCreate,
  connected,
  onCreate,
}: {
  canCreate: boolean
  connected: boolean
  onCreate: () => void
}) {
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-dashed border-neutral-300 bg-white p-10 text-center dark:border-white/15 dark:bg-[#141414] sm:p-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-[420px] -translate-x-1/2 rounded-full bg-[#25D366]/10 blur-3xl" />
      <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EAFBF0] text-[#128C7E] dark:bg-[#25D366]/10 dark:text-[#25D366]">
        <Bot className="h-8 w-8" />
      </div>
      <h3 className="relative mt-5 text-xl font-semibold tracking-[-0.01em]">
        Nenhuma recepcionista configurada
      </h3>
      <p className="relative mx-auto mt-2 max-w-xl text-sm leading-6 text-neutral-500 dark:text-neutral-400">
        {connected
          ? 'Crie a recepcionista, informe as instruções e mantenha-a pausada até validar a chave e o comportamento.'
          : 'Conecte o WhatsApp deste usuário em Integrações antes de configurar a recepcionista.'}
      </p>
      <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <NewReceptionistButton
          disabled={!canCreate}
          reason={
            connected
              ? undefined
              : 'Conecte seu WhatsApp em Integrações para criar uma recepcionista.'
          }
          onClick={onCreate}
          className="px-5"
        />
        {!connected && (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-400">
            <Plug className="h-3.5 w-3.5" />A conexão fica na tela Integrações.
          </p>
        )}
      </div>
    </section>
  )
}

export function AgentCard({
  agent,
  instance,
  featured,
  toggling,
  onToggle,
  onEdit,
  onDelete,
}: {
  agent: AiAgent
  instance?: WhatsAppInstance
  featured?: boolean
  toggling: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const connected = instance?.status === 'connected'
  const summary = agent.description || 'Atendimento automático pelo WhatsApp.'

  return (
    <article className="flex flex-col rounded-[24px] border border-neutral-200/80 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-[#141414]">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={cn(
              'flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold',
              featured
                ? 'bg-[#25D366] text-[#0A0A0A]'
                : 'bg-[#0A0A0A] text-[#25D366] dark:bg-white dark:text-[#0A0A0A]',
            )}
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold tracking-[-0.01em]" title={agent.name}>
              {agent.name}
            </h3>
            <p className="text-xs text-neutral-400">Recepcionista virtual</p>
          </div>
        </div>
        <AgentStatusBadge active={agent.active} />
      </div>

      <p
        className="mt-4 line-clamp-2 min-h-10 text-sm leading-6 text-neutral-500 dark:text-neutral-400"
        title={summary}
      >
        {summary}
      </p>

      <div className="mt-4 space-y-2.5 rounded-2xl bg-neutral-50 p-3.5 text-sm dark:bg-white/[0.04]">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 font-semibold',
              connected
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-amber-600 dark:text-amber-400',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                connected ? 'bg-emerald-500' : 'bg-amber-400',
              )}
            />
            {connected ? 'Online' : 'Offline'}
          </span>
        </div>
        {instance?.instance_name && (
          <p className="truncate text-xs text-neutral-400" title={instance.instance_name}>
            Instância: {instance.instance_name}
          </p>
        )}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <Sparkles className="h-4 w-4" />
            Provedor
          </span>
          <span className="font-semibold">{agent.provider === 'openai' ? 'OpenAI' : 'Gemini'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
            <ShieldCheck className="h-4 w-4" />
            Chave
          </span>
          <span className="font-semibold">Protegida</span>
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-full bg-[#0A0A0A] py-2.5 text-sm font-bold text-white transition hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Configurar
        </button>
        <button
          type="button"
          onClick={onToggle}
          disabled={toggling}
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-neutral-200 px-4 py-2.5 text-xs font-bold transition hover:border-neutral-300 hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60 dark:border-white/10 dark:hover:bg-white/[0.06]"
        >
          {toggling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {agent.active ? 'Pausar' : 'Ativar'}
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir recepcionista"
          title="Excluir recepcionista"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 text-neutral-400 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-500 dark:border-white/10 dark:hover:border-rose-400/30 dark:hover:bg-rose-400/10 dark:hover:text-rose-300"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  )
}
