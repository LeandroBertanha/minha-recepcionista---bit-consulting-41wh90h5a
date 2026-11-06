import { cn } from '@/lib/utils'

interface BrandLogoProps {
  className?: string
  compact?: boolean
}

export function BrandLogo({ className, compact = false }: BrandLogoProps) {
  return (
    <div className={cn('flex items-center gap-2 sm:gap-3', className)}>
      <img
        src="/bit-consulting-logo.webp"
        alt="Bit Consulting"
        className={cn(
          'object-contain',
          compact ? 'h-10 w-[64px] sm:h-12 sm:w-[84px]' : 'h-14 w-[150px]',
        )}
      />
      <div className="min-w-0 border-l border-slate-200 pl-2 sm:pl-3">
        <span className="block whitespace-nowrap text-[16px] font-extrabold leading-none tracking-[-0.04em] text-slate-900 sm:text-[18px]">
          Bit<span className="text-brand-500">Zaap</span>
        </span>
        <span className="mt-1 hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
          WhatsApp com IA
        </span>
      </div>
    </div>
  )
}
