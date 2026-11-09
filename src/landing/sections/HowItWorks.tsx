import { useRef, useState } from 'react'
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { scenarios, steps, type ChatMessage } from '../content'
import { Bubble, PhoneFrame } from '../components/Phone'

const SEGMENT = 1 / scenarios.length

function ScrollBubble({
  message,
  index,
  total,
  local,
}: {
  message: ChatMessage
  index: number
  total: number
  local: MotionValue<number>
}) {
  const start = 0.01 + (index / (total + 1)) * 0.78
  const end = start + 0.12
  const opacity = useTransform(local, [start, end], [0, 1])
  const z = useTransform(local, [start, end + 0.05], [140, 24])
  const y = useTransform(local, [start, end], [26, 0])
  const scale = useTransform(local, [start, end], [0.86, 1])
  return (
    <motion.div
      style={{ opacity, z, y, scale, transformStyle: 'preserve-3d' }}
      className="origin-bottom"
    >
      <Bubble message={message} className="drop-shadow-[0_14px_18px_rgba(0,0,0,0.18)]" />
    </motion.div>
  )
}

function ScenarioScreen({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const scenario = scenarios[index]
  const local = useTransform(progress, (p) =>
    Math.min(Math.max((p - index * SEGMENT) / SEGMENT, 0), 1),
  )
  const outcomeOpacity = useTransform(local, [0.82, 0.92], [0, 1])
  const outcomeZ = useTransform(local, [0.82, 0.95], [140, 20])
  return (
    <div
      className="absolute inset-0 flex flex-col justify-end gap-2 px-2.5 pb-3"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {scenario.messages.map((m, i) => (
        <ScrollBubble
          key={i}
          message={m}
          index={i}
          total={scenario.messages.length}
          local={local}
        />
      ))}
      <motion.div
        style={{ opacity: outcomeOpacity, z: outcomeZ }}
        className="mx-auto mt-1 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 font-machine text-[10px] uppercase tracking-[0.1em] text-wa shadow-xl"
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        {scenario.outcome}
      </motion.div>
    </div>
  )
}

function StaticScenario({ index }: { index: number }) {
  const scenario = scenarios[index]
  return (
    <div className="absolute inset-0 flex flex-col justify-end gap-2 px-2.5 pb-3">
      {scenario.messages.map((m, i) => (
        <Bubble key={i} message={m} />
      ))}
      <p className="mx-auto mt-1 whitespace-nowrap rounded-full bg-ink px-3 py-1.5 font-machine text-[10px] uppercase tracking-[0.12em] text-wa">
        {scenario.outcome}
      </p>
    </div>
  )
}

export function HowItWorks() {
  const sectionRef = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end end'] })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 28, mass: 0.4 })

  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    const next = Math.min(scenarios.length - 1, Math.floor(p / SEGMENT))
    setActive((current) => (current === next ? current : next))
  })

  const rotateY = useTransform(progress, [0, 0.25, 0.5, 0.75, 1], [-24, 10, -12, 14, -6])
  const rotateX = useTransform(progress, [0, 0.5, 1], [14, -4, 8])
  const rotateZ = useTransform(progress, [0, 0.5, 1], [-3, 2, -1])
  const phoneY = useTransform(progress, [0, 1], [40, -20])
  const glowScale = useTransform(progress, [0, 0.5, 1], [0.8, 1.15, 0.95])
  const bar = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  function goTo(index: number) {
    const section = sectionRef.current
    if (!section) return
    if (reduceMotion) {
      setActive(index)
      return
    }
    const top = section.getBoundingClientRect().top + window.scrollY
    const travel = section.offsetHeight - window.innerHeight
    window.scrollTo({ top: top + travel * (index * SEGMENT + SEGMENT * 0.6), behavior: 'smooth' })
  }

  return (
    <section
      id="como-funciona"
      ref={sectionRef}
      className={cn(
        'relative overflow-x-clip bg-ink text-white',
        reduceMotion ? 'py-24' : 'h-[420vh]',
      )}
      aria-label="Como funciona"
    >
      <div
        className={cn(
          'mx-auto max-w-7xl px-5 sm:px-8',
          !reduceMotion && 'sticky top-0 flex h-screen items-center',
        )}
      >
        <div className="grid w-full items-center gap-10 lg:grid-cols-[1fr_auto_0.8fr] lg:gap-14">
          <div className="max-w-xl">
            <p className="font-machine text-[11px] uppercase tracking-[0.18em] text-wa">
              Como funciona
            </p>
            <h2 className="mt-4 font-landing text-[clamp(2rem,4.6vw,3.6rem)] font-semibold leading-[1.02] tracking-[-0.035em]">
              Da primeira mensagem até a conversão.{' '}
              <span className="font-human text-[1.08em] font-normal italic tracking-[-0.01em] text-wa">
                Tudo automatizado.
              </span>
            </h2>
            <ol className="mt-8 hidden space-y-5 sm:block">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-4">
                  <span className="font-machine text-xs text-white/40">0{i + 1}</span>
                  <div>
                    <p className="font-landing text-[15px] font-semibold">{step.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-white/60">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div
            className="relative mx-auto -my-16 scale-[0.78] sm:my-0 sm:scale-100"
            style={{ perspective: 1400 }}
          >
            <motion.div
              aria-hidden
              style={{ scale: reduceMotion ? 1 : glowScale }}
              className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-wa/25 blur-[90px]"
            />
            <motion.div
              style={
                reduceMotion
                  ? undefined
                  : { rotateY, rotateX, rotateZ, y: phoneY, transformStyle: 'preserve-3d' }
              }
              className="relative"
            >
              <PhoneFrame contactName={scenarios[active].contactName}>
                <div className="absolute inset-0" style={{ perspective: 700 }}>
                  {reduceMotion ? (
                    <StaticScenario index={active} />
                  ) : (
                    scenarios.map((_, i) => (
                      <div
                        key={scenarios[i].id}
                        className={cn(
                          'absolute inset-0 transition-opacity duration-200',
                          i === active ? 'opacity-100' : 'opacity-0',
                        )}
                        style={{ transformStyle: 'preserve-3d' }}
                        aria-hidden={i !== active}
                      >
                        <ScenarioScreen index={i} progress={progress} />
                      </div>
                    ))
                  )}
                </div>
              </PhoneFrame>
              {!reduceMotion && (
                <>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-40 bottom-28 hidden rounded-2xl border border-white/15 bg-ink px-3.5 py-2.5 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.6)] sm:block"
                    style={{ transform: 'translateZ(60px)' }}
                  >
                    <p className="font-machine text-[9.5px] uppercase tracking-[0.14em] text-white/40">
                      Intenção detectada
                    </p>
                    <p className="mt-0.5 font-landing text-sm font-semibold text-white">
                      {scenarios[active].label}
                    </p>
                  </div>
                  <div
                    aria-hidden
                    className="pointer-events-none absolute -right-16 top-24 hidden items-center gap-2 rounded-full bg-wa px-3.5 py-2 font-machine text-[10px] uppercase tracking-[0.14em] text-ink shadow-[0_20px_40px_-10px_rgba(37,211,102,0.5)] sm:flex"
                    style={{ transform: 'translateZ(180px)' }}
                  >
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-ink" />
                    IA ativa 24h
                  </div>
                </>
              )}
            </motion.div>
          </div>

          <div className="lg:justify-self-end">
            <p className="font-machine text-[11px] uppercase tracking-[0.18em] text-white/40">
              Situações reais
            </p>
            <div
              role="tablist"
              aria-label="Cenários de atendimento"
              className="mt-4 flex flex-wrap gap-2 lg:flex-col lg:items-stretch"
            >
              {scenarios.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  onClick={() => goTo(i)}
                  className={cn(
                    'flex items-center justify-between gap-6 rounded-full border px-4 py-2.5 text-left font-landing text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa lg:rounded-2xl lg:py-3.5',
                    i === active
                      ? 'border-wa bg-wa text-ink'
                      : 'border-white/15 text-white/70 hover:border-white/40 hover:text-white',
                  )}
                >
                  <span className="font-semibold">Cliente: {s.label.toLowerCase()}</span>
                  <span
                    className={cn(
                      'hidden font-machine text-[10px] lg:inline',
                      i === active ? 'text-ink/60' : 'text-white/30',
                    )}
                  >
                    0{i + 1}
                  </span>
                </button>
              ))}
            </div>
            {!reduceMotion && (
              <div className="mt-6 hidden h-px w-full bg-white/10 lg:block">
                <motion.div style={{ width: bar }} className="h-px bg-wa" />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
