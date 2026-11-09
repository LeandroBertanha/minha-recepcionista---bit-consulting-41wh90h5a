import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, Check, CheckCheck, Lock, Send, Sparkles, X } from 'lucide-react'
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

const WALLPAPER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" fill="none" stroke="#54656F" stroke-opacity=".09" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22h26a6 6 0 0 1 6 6v14a6 6 0 0 1-6 6H30l-8 7v-7h-4a6 6 0 0 1-6-6V28a6 6 0 0 1 6-6z"/><circle cx="118" cy="34" r="12"/><path d="M112 34l4 4 8-8"/><path d="M84 92c-6-7-18-2-14 8 3 6 14 13 14 13s11-7 14-13c4-10-8-15-14-8z"/><rect x="20" y="96" width="22" height="38" rx="5"/><path d="M28 128h6"/><path d="M128 104l3 7 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/><path d="M70 30l6 6m0-6-6 6"/><circle cx="140" cy="150" r="3"/><circle cx="60" cy="150" r="2"/></svg>`
const WALLPAPER = `url("data:image/svg+xml,${encodeURIComponent(WALLPAPER_SVG)}")`

const bubbleShadow = 'shadow-[0_1px_0.5px_rgba(11,20,26,0.13)]'

function Tail({ side }: { side: 'in' | 'out' }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 8 13"
      width="8"
      height="13"
      className={cn('absolute top-0', side === 'in' ? '-left-2 text-white' : '-right-2 text-wa-bubble')}
    >
      <path
        fill="currentColor"
        d={side === 'in' ? 'M1.533 3.568 8 12.193V1H2.812C1.042 1 .474 2.156 1.533 3.568z' : 'M5.188 1H0v11.193l6.467-8.625C7.526 2.156 6.958 1 5.188 1z'}
      />
    </svg>
  )
}

function MessageTime({ time, read }: { time: string; read?: boolean }) {
  return (
    <span className="float-right ml-3 mt-1.5 inline-flex translate-y-1 items-center gap-1 text-[11px] leading-none text-wa-meta">
      {time}
      {read && <CheckCheck className="h-4 w-4 text-wa-read" aria-label="Lida" />}
    </span>
  )
}

function BotLine({ children, time, tail = true }: { children: React.ReactNode; time: string; tail?: boolean }) {
  return (
    <div className={cn('flex', tail ? 'mt-3' : 'mt-0.5')}>
      <div
        className={cn(
          'relative max-w-[85%] rounded-lg bg-white px-2.5 pb-2 pt-1.5 text-[14.5px] leading-[1.4] text-wa-text',
          bubbleShadow,
          tail && 'rounded-tl-none',
        )}
      >
        {tail && <Tail side="in" />}
        {children}
        <MessageTime time={time} />
      </div>
    </div>
  )
}

function UserLine({ children, time, onEdit }: { children: React.ReactNode; time: string; onEdit?: () => void }) {
  return (
    <div className="mt-3 flex justify-end">
      <button
        type="button"
        onClick={onEdit}
        title="Alterar resposta"
        className={cn(
          'relative max-w-[85%] rounded-lg rounded-tr-none bg-wa-bubble px-2.5 pb-2 pt-1.5 text-left text-[14.5px] leading-[1.4] text-wa-text transition-[filter] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa-action',
          bubbleShadow,
        )}
      >
        <Tail side="out" />
        {children}
        <MessageTime time={time} read />
      </button>
    </div>
  )
}

function SystemChip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-fit max-w-[90%] rounded-lg px-3 py-1.5 text-center text-[12.5px] leading-snug', bubbleShadow, className)}>
      {children}
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="mt-3 flex">
      <div className={cn('relative flex items-center gap-1 rounded-lg rounded-tl-none bg-white px-4 py-3.5', bubbleShadow)}>
        <Tail side="in" />
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2 w-2 rounded-full bg-wa-meta/70 motion-safe:animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
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
  const [time] = useState(() => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))

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
          className="fixed inset-0 z-[61] flex flex-col bg-wa-chat font-landing text-wa-text outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4 sm:inset-4 sm:overflow-hidden sm:rounded-[20px] lg:inset-y-6 lg:left-1/2 lg:right-auto lg:w-[880px] lg:-translate-x-1/2"
          aria-describedby="diagnostic-desc"
        >
          <header className="relative flex items-center gap-3 bg-wa-header px-3 py-2.5 text-white sm:px-5">
            {phase === 'questions' && step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                aria-label="Voltar para a pergunta anterior"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white">
              <img src="/landing/logo-mark-ink.png" alt="" width={28} height={28} className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="truncate text-[16px] font-semibold leading-tight">Minha Recepcionista</DialogPrimitive.Title>
              <p id="diagnostic-desc" className="truncate text-[13px] leading-tight text-white/80">
                {phase === 'result'
                  ? 'Diagnóstico pronto'
                  : phase === 'analyzing'
                    ? 'digitando…'
                    : step < CONTACT_STEP
                      ? `Diagnóstico gratuito · pergunta ${step + 1} de ${questions.length}`
                      : 'Diagnóstico gratuito · último passo'}
              </p>
            </div>
            <DialogPrimitive.Close
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/90 transition-colors hover:bg-white/10"
              aria-label="Fechar diagnóstico"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-black/15">
              <motion.div className="h-full bg-wa" animate={{ width: `${progress}%` }} transition={{ duration: 0.3, ease: 'easeOut' }} />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-10" style={{ backgroundImage: WALLPAPER }}>
            {phase === 'questions' && (
              <div className="mx-auto max-w-xl">
                <SystemChip className="bg-white text-[11.5px] font-medium uppercase tracking-wide text-wa-icon">Hoje</SystemChip>
                <SystemChip className="mt-3 bg-wa-notice text-wa-icon">
                  <Lock className="mr-1 inline h-3 w-3 -translate-y-px" aria-hidden />
                  Suas respostas são usadas apenas para gerar este diagnóstico.
                </SystemChip>
                <BotLine time={time}>
                  Olá! Em 8 perguntas rápidas eu entendo como funciona o atendimento da sua empresa e mostro o que pode ser
                  automatizado.
                  {planInterest && (
                    <span className="mt-1 block text-wa-icon">Vi que você se interessou pelo plano {planInterest.name}.</span>
                  )}
                </BotLine>
                {questions.slice(0, step).map((q, i) => (
                  <div key={q.id}>
                    <BotLine time={time} tail={i !== 0}>
                      {q.prompt}
                    </BotLine>
                    <UserLine time={time} onEdit={() => setStep(i)}>
                      {q.kind === 'choice' ? optionLabel(q.id, answers[q.id] ?? '') : answers[q.id]}
                    </UserLine>
                  </div>
                ))}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  >
                    {current ? (
                      <BotLine time={time} tail={step !== 0}>
                        {current.prompt}
                      </BotLine>
                    ) : (
                      <BotLine time={time}>
                        Pronto, {answers.companyName}! Para onde envio o diagnóstico? Seus dados são usados apenas para o
                        contato sobre a plataforma.
                      </BotLine>
                    )}
                  </motion.div>
                </AnimatePresence>
                <div ref={threadEnd} className="h-2" />
              </div>
            )}

            {phase === 'analyzing' && (
              <div className="mx-auto max-w-xl" role="status">
                <SystemChip className="bg-white text-wa-icon">
                  <span className="block font-medium text-wa-text">Analisando o atendimento de {answers.companyName}</span>
                  Cruzando volume de mensagens, equipe e objetivos com os recursos da plataforma.
                </SystemChip>
                <TypingBubble />
              </div>
            )}

            {phase === 'result' && lead && (
              <div className={cn('mx-auto max-w-2xl rounded-xl bg-white p-5 sm:p-7', bubbleShadow)}>
                <p className="inline-flex items-center gap-2 rounded-full bg-wa-soft px-3 py-1.5 font-machine text-[10px] uppercase tracking-[0.14em] text-wa-deep">
                  <Sparkles className="h-3.5 w-3.5" />
                  {lead.diagnosisSource === 'ai' ? 'Análise gerada por IA com base nas suas respostas' : 'Análise com base nas suas respostas'}
                </p>
                <h3 className="mt-5 text-[clamp(1.4rem,3vw,1.9rem)] font-semibold leading-[1.15] tracking-[-0.025em]">
                  {lead.diagnosis.recommendation}
                </h3>
                <p className="mt-3 text-sm text-wa-meta">
                  Recomendação baseada nas informações que você enviou. Os resultados dependem da configuração e do volume real
                  de conversas.
                </p>
                <DiagnosisBody diagnosis={lead.diagnosis} />

                {recommended && (
                  <div className="mt-8 rounded-xl bg-wa-deep p-6 text-white sm:p-7">
                    <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa-bubble">
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
                  <div role="status" className="mt-6 flex items-start gap-3 rounded-xl bg-wa-bubble p-5 text-[15px]">
                    <CheckCheck className="mt-0.5 h-5 w-5 shrink-0 text-wa-read" />
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
                        className="inline-flex h-14 items-center justify-center gap-2 rounded-full bg-wa-action px-6 text-[15px] font-semibold text-white transition-colors hover:bg-wa-action-hover active:scale-[0.98]"
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
                      className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-wa-action px-6 text-[15px] font-semibold text-wa-header transition-colors hover:bg-wa-panel active:scale-[0.98]"
                    >
                      Solicitar demonstração
                    </button>
                    {landingConfig.trialAvailable && landingConfig.signupUrl && (
                      <button
                        type="button"
                        onClick={() => convert('trial', '', landingConfig.signupUrl)}
                        className="inline-flex h-12 items-center justify-center rounded-full bg-wa-deep px-6 text-sm font-semibold text-white"
                      >
                        Iniciar teste gratuito
                      </button>
                    )}
                    {landingConfig.signupUrl && (
                      <button
                        type="button"
                        onClick={() => convert('signup', '', landingConfig.signupUrl)}
                        className="inline-flex h-12 items-center justify-center rounded-full text-sm font-semibold text-wa-header underline underline-offset-4"
                      >
                        Criar minha conta
                      </button>
                    )}
                  </div>
                )}
                {!delivered && import.meta.env.DEV && (
                  <p className="mt-6 rounded-lg bg-wa-notice p-3 font-machine text-[11px] text-wa-icon">
                    Ambiente local: configure VITE_LEADS_ENDPOINT para enviar leads ao CRM. Este lead foi salvo apenas no navegador.
                  </p>
                )}
                <button type="button" onClick={restart} className="mt-6 text-sm text-wa-meta underline underline-offset-4 hover:text-wa-text">
                  Refazer o diagnóstico
                </button>
              </div>
            )}
          </div>

          {phase === 'questions' && (
            <footer className="bg-wa-panel px-3 py-3 sm:px-10 sm:py-4">
              <div className="mx-auto max-w-xl">
                {current?.kind === 'choice' && (
                  <div className="flex flex-wrap gap-2" role="group" aria-label={current.prompt}>
                    {current.options.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => answer(step, option.value)}
                        className={cn(
                          'rounded-full px-4 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa-action active:scale-[0.97]',
                          bubbleShadow,
                          answers[current.id] === option.value
                            ? 'bg-wa-header text-white'
                            : 'bg-white text-wa-header hover:bg-wa-soft',
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
                        className="h-11 flex-1 rounded-full border border-transparent bg-white px-5 text-[15px] text-wa-text outline-none placeholder:text-wa-meta focus:border-wa-action"
                      />
                      <button
                        type="submit"
                        aria-label="Enviar resposta"
                        className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-wa-action text-white transition-colors hover:bg-wa-action-hover"
                      >
                        <Send className="h-[18px] w-[18px] translate-x-px" />
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
                      <label className="flex items-start gap-3 text-sm text-wa-icon">
                        <input
                          type="checkbox"
                          checked={consent}
                          onChange={(e) => setConsent(e.target.checked)}
                          className="mt-0.5 h-4 w-4 accent-[#00A884]"
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
                      className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-wa-action px-6 text-[15px] font-semibold text-white transition-colors hover:bg-wa-action-hover active:scale-[0.98] sm:col-span-2"
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
    'h-11 w-full rounded-lg border bg-white px-4 text-[15px] text-wa-text outline-none transition-colors placeholder:text-wa-meta focus:border-wa-action',
    error ? 'border-red-400' : 'border-transparent',
  )
}

function Field({ id, label, error, className, children }: { id: string; label: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-wa-icon">
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
      <div className="rounded-xl bg-wa-panel p-5">
        <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa-meta">Situação atual</p>
        <p className="mt-1.5 text-[15px] leading-relaxed">{diagnosis.currentSituation}</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {blocks.map((block) => (
          <div key={block.title} className="rounded-xl border border-[#E9EDEF] p-5">
            <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa-header">{block.title}</p>
            <ul className="mt-3 space-y-2">
              {block.items.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-wa-text/85">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-wa-action" /> {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
