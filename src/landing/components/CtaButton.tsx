import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { track } from '../analytics'

type Variant = 'primary' | 'dark' | 'light' | 'outline-light' | 'outline-dark'

const variants: Record<Variant, string> = {
  primary: 'bg-wa text-ink hover:bg-[#3ee07a] focus-visible:ring-wa',
  dark: 'bg-ink text-white hover:bg-neutral-800 focus-visible:ring-ink',
  light: 'bg-white text-ink hover:bg-neutral-100 focus-visible:ring-white',
  'outline-light': 'border border-white/25 text-white hover:border-white/60 hover:bg-white/5 focus-visible:ring-white',
  'outline-dark': 'border border-ink/15 text-ink hover:border-ink/50 focus-visible:ring-ink',
}

type Props = {
  children: ReactNode
  ctaId: string
  position: string
  variant?: Variant
  size?: 'md' | 'lg'
  icon?: boolean
  className?: string
} & ({ onClick: () => void; href?: never } | { href: string; onClick?: never })

export function CtaButton({ children, ctaId, position, variant = 'primary', size = 'md', icon = true, className, ...rest }: Props) {
  const classes = cn(
    'group inline-flex items-center justify-center gap-2 rounded-full font-landing font-semibold tracking-[-0.01em] transition-[background-color,border-color,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
    size === 'lg' ? 'h-14 px-7 text-[15px]' : 'h-11 px-5 text-sm',
    variants[variant],
    className,
  )
  const content = (
    <>
      {children}
      {icon && (
        <ArrowUpRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
        />
      )}
    </>
  )

  if ('href' in rest && rest.href) {
    const href = rest.href
    return (
      <a href={href} className={classes} onClick={() => track('cta_click', { cta_id: ctaId, position })}>
        {content}
      </a>
    )
  }

  return (
    <button
      type="button"
      className={classes}
      onClick={() => {
        track('cta_click', { cta_id: ctaId, position })
        rest.onClick?.()
      }}
    >
      {content}
    </button>
  )
}
