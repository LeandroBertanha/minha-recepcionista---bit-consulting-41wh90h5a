import type { ReactNode } from 'react'
import { CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '../content'

export function PhoneFrame({
  children,
  contactName,
  className,
}: {
  children: ReactNode
  contactName: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'relative aspect-[9/19] w-[280px] rounded-[44px] bg-ink p-[10px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.55),inset_0_0_0_1.5px_rgba(255,255,255,0.12)]',
        className,
      )}
    >
      <div className="relative flex h-full flex-col overflow-hidden rounded-[34px] bg-[#EFEAE2]">
        <div className="absolute left-1/2 top-2 z-20 h-[22px] w-[84px] -translate-x-1/2 rounded-full bg-ink" />
        <div className="relative z-10 flex items-center gap-2.5 bg-wa-deep px-4 pb-2.5 pt-9 text-white">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-wa text-[11px] font-bold text-ink">
            MR
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate font-landing text-[13px] font-semibold">Minha Recepcionista</p>
            <p className="font-machine text-[10px] text-white/70">
              online · atendendo {contactName}
            </p>
          </div>
        </div>
        <div
          className="relative flex-1 overflow-hidden px-2.5 py-3"
          style={{
            backgroundImage: 'radial-gradient(rgba(7,94,84,0.08) 1px, transparent 1px)',
            backgroundSize: '14px 14px',
          }}
        >
          {children}
        </div>
        <div className="flex items-center gap-2 bg-[#F0F0F0] px-3 py-2.5">
          <div className="h-8 flex-1 rounded-full bg-white px-3 font-landing text-[11px] leading-8 text-neutral-400">
            Mensagem
          </div>
          <div className="grid h-8 w-8 place-items-center rounded-full bg-wa-dark">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-white" aria-hidden>
              <path d="M3 20.5v-6l8-2.5-8-2.5v-6l19 8.5z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Bubble({ message, className }: { message: ChatMessage; className?: string }) {
  const outgoing = message.from !== 'client'
  return (
    <div className={cn('flex', outgoing ? 'justify-end' : 'justify-start', className)}>
      <div
        className={cn(
          'relative max-w-[86%] rounded-2xl px-3 pb-1.5 pt-2 font-landing text-[12.5px] leading-[1.38] text-ink shadow-[0_1px_0.5px_rgba(0,0,0,0.13)]',
          outgoing ? 'rounded-tr-md bg-wa-bubble' : 'rounded-tl-md bg-white',
        )}
      >
        {message.from === 'human' && (
          <p className="mb-0.5 font-machine text-[9.5px] uppercase tracking-wider text-wa-dark">
            Ana · equipe
          </p>
        )}
        {message.from === 'bot' && (
          <p className="mb-0.5 font-machine text-[9.5px] uppercase tracking-wider text-wa-dark">
            IA
          </p>
        )}
        <p>{message.text}</p>
        <p className="mt-0.5 flex items-center justify-end gap-1 font-machine text-[9.5px] text-neutral-500">
          {message.time}
          {outgoing && <CheckCheck aria-hidden className="h-3 w-3 text-[#53BDEB]" />}
        </p>
      </div>
    </div>
  )
}

export function TypingBubble() {
  return (
    <div className="flex justify-end">
      <div
        className="flex items-center gap-1 rounded-2xl rounded-tr-md bg-wa-bubble px-3.5 py-3"
        aria-label="Digitando"
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 animate-bounce rounded-full bg-wa-dark/70"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
    </div>
  )
}
