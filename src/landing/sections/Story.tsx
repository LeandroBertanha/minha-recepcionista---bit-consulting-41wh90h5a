import { motion, useReducedMotion } from 'motion/react'
import {
  ArrowRight,
  ArrowUpRight,
  CalendarCheck,
  Camera,
  Check,
  Inbox,
  MessageSquareText,
  MoreVertical,
  Pointer,
  RotateCcw,
  Search,
  ShoppingBag,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pillars, problems, segments } from '../content'
import { PrismCard } from '../components/PrismCard'
import { Eyebrow, Human, SectionTitle } from '../components/SectionHeading'
import { useDiagnostic } from '../diagnostic/DiagnosticContext'

const missed = [
  { name: 'Juliana', time: '22:14', text: 'Ainda tem horário amanhã?', unread: 1 },
  { name: 'Marcos', time: '23:02', text: 'Qual o valor do plano?', unread: 2 },
  { name: 'Fernanda', time: '06:40', text: 'Vocês entregam no meu bairro?', unread: 1 },
  { name: 'Roberto', time: '12:31', text: 'Alguém pode me responder?', unread: 4 },
]

const chatFilters = ['Tudo', 'Não lidas', 'Favoritas', 'Grupos']

function DefaultAvatar() {
  return (
    <span className="relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#DFE5E7]" aria-hidden>
      <svg viewBox="0 0 48 48" className="h-12 w-12 fill-white">
        <circle cx="24" cy="19" r="8.5" />
        <path d="M8 44c1.5-9 8-14 16-14s14.5 5 16 14z" />
      </svg>
    </span>
  )
}

function WhatsAppInbox() {
  const reduceMotion = useReducedMotion()
  const totalUnread = missed.reduce((sum, m) => sum + m.unread, 0)
  return (
    <div className="overflow-hidden rounded-[32px] border border-ink/10 bg-white shadow-[0_30px_60px_-30px_rgba(10,10,10,0.25)]">
      <div className="px-5 pb-3 pt-5 sm:px-6">
        <div className="flex items-center justify-between">
          <p className="font-landing text-[22px] font-bold tracking-[-0.02em] text-[#1DAA61]">WhatsApp</p>
          <div className="flex items-center gap-4 text-ink/70" aria-hidden>
            <Camera className="h-5 w-5" />
            <MoreVertical className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex h-10 items-center gap-3 rounded-full bg-[#F0F2F5] px-4 text-sm text-ink/45">
          <Search className="h-4 w-4" aria-hidden />
          Pesquisar
        </div>
        <ul className="mt-3 flex gap-2 overflow-hidden" aria-hidden>
          {chatFilters.map((filter) => {
            const active = filter === 'Não lidas'
            return (
              <li
                key={filter}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-[13px]',
                  active ? 'bg-[#D9FDD3] font-medium text-[#0A5C36]' : 'bg-[#F0F2F5] text-ink/60',
                )}
              >
                {filter}
                {active && <span className="ml-1">{totalUnread}</span>}
              </li>
            )
          })}
        </ul>
      </div>
      <ul aria-label="Mensagens sem resposta">
        {missed.map((m, i) => (
          <motion.li
            key={m.name}
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ delay: i * 0.12, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3.5 px-5 sm:px-6"
          >
            <DefaultAvatar />
            <div className="min-w-0 flex-1 border-b border-ink/[0.07] py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="truncate text-[16px] font-semibold text-ink">{m.name}</p>
                <p className="shrink-0 text-xs font-medium text-[#1DAA61]">{m.time}</p>
              </div>
              <div className="mt-0.5 flex items-center justify-between gap-3">
                <p className="truncate text-[14px] text-ink/60">{m.text}</p>
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-[#25D366] px-1.5 text-[11px] font-semibold text-white">
                  <span className="sr-only">Mensagens não lidas: </span>
                  {m.unread}
                </span>
              </div>
            </div>
          </motion.li>
        ))}
      </ul>
      <p className="flex items-center justify-center gap-2 px-5 py-4 text-[12px] text-ink/45">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />
        {totalUnread} mensagens esperando resposta
      </p>
    </div>
  )
}

export function Problem() {
  return (
    <section id="problema" className="bg-white py-24 text-ink sm:py-32">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 sm:px-8 lg:grid-cols-[1fr_0.9fr] lg:gap-20 [&>*]:min-w-0">
        <div>
          <Eyebrow>O problema</Eyebrow>
          <SectionTitle className="mt-4 max-w-2xl">
            Quantas oportunidades sua empresa está perdendo por{' '}
            <Human className="text-wa-dark">não responder seus clientes a tempo?</Human>
          </SectionTitle>
          <ol className="mt-12 divide-y divide-ink/10 border-y border-ink/10">
            {problems.map((p, i) => (
              <li key={p.title} className="grid grid-cols-[2.5rem_1fr] gap-4 py-4 sm:grid-cols-[2.5rem_14rem_1fr]">
                <span className="font-machine text-xs leading-6 text-ink/35">{String(i + 1).padStart(2, '0')}</span>
                <p className="font-landing text-[15px] font-semibold leading-6">{p.title}</p>
                <p className="col-start-2 text-[15px] leading-6 text-ink/60 sm:col-start-3">{p.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="relative flex flex-col lg:sticky lg:top-28 lg:self-start lg:pt-24">
          <WhatsAppInbox />
          <p className="mt-10 font-human text-[clamp(1.8rem,3.2vw,2.6rem)] italic leading-[1.1] tracking-[-0.01em]">
            Enquanto você está ocupado, seus clientes continuam querendo comprar.
          </p>
        </div>
      </div>
    </section>
  )
}

const pillarIcons = { atendimento: MessageSquareText, vendas: ShoppingBag, agendamentos: CalendarCheck, gestao: Inbox }

export function Solution() {
  return (
    <section id="solucao" className="bg-white pb-24 text-ink sm:pb-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-6 border-t border-ink/10 pt-16 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>A solução</Eyebrow>
            <SectionTitle className="mt-4 max-w-3xl">
              Conheça uma nova maneira de <Human className="text-wa-dark">atender e vender</Human> pelo WhatsApp.
            </SectionTitle>
          </div>
          <p className="max-w-sm text-[15px] leading-relaxed text-ink/60">
            Uma central inteligente que automatiza o relacionamento com seus clientes, do primeiro “oi” até o atendimento
            resolvido.
          </p>
        </div>
        <div className="mt-14 grid gap-3 md:grid-cols-2">
          {pillars.map((pillar, i) => {
            const Icon = pillarIcons[pillar.id as keyof typeof pillarIcons]
            const dark = i === 0
            return (
              <article
                key={pillar.id}
                className={cn(
                  'flex flex-col rounded-[28px] p-7 sm:p-9',
                  dark ? 'bg-ink text-white' : 'border border-ink/10 bg-white',
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn('grid h-11 w-11 place-items-center rounded-full', dark ? 'bg-wa text-ink' : 'bg-wa-soft text-wa-deep')}>
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className={cn('font-machine text-xs', dark ? 'text-white/40' : 'text-ink/35')}>0{i + 1}</span>
                </div>
                <h3 className="mt-10 font-landing text-2xl font-semibold tracking-[-0.025em]">{pillar.title}</h3>
                <p className={cn('mt-3 max-w-md text-[15px] leading-relaxed', dark ? 'text-white/65' : 'text-ink/60')}>{pillar.text}</p>
                <ul className="mt-7 space-y-2">
                  {pillar.points.map((point) => (
                    <li key={point} className="flex items-start gap-2.5 text-sm">
                      <Check className={cn('mt-0.5 h-4 w-4 shrink-0', dark ? 'text-wa' : 'text-wa-dark')} aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}

type Segment = (typeof segments)[number]

const backTones = [
  { surface: 'bg-wa text-ink', muted: 'text-ink/60', bubble: 'bg-white text-ink' },
  { surface: 'bg-ink text-white', muted: 'text-white/50', bubble: 'bg-wa-bubble text-ink' },
  { surface: 'bg-white text-ink', muted: 'text-ink/45', bubble: 'bg-wa-bubble text-ink' },
]

function SegmentFront({ segment, index }: { segment: Segment; index: number }) {
  return (
    <div className="absolute inset-0 bg-ink text-white">
      <img src={segment.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" decoding="async" draggable={false} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.35)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0)_45%,rgba(0,0,0,0.78)_100%)]" />
      <div className="relative flex h-full flex-col justify-between p-6">
        <div className="flex items-start justify-between">
          <span className="font-machine text-xs text-white/85">{String(index + 1).padStart(2, '0')}</span>
          <span className="hidden h-8 w-8 place-items-center rounded-full bg-white text-ink [@media(hover:hover)]:grid">
            <ArrowUpRight className="h-4 w-4" />
          </span>
          <span className="hidden items-center gap-2 rounded-full bg-white py-1.5 pl-2.5 pr-3 font-landing text-[12px] font-semibold text-ink shadow-lg [@media(hover:none)]:inline-flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inset-0 animate-ping rounded-full bg-wa opacity-75 motion-reduce:animate-none" />
              <span className="relative h-2 w-2 rounded-full bg-wa" />
            </span>
            Toque para ver
            <Pointer className="h-3.5 w-3.5" />
          </span>
        </div>
        <div>
          <p className="font-machine text-[10px] uppercase tracking-[0.16em] text-wa">{segment.focus}</p>
          <p className="mt-2 font-landing text-[clamp(1.5rem,2.4vw,1.9rem)] font-semibold leading-[1.05] tracking-[-0.03em]">
            {segment.title}
          </p>
        </div>
      </div>
    </div>
  )
}

function SegmentBack({ segment, index }: { segment: Segment; index: number }) {
  const tone = backTones[index % backTones.length]
  return (
    <div className={cn('absolute inset-0 flex flex-col justify-between p-6', tone.surface)}>
      <div className="flex items-start justify-between gap-4">
        <span className={cn('font-machine text-xs', tone.muted)}>{String(index + 1).padStart(2, '0')}</span>
        <span className={cn('text-right font-machine text-[10px] uppercase tracking-[0.16em]', tone.muted)}>{segment.title}</span>
      </div>
      <div>
        <p className="font-human text-[clamp(2.6rem,4.4vw,3.6rem)] italic leading-none tracking-[-0.01em]">Na prática</p>
        <p className={cn('mt-5 rounded-2xl rounded-tl-md p-4 text-[15px] leading-relaxed shadow-sm', tone.bubble)}>{segment.example}</p>
        <p className={cn('mt-3 hidden items-center gap-1.5 font-machine text-[10px] uppercase tracking-[0.14em] [@media(hover:none)]:flex', tone.muted)}>
          <RotateCcw className="h-3 w-3" />
          Toque para voltar
        </p>
      </div>
    </div>
  )
}

export function Segments() {
  const { open } = useDiagnostic()
  return (
    <section id="segmentos" className="bg-neutral-100 py-24 text-ink sm:py-32">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <Eyebrow>Segmentos</Eyebrow>
            <SectionTitle className="mt-4">
              Uma plataforma. <Human className="text-wa-dark">Diversos tipos de negócios.</Human>
            </SectionTitle>
          </div>
          <button
            type="button"
            onClick={() => open({ origin: 'segments' })}
            className="group inline-flex items-center gap-2 self-start font-landing text-sm font-semibold underline decoration-ink/20 underline-offset-4 hover:decoration-ink lg:self-auto"
          >
            Ver o que automatizar no meu negócio
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </button>
        </div>
        <ul className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {segments.map((segment, i) => (
            <li key={segment.id}>
              <PrismCard
                label={segment.title}
                front={<SegmentFront segment={segment} index={i} />}
                back={<SegmentBack segment={segment} index={i} />}
              />
              <div className="sr-only">
                <h3>{segment.title}</h3>
                <p>{segment.focus}</p>
                <p>Na prática: {segment.example}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
