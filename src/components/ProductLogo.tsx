import { cn } from '@/lib/utils'

/** The same mark and wordmark used on the landing page. `tone` is the color of the surface it sits on. */
export function ProductLogo({ tone = 'dark', className }: { tone?: 'dark' | 'light'; className?: string }) {
  return (
    <span className={cn('flex shrink-0 items-center gap-2.5 whitespace-nowrap font-landing text-[15px] font-semibold tracking-[-0.02em]', className)}>
      <img
        src={tone === 'dark' ? '/landing/logo-mark.png' : '/landing/logo-mark-ink.png'}
        alt=""
        width={32}
        height={32}
        className="h-8 w-8"
      />
      <span className={tone === 'dark' ? 'text-white' : 'text-[#0A0A0A]'}>Minha Recepcionista</span>
    </span>
  )
}
