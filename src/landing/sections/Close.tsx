import { useEffect, useState } from 'react'
import * as Accordion from '@radix-ui/react-accordion'
import { Check, Minus, Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import { comparison, differentials, faqs } from '../content'
import { clientLogos, landingConfig, plans, resultMetrics, testimonials, type Plan } from '../landing.config'
import { CtaButton } from '../components/CtaButton'
import { Eyebrow, Human, SectionTitle } from '../components/SectionHeading'
import { Logo, navLinks } from '../components/Nav'
import { useDiagnostic } from '../diagnostic/DiagnosticContext'
import { track } from '../analytics'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export function Differentials() {
  return (
    <section id="diferenciais" className="bg-white py-24 text-ink sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Eyebrow>Diferenciais</Eyebrow>
          <SectionTitle className="mt-4">
            Não é apenas um chatbot. <Human className="text-wa-dark">É uma central inteligente para sua empresa.</Human>
          </SectionTitle>
          <ul className="mt-10 space-y-3">
            {differentials.map((d) => (
              <li key={d} className="flex items-start gap-3 text-[15px]">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-wa">
                  <Check className="h-3 w-3 text-ink" strokeWidth={3} aria-hidden />
                </span>
                {d}
              </li>
            ))}
          </ul>
        </div>

        <div className="self-center overflow-hidden rounded-[28px] border border-ink/10">
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Comparação entre atendimento tradicional e atendimento automatizado</caption>
            <thead>
              <tr>
                <th scope="col" className="w-[28%] p-4 font-machine text-[10px] font-normal uppercase tracking-[0.14em] text-ink/40 sm:p-5">
                  <span className="sr-only">Tema</span>
                </th>
                <th scope="col" className="p-4 font-landing text-sm font-semibold text-ink/55 sm:p-5">Atendimento tradicional</th>
                <th scope="col" className="bg-ink p-4 font-landing text-sm font-semibold text-white sm:p-5">
                  Com a <span className="text-wa">{landingConfig.productName}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr key={row.topic} className="border-t border-ink/10">
                  <th scope="row" className="p-4 font-machine text-[10.5px] font-normal uppercase tracking-[0.1em] text-ink/45 sm:p-5">
                    {row.topic}
                  </th>
                  <td className="p-4 text-ink/55 sm:p-5">
                    <span className="flex items-start gap-2">
                      <Minus className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink/30" aria-hidden /> {row.traditional}
                    </span>
                  </td>
                  <td className="border-t border-white/10 bg-ink p-4 font-medium text-white sm:p-5">
                    <span className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-wa" aria-hidden /> {row.automated}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function PriceLabel({ plan, billing }: { plan: Plan; billing: 'monthly' | 'annual' }) {
  const value = billing === 'annual' ? plan.annualPrice : plan.monthlyPrice
  if (value === null) {
    return <p className="font-landing text-3xl font-semibold tracking-[-0.03em]">Sob consulta</p>
  }
  return (
    <p className="font-landing text-4xl font-semibold tracking-[-0.03em]">
      {brl.format(value)}
      <span className="ml-1 text-sm font-normal opacity-60">{billing === 'annual' ? '/ano' : '/mês'}</span>
    </p>
  )
}

export function Pricing() {
  const { open } = useDiagnostic()
  const hasAnnual = plans.some((p) => p.annualPrice !== null)
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')

  function choose(plan: Plan) {
    track('plan_select', { plan_id: plan.id })
    if (plan.checkoutUrl) {
      track('checkout_click', { plan_id: plan.id, position: 'pricing' })
      window.location.assign(plan.checkoutUrl)
      return
    }
    open({ origin: 'pricing', planId: plan.id })
  }

  return (
    <section id="planos" className="bg-ink py-24 text-white sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Eyebrow tone="light">Planos e assinaturas</Eyebrow>
            <SectionTitle className="mt-4">
              Escolha o plano <Human className="text-wa">ideal para sua empresa.</Human>
            </SectionTitle>
          </div>
          {hasAnnual && (
            <div role="radiogroup" aria-label="Período de cobrança" className="inline-flex self-start rounded-full border border-white/15 p-1">
              {(['monthly', 'annual'] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={billing === b}
                  onClick={() => setBilling(b)}
                  className={cn('rounded-full px-4 py-2 text-sm', billing === b ? 'bg-white text-ink' : 'text-white/70')}
                >
                  {b === 'monthly' ? 'Mensal' : 'Anual'}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-14 grid gap-3 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className={cn(
                'relative flex flex-col rounded-[28px] p-7 sm:p-8',
                plan.recommended ? 'bg-wa text-ink' : 'border border-white/12 bg-white/[0.03]',
              )}
            >
              {plan.recommended && (
                <span className="absolute right-6 top-6 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 font-machine text-[10px] uppercase tracking-[0.12em] text-wa">
                  <Star className="h-3 w-3 fill-current" aria-hidden /> Recomendado
                </span>
              )}
              <h3 className="font-landing text-xl font-semibold">{plan.name}</h3>
              <p className={cn('mt-2 min-h-[44px] text-sm leading-relaxed', plan.recommended ? 'text-ink/70' : 'text-white/55')}>
                {plan.description}
              </p>
              <div className="mt-8">
                <PriceLabel plan={plan} billing={hasAnnual ? billing : 'monthly'} />
              </div>
              <dl className={cn('mt-6 space-y-1 text-sm', plan.recommended ? 'text-ink/70' : 'text-white/60')}>
                {plan.whatsappConnections !== null && (
                  <div className="flex justify-between">
                    <dt>Conexões de WhatsApp</dt>
                    <dd className="font-semibold">{plan.whatsappConnections}</dd>
                  </div>
                )}
                {plan.usageLimits.map((limit) => (
                  <div key={limit}>
                    <dd>{limit}</dd>
                  </div>
                ))}
              </dl>
              <ul className={cn('mt-6 flex-1 space-y-2.5 border-t pt-6', plan.recommended ? 'border-ink/15' : 'border-white/10')}>
                {[...plan.features, ...plan.aiFeatures].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className={cn('mt-0.5 h-4 w-4 shrink-0', plan.recommended ? 'text-ink' : 'text-wa')} aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => choose(plan)}
                className={cn(
                  'mt-8 inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  plan.recommended ? 'bg-ink text-white hover:bg-neutral-800' : 'bg-white text-ink hover:bg-neutral-200',
                )}
              >
                {plan.checkoutUrl ? `Contratar ${plan.name}` : `Quero o plano ${plan.name}`}
              </button>
            </article>
          ))}
        </div>
        <p className="mt-6 text-sm text-white/45">
          Sem certeza de qual plano escolher?{' '}
          <button type="button" onClick={() => open({ origin: 'pricing_help' })} className="text-white underline underline-offset-4">
            Faça o diagnóstico gratuito
          </button>{' '}
          e receba uma recomendação.
        </p>
      </div>
    </section>
  )
}

export function SocialProof() {
  const hasContent = testimonials.length > 0 || clientLogos.length > 0 || resultMetrics.length > 0
  if (!hasContent) return null

  return (
    <section id="clientes" className="bg-white py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Eyebrow>Clientes</Eyebrow>
        <SectionTitle className="mt-4 max-w-4xl">
          Empresas mais inteligentes começam com <Human className="text-wa-dark">um atendimento melhor.</Human>
        </SectionTitle>

        {resultMetrics.length > 0 && (
          <dl className="mt-14 grid gap-3 sm:grid-cols-3">
            {resultMetrics.map((m) => (
              <div key={m.label} className="rounded-[24px] bg-neutral-100 p-7">
                <dt className="text-sm text-ink/55">{m.label}</dt>
                <dd className="mt-2 font-landing text-4xl font-semibold tracking-[-0.03em]">{m.value}</dd>
                <dd className="mt-1 text-xs text-ink/45">{m.context}</dd>
              </div>
            ))}
          </dl>
        )}

        {testimonials.length > 0 && (
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="rounded-[24px] border border-ink/10 p-7">
                <blockquote className="font-human text-2xl italic leading-snug">“{t.quote}”</blockquote>
                <figcaption className="mt-6 text-sm">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-ink/55"> · {t.role}, {t.company}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        )}

        {clientLogos.length > 0 && (
          <ul className="mt-12 flex flex-wrap items-center gap-10 opacity-70 grayscale">
            {clientLogos.map((logo) => (
              <li key={logo.name}>
                <img src={logo.src} alt={logo.name} className="h-8 w-auto" loading="lazy" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export function Faq() {
  const { open } = useDiagnostic()

  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    })
    document.head.appendChild(script)
    return () => script.remove()
  }, [])

  return (
    <section id="faq" className="bg-white pb-24 text-ink sm:pb-32">
      <div className="mx-auto grid max-w-7xl gap-12 border-t border-ink/10 px-5 pt-20 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <Eyebrow>Perguntas frequentes</Eyebrow>
          <SectionTitle className="mt-4">
            Tudo o que você <Human className="text-wa-dark">precisa saber.</Human>
          </SectionTitle>
          <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-ink/60">
            Não encontrou sua dúvida?{' '}
            <button type="button" onClick={() => open({ origin: 'faq' })} className="font-semibold text-ink underline underline-offset-4">
              Faça o diagnóstico
            </button>{' '}
            e fale com nossa equipe.
          </p>
        </div>
        <Accordion.Root type="single" collapsible className="divide-y divide-ink/10 border-y border-ink/10">
          {faqs.map((f, i) => (
            <Accordion.Item key={f.q} value={`q${i}`}>
              <Accordion.Header>
                <Accordion.Trigger className="group flex w-full items-center justify-between gap-6 py-5 text-left font-landing text-[16px] font-semibold tracking-[-0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa-dark">
                  {f.q}
                  <Plus className="h-5 w-5 shrink-0 text-ink/40 transition-transform duration-200 group-data-[state=open]:rotate-45" aria-hidden />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Content className="overflow-hidden text-[15px] leading-relaxed text-ink/65 data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                <p className="max-w-2xl pb-6">{f.a}</p>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { open } = useDiagnostic()
  return (
    <section className="relative overflow-hidden bg-ink py-28 text-white sm:py-36">
      <div aria-hidden className="pointer-events-none absolute left-1/2 top-full h-[700px] w-[1100px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-wa/30 blur-[140px]" />
      <div className="relative mx-auto max-w-4xl px-5 text-center sm:px-8">
        <h2 className="font-landing text-[clamp(2.3rem,5.6vw,4.6rem)] font-semibold leading-[1] tracking-[-0.04em]">
          Seus clientes não precisam esperar.{' '}
          <Human className="text-wa">Sua empresa também não precisa parar.</Human>
        </h2>
        <p className="mx-auto mt-7 max-w-xl text-[17px] leading-relaxed text-white/65">
          Automatize seu WhatsApp, simplifique seu atendimento e transforme mais conversas em oportunidades de negócio.
        </p>
        <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
          <CtaButton ctaId="final_primary" position="final" size="lg" onClick={() => open({ origin: 'final' })}>
            Quero começar agora
          </CtaButton>
          <CtaButton ctaId="final_secondary" position="final" size="lg" variant="outline-light" icon={false} href="#solucao">
            Conhecer a plataforma
          </CtaButton>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  const { open } = useDiagnostic()
  const { contactEmail, supportEmail, social, appUrl } = landingConfig
  const linkClass = 'text-sm text-white/60 transition-colors hover:text-white'

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-12 border-t border-white/10 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
            Chatbot inteligente para WhatsApp: atendimento, vendas e agendamentos em uma única plataforma.
          </p>
          <p className="mt-6 font-machine text-[10px] uppercase tracking-[0.14em] text-white/35">Um produto {landingConfig.partners}</p>
        </div>
        <nav aria-label="Navegação do rodapé">
          <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-white/35">Navegação</p>
          <ul className="mt-4 space-y-2.5">
            {navLinks.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-white/35">Atendimento</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              {contactEmail ? (
                <a href={`mailto:${contactEmail}`} className={linkClass}>
                  Contato
                </a>
              ) : (
                <button type="button" onClick={() => open({ origin: 'footer_contact' })} className={linkClass}>
                  Contato
                </button>
              )}
            </li>
            <li>
              <a href={supportEmail ? `mailto:${supportEmail}` : appUrl} className={linkClass}>
                Suporte
              </a>
            </li>
            <li>
              <a href={appUrl} className={linkClass}>
                Entrar na plataforma
              </a>
            </li>
          </ul>
        </div>
        <div>
          <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-white/35">Legal</p>
          <ul className="mt-4 space-y-2.5">
            <li>
              <a href="/privacidade" className={linkClass}>
                Política de privacidade
              </a>
            </li>
            <li>
              <a href="/termos" className={linkClass}>
                Termos de uso
              </a>
            </li>
          </ul>
          {social.length > 0 && (
            <>
              <p className="mt-8 font-machine text-[10px] uppercase tracking-[0.16em] text-white/35">Redes sociais</p>
              <ul className="mt-4 space-y-2.5">
                {social.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noreferrer" className={linkClass}>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-2 px-5 pb-10 font-machine text-[10.5px] text-white/35 sm:flex-row sm:px-8">
        <p>© {new Date().getFullYear()} {landingConfig.companyName}. Todos os direitos reservados.</p>
        <p>WhatsApp é uma marca registrada da Meta Platforms, Inc.</p>
      </div>
    </footer>
  )
}
