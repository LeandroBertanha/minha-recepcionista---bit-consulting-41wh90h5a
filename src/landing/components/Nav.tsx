import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { landingConfig } from '../landing.config'
import { useDiagnostic } from '../diagnostic/DiagnosticContext'
import { track } from '../analytics'
import { CtaButton } from './CtaButton'
export const navLinks = [
  { href: '#solucao', label: 'Funcionalidades' },
  { href: '#como-funciona', label: 'Como funciona' },
  { href: '#segmentos', label: 'Segmentos' },
  { href: '#planos', label: 'Planos' },
  { href: '#faq', label: 'Perguntas' },
]

export function Logo({ className }: { className?: string }) {
  return (
    <a
      href="#inicio"
      className={cn(
        'flex shrink-0 items-center gap-2 whitespace-nowrap font-landing text-[14px] font-semibold tracking-[-0.02em] sm:text-[15px]',
        className,
      )}
    >
      <img src="/landing/logo-mark.png" alt="" width={32} height={32} className="h-8 w-8" />
      {landingConfig.productName}
    </a>
  )
}

export function Nav() {
  const { open } = useDiagnostic()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-4">
      <nav
        aria-label="Principal"
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-2 rounded-full border border-white/10 bg-ink/80 pl-4 pr-2 sm:gap-4 sm:pl-5 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] backdrop-blur-xl"
      >
        <Logo />
        <ul className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="rounded-full px-3.5 py-2 text-[13.5px] text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5">
          <a
            href={landingConfig.appUrl}
            onClick={() => track('cta_click', { cta_id: 'nav_login', position: 'nav' })}
            className="hidden rounded-full px-4 py-2 text-[13.5px] text-white/80 transition-colors hover:text-white sm:inline-block"
          >
            Entrar
          </a>
          <CtaButton
            ctaId="nav_diagnostic"
            position="nav"
            icon={false}
            className="h-10 px-3.5 sm:px-4"
            onClick={() => open({ origin: 'nav' })}
          >
            <span className="sm:hidden">Diagnóstico</span>
            <span className="hidden sm:inline">Diagnóstico grátis</span>
          </CtaButton>
          <button
            type="button"
            aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full text-white/80 hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>
      {menuOpen && (
        <div className="mx-auto mt-2 max-w-6xl rounded-3xl border border-white/10 bg-ink/95 p-3 text-white backdrop-blur-xl lg:hidden">
          <ul className="flex flex-col">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-[15px] hover:bg-white/5"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href={landingConfig.appUrl}
                className="block rounded-2xl px-4 py-3 text-[15px] text-white/70 hover:bg-white/5"
              >
                Entrar na plataforma
              </a>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}
