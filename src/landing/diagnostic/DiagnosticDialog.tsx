import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, Loader2, Send, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { captureLeadSource, track } from '../analytics'
import { landingConfig, plans } from '../landing.config'
import {
  buildRuleDiagnosis,
  isValidEmail,
  isValidWhatsapp,
  normalizeWhatsapp,
  optionLabel,
  questions,
  recommendPlan,
  type Contact,
  type DiagnosticAnswers,
  type Diagnosis,
} from './engine'
import { createLeadId, submitLead, updateLeadStage, type LeadRecord, type LeadStage } from './leadsApi'

const PROGRESS_KEY = 'mr_diagnostic_progress'
const CONTACT_STEP = questions.length

type Phase = 'questions' | 'analyzing' | 'result'

type Props = { open: boolean; origin: string; planId?: string; onOpenChange: (open: boolean) => void }

function loadProgress(): Partial<DiagnosticAnswers> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}') as Partial<DiagnosticAnswers>
  } catch {
    return {}
  }
}

function firstUnanswered(answers: Partial<DiagnosticAnswers>): number {
  const index = questions.findIndex((q) => !answers[q.id])
  return index === -1 ? CONTACT_STEP : index
}

function formatPhone(value: string): string {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`
}

function BotLine({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-end gap-2.5">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink font-machine text-[9px] font-medium text-wa">IA</span>
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </div>
  )
}

function UserLine({ children, onEdit }: { children: React.ReactNode; onEdit?: () => void }) {
  return (
    <div className="flex justify-end">
      <button
        type="button"
        onClick={onEdit}
        title="Alterar resposta"
        className="max-w-[85%] rounded-2xl rounded-br-md bg-wa-bubble px-4 py-3 text-left text-[15px] leading-relaxed text-ink transition-colors hover:bg-[#c9f7c1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa-dark"
      >
        {children}
      </button>
    </div>
  )
}

export default function DiagnosticDialog({ open, origin, planId, onOpenChange }: Props) {
  const reduceMotion = useReducedMotion()
  const [answers, setAnswers] = useState<Partial<DiagnosticAnswers>>(loadProgress)
  const [step, setStep] = useState(() => firstUnanswered(loadProgress()))
  const [phase, setPhase] = useState<Phase>('questions')
  const [textDraft, setTextDraft] = useState('')
  const [textError, setTextError] = useState('')
  const [contact, setContact] = useState<Contact>({ name: '', whatsapp: '', email: '' })
  const [consent, setConsent] = useState(false)
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof Contact | 'consent', string>>>({})
  const [lead, setLead] = useState<LeadRecord | null>(null)
  const [delivered, setDelivered] = useState(false)
  const [confirmation, setConfirmation] = useState<string | null>(null)
  const threadEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(answers))
    } catch {
      // Sem armazenamento local, o progresso vale só para esta sessão.
    }
  }, [answers])

  useEffect(() => {
    threadEnd.current?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'end' })
  }, [step, phase, reduceMotion])

  useEffect(() => {
    const q = questions[step]
    if (q?.kind === 'text') setTextDraft(answers[q.id] ?? '')
    setTextError('')
  }, [step]) // eslint-disable-line react-hooks/exhaustive-deps

  const planInterest = useMemo(() => plans.find((p) => p.id === planId) ?? null, [planId])

  function answer(questionIndex: number, value: string) {
    const q = questions[questionIndex]
    setAnswers((a) => ({ ...a, [q.id]: value }))
    track('diagnostic_step', { step: questionIndex + 1, question: q.id })
    const next = { ...answers, [q.id]: value }
    setStep(firstUnanswered(next) > questionIndex ? firstUnanswered(next) : questionIndex + 1)
  }

  function submitText(event: FormEvent) {
    event.preventDefault()
    const value = textDraft.trim()
    if (value.length < 2) {
      setTextError('Digite o nome da empresa para continuar.')
      return
    }
    answer(step, value.slice(0, 120))
  }

  async function submitContact(event: FormEvent) {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (contact.name.trim().length < 2) nextErrors.name = 'Informe seu nome.'
    if (!isValidWhatsapp(contact.whatsapp)) nextErrors.whatsapp = 'Informe um WhatsApp com DDD, como (11) 99999-9999.'
    if (!isValidEmail(contact.email)) nextErrors.email = 'Informe um e-mail válido, como nome@empresa.com.'
    if (!consent) nextErrors.consent = 'Precisamos da sua autorização para enviar o diagnóstico.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return
    if (honeypot) return

    const full = answers as DiagnosticAnswers
    const recommended = recommendPlan(full, plans)
    const source = captureLeadSource(window.location.search, document.referrer, window.location.pathname, sessionStorage)
    const record: LeadRecord = {
      id: createLeadId(),
      contact: { name: contact.name.trim(), whatsapp: normalizeWhatsapp(contact.whatsapp), email: contact.email.trim().toLowerCase() },
      company: { name: full.companyName, segment: full.segment },
      answers: full,
      diagnosis: buildRuleDiagnosis(full),
      diagnosisSource: 'rules',
      recommendedPlan: recommended?.id ?? null,
      planInterest: planId ?? null,
      source: { ...source, origin },
      funnelStage: 'diagnosed',
      consent: true,
      createdAt: new Date().toISOString(),
    }

    setPhase('analyzing')
    const [result] = await Promise.all([
      submitLead(record),
      new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 300 : 1800)),
    ])
    setLead({ ...record, diagnosis: result.diagnosis, diagnosisSource: result.diagnosisSource })
    setDelivered(result.delivered)
    setPhase('result')
    track('diagnostic_complete', { origin, segment: full.segment, recommended_plan: record.recommendedPlan, source: result.diagnosisSource })
  }

  async function convert(stage: LeadStage, message: string, url?: string | null) {
    if (!lead) return
    const plan = lead.planInterest ?? lead.recommendedPlan ?? undefined
    const eventByStage: Partial<Record<LeadStage, Parameters<typeof track>[0]>> = {
      signup: 'signup_click',
      checkout: 'checkout_click',
      demo: 'demo_request',
      trial: 'signup_click',
    }
    const event = eventByStage[stage]
    if (event) track(event, { plan_id: plan ?? null, origin })
    setLead(await updateLeadStage(lead, stage, plan))
    if (url) {
      window.open(url, url.startsWith('/') ? '_self' : '_blank', 'noopener')
      return
    }
    setConfirmation(message)
  }

  function salesLink(text: string): string | null {
    if (!landingConfig.salesWhatsapp) return null
    return `https://wa.me/${landingConfig.salesWhatsapp}?text=${encodeURIComponent(text)}`
  }

  function restart() {
    setAnswers({})
    setStep(0)
    setPhase('questions')
    setLead(null)
    setConfirmation(null)
    setContact({ name: '', whatsapp: '', email: '' })
    setConsent(false)
  }

  const progress = phase === 'questions' ? Math.round((step / (questions.length + 1)) * 100) : 100
  const current = questions[step]
  const recommended = lead ? plans.find((p) => p.id === (lead.planInterest ?? lead.recommendedPlan)) ?? null : null

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-ink/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-0 z-[61] flex flex-col bg-white font-landing text-ink outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:inset-4 sm:overflow-hidden sm:rounded-[32px] lg:inset-y-6 lg:left-1/2 lg:right-auto lg:w-[880px] lg:-translate-x-1/2"
          aria-describedby="diagnostic-desc"
        >
          <header className="flex items-center gap-4 border-b border-ink/10 px-5 py-4 sm:px-7">
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="text-[15px] font-semibold tracking-[-0.01em]">Diagnóstico gratuito</DialogPrimitive.Title>
              <p id="diagnostic-desc" className="font-machine text-[10px] uppercase tracking-[0.14em] text-ink/45">
                {phase === 'result' ? 'Resultado' : phase === 'analyzing' ? 'Analisando' : step < CONTACT_STEP ? `Pergunta ${step + 1} de ${questions.length}` : 'Último passo'}
              </p>
            </div>
            {phase === 'questions' && step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-ink/60 hover:bg-neutral-100 hover:text-ink"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
            )}
            <DialogPrimitive.Close className="grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100" aria-label="Fechar diagnóstico">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </header>
          <div className="h-1 bg-neutral-100">
            <motion.div className="h-1 bg-wa" animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-7 sm:px-10">
            {phase === 'questions' && (
              <div className="mx-auto max-w-xl space-y-4">
                <BotLine>
                  Olá! Em 8 perguntas rápidas eu entendo como funciona o atendimento da sua empresa e mostro o que pode ser
                  automatizado.
                  {planInterest && (
                    <span className="mt-1 block text-ink/60">Vi que você se interessou pelo plano {planInterest.name}.</span>
                  )}
                </BotLine>
                {questions.slice(0, step).map((q, i) => (
                  <div key={q.id} className="space-y-4">
                    <BotLine>{q.prompt}</BotLine>
                    <UserLine onEdit={() => setStep(i)}>{q.kind === 'choice' ? optionLabel(q.id, answers[q.id] ?? '') : answers[q.id]}</UserLine>
                  </div>
                ))}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                    className="space-y-4"
                  >
                    {current ? (
                      <BotLine>{current.prompt}</BotLine>
                    ) : (
                      <BotLine>
                        Pronto, {answers.companyName}! Para onde envio o diagnóstico? Seus dados são usados apenas para o
                        contato sobre a plataforma.
                      </BotLine>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div ref={threadEnd} />
              </div>
            )}

            {phase === 'analyzing' && (
              <div className="mx-auto flex max-w-md flex-col items-center py-16 text-center" role="status">
                <Loader2 className="h-8 w-8 animate-spin text-wa-dark" />
                <p className="mt-6 text-xl font-semibold tracking-[-0.02em]">Analisando o atendimento de {answers.companyName}</p>
                <p className="mt-2 text-sm text-ink/55">Cruzando volume de mensagens, equipe e objetivos com os recursos da plataforma.</p>
              </div>
            )}

            {phase === 'result' && lead && (
              <div className="mx-auto max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full bg-wa-soft px-3 py-1.5 font-machine text-[10px] uppercase tracking-[0.14em] text-wa-deep">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lead.diagnosisSource === 'ai' ? 'Análise gerada por IA com base nas suas respostas' : 'Análise com base nas suas respostas'}
                </p>
                <h3 className="mt-5 text-[clamp(1.4rem,3vw,1.9rem)] font-semibold leading-[1.15] tracking-[-0.025em]">
                  {lead.diagnosis.recommendation}
                </h3>
                <p className="mt-3 text-sm text-ink/50">
                  Recomendação baseada nas informações que você enviou. Os resultados dependem da configuração e do volume real
                  de conversas.
                </p>
                <DiagnosisBody diagnosis={lead.diagnosis} />

                {recommended && (
                  <div className="mt-8 rounded-[24px] bg-ink p-6 text-white sm:p-7">
                    <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa">
                      {lead.planInterest ? 'Plano escolhido' : 'Plano mais adequado ao seu perfil'}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.02em]">{recommended.name}</p>
                    <p className="mt-1 text-sm text-white/60">{recommended.description}</p>
                    <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                      {recommended.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-wa" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {confirmation ? (
                  <div role="status" className="mt-6 flex items-start gap-3 rounded-2xl border border-wa/40 bg-wa-soft p-5 text-[15px]">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-wa-deep" />
                    <p>{confirmation}</p>
                  </div>
                ) : (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {recommended && (
                      <button
                        type="button"
                        onClick={() =>
                          convert(
                            'checkout',
                            `Recebemos seu interesse no plano ${recommended.name}. Nossa equipe vai falar com você pelo WhatsApp ${formatPhone(lead.contact.whatsapp.slice(2))} para concluir a contratação.`,
                            recommended.checkoutUrl ?? salesLink(`Olá! Fiz o diagnóstico e quero contratar o plano ${recommended.name} para ${lead.company.name}.`),
                          )
                        }
                        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-wa px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-[#3ee07a] active:scale-[0.98]"
                      >
                        Contratar o plano {recommended.name} <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        convert(
                          'demo',
                          `Pedido de demonstração registrado. Vamos chamar você no WhatsApp ${formatPhone(lead.contact.whatsapp.slice(2))} para combinar o melhor horário.`,
                          salesLink(`Olá! Fiz o diagnóstico da ${lead.company.name} e quero agendar uma demonstração.`),
                        )
                      }
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-ink/15 px-6 text-[15px] font-semibold transition-colors hover:border-ink/50 active:scale-[0.98]"
                    >
                      Solicitar demonstração
                    </button>
                    {landingConfig.trialAvailable && landingConfig.signupUrl && (
                      <button
                        type="button"
                        onClick={() => convert('trial', '', landingConfig.signupUrl)}
                        className="inline-flex h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-white"
                      >
                        Iniciar teste gratuito
                      </button>
                    )}
                    {landingConfig.signupUrl && (
                      <button
                        type="button"
                        onClick={() => convert('signup', '', landingConfig.signupUrl)}
                        className="inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold underline underline-offset-4"
                      >
                        Criar minha conta
                      </button>
                    )}
                  </div>
                )}
                {!delivered && import.meta.env.DEV && (
                  <p className="mt-6 rounded-xl bg-neutral-100 p-3 font-machine text-[11px] text-ink/55">
                    Ambiente local: configure VITE_LEADS_ENDPOINT para enviar leads ao CRM. Este lead foi salvo apenas no navegador.
                  </p>
                )}
                <button type="button" onClick={restart} className="mt-6 text-sm text-ink/50 underline underline-offset-4 hover:text-ink">
                  Refazer o diagnóstico
                </button>
              </div>
            )}
          </div>

          {phase === 'questions' && (
            <footer className="border-t border-ink/10 bg-white px-5 py-4 sm:px-10 sm:py-5">
              <div className="mx-auto max-w-xl">
                {current?.kind === 'choice' && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={current.prompt}>
                    {current.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => answer(step, option.value)}
                        className={cn(
                          'rounded-full border px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa-dark active:scale-[0.97]',
                          answers[current.id] === option.value
                            ? 'border-ink bg-ink text-white'
                            : 'border-ink/15 hover:border-ink hover:bg-ink hover:text-white',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}

                {current?.kind === 'text' && (
                  <form onSubmit={submitText} noValidate>
                    <div className="flex gap-2">
                      <label htmlFor="diag-text" className="sr-only">
                        {current.prompt}
                      </label>
                      <input
                        id="diag-text"
                        autoFocus
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        placeholder={current.placeholder}
                        maxLength={120}
                        aria-invalid={Boolean(textError)}
                        aria-describedby={textError ? 'diag-text-error' : undefined}
                        className="h-12 flex-1 rounded-full border border-ink/15 px-5 text-[15px] outline-none focus:border-ink"
                      />
                      <button type="submit" aria-label="Enviar resposta" className="grid h-12 w-12 place-items-center rounded-full bg-wa text-ink hover:bg-[#3ee07a]">
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                    {textError && (
                      <p id="diag-text-error" className="mt-2 px-2 text-sm text-red-600">
                        {textError}
                      </p>
                    )}
                  </form>
                )}

                {!current && (
                  <form onSubmit={submitContact} noValidate className="grid gap-3 sm:grid-cols-2">
                    <Field id="c-name" label="Seu nome" error={errors.name} className="sm:col-span-2">
                      <input
                        id="c-name"
                        autoComplete="name"
                        value={contact.name}
                        onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                        className={inputClass(errors.name)}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'c-name-error' : undefined}
                      />
                    </Field>
                    <Field id="c-whatsapp" label="WhatsApp" error={errors.whatsapp}>
                      <input
                        id="c-whatsapp"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        placeholder="(11) 99999-9999"
                        value={contact.whatsapp}
                        onChange={(e) => setContact((c) => ({ ...c, whatsapp: formatPhone(e.target.value) }))}
                        className={inputClass(errors.whatsapp)}
                        aria-invalid={Boolean(errors.whatsapp)}
                        aria-describedby={errors.whatsapp ? 'c-whatsapp-error' : undefined}
                      />
                    </Field>
                    <Field id="c-email" label="E-mail" error={errors.email}>
                      <input
                        id="c-email"
                        type="email"
                        autoComplete="email"
                        placeholder="nome@empresa.com"
                        value={contact.email}
                        onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                        className={inputClass(errors.email)}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'c-email-error' : undefined}
                      />
                    </Field>
                    <input
                      tabIndex={-1}
                      autoComplete="off"
                      aria-hidden
                      name="website"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      className="absolute -left-[9999px] h-0 w-0 opacity-0"
                    />
                    <div className="sm:col-span-2">
                      <label className="flex items-start gap-3 text-sm text-ink/70">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#128C7E]"
                          aria-invalid={Boolean(errors.consent)}
                        />
                        <span>
                          Autorizo o contato pelo WhatsApp e e-mail sobre o diagnóstico e concordo com a{' '}
                          <a href="/privacidade" target="_blank" className="underline underline-offset-2">
                            Política de Privacidade
                          </a>
                          .
                        </span>
                      </label>
                      {errors.consent && <p className="mt-1.5 text-sm text-red-600">{errors.consent}</p>}
                    </div>
                    <button
                      type="submit"
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-wa px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-[#3ee07a] active:scale-[0.98] sm:col-span-2"
                    >
                      Ver meu diagnóstico <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                )}
              </div>
            </footer>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

function inputClass(error?: string) {
  return cn(
    'h-12 w-full rounded-2xl border px-4 text-[15px] outline-none transition-colors focus:border-ink',
    error ? 'border-red-400' : 'border-ink/15',
  )
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}

function DiagnosisBody({ diagnosis }: { diagnosis: Diagnosis }) {
  const blocks = [
    { title: 'Principais dificuldades', items: diagnosis.painPoints },
    { title: 'Oportunidades de automação', items: diagnosis.opportunities },
    { title: 'Processos que podem ser automatizados', items: diagnosis.automatableProcesses },
    { title: 'Recursos mais adequados', items: diagnosis.recommendedFeatures },
  ]
  return (
    <div className="mt-8">
      <div className="rounded-2xl bg-neutral-100 p-5">
        <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-ink/45">Situação atual</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">{diagnosis.currentSituation}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-2xl border border-ink/10 p-5">
            <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa-dark">{block.title}</p>
            <ul className="mt-3 space-y-2">
              {block.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-ink/80">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-ink/40" /> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
