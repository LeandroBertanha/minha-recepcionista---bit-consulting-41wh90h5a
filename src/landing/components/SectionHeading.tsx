import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function Eyebrow({
  children,
  tone = 'dark',
}: {
  children: ReactNode
  tone?: 'dark' | 'light'
}) {
  return (
    <p
      className={cn(
        'font-machine text-[11px] uppercase tracking-[0.18em]',
        tone === 'dark' ? 'text-wa-dark' : 'text-wa',
      )}
    >
      {children}
    </p>
  )
}

export function SectionTitle({
  children,
  className,
  as: Tag = 'h2',
}: {
  children: ReactNode
  className?: string
  as?: 'h2' | 'h3'
}) {
  return (
    <Tag
      className={cn(
        'font-landing text-[clamp(2rem,4.4vw,3.5rem)] font-semibold leading-[1.02] tracking-[-0.035em]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}

export function Human({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('font-human text-[1.08em] font-normal italic tracking-[-0.01em]', className)}
    >
      {children}
    </span>
  )
}
