import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { CalendarCheck, LayoutGrid, MessageSquareText, ShoppingBag } from 'lucide-react'
import { heroConversation } from '../content'
import { Bubble, TypingBubble } from '../components/Phone'
import { CtaButton } from '../components/CtaButton'
import { HeroReveal } from '../components/HeroReveal'
import { useDiagnostic } from '../diagnostic/DiagnosticContext'

const highlights = [
  { icon: MessageSquareText, label: 'Atendimento automatizado' },
  { icon: ShoppingBag, label: 'Vendas pelo WhatsApp' },
  { icon: CalendarCheck, label: 'Agendamentos inteligentes' },
  { icon: LayoutGrid, label: 'Gestão centralizada' },
]

function HeroChat() {
  const reduceMotion = useReducedMotion()
  const [count, setCount] = useState(reduceMotion ? heroConversation.length : 1)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    if (reduceMotion) return
    if (count >= heroConversation.length) {
      const reset = window.setTimeout(() => setCount(1), 5200)
      return () => window.clearTimeout(reset)
    }
    const next = heroConversation[count]
    const isBot = next.from !== 'client'
    const typingTimer = isBot ? window.setTimeout(() => setTyping(true), 500) : undefined
    const showTimer = window.setTimeout(
      () => {
        setTyping(false)
        setCount((c) => c + 1)
      },
      isBot ? 1900 : 1300,
    )
    return () => {
      window.clearTimeout(typingTimer)
      window.clearTimeout(showTimer)
    }
  }, [count, reduceMotion])

  const visible = heroConversation.slice(0, count)

  return (
    <div className="w-[300px] rounded-[28px] border border-white/10 bg-[#EFEAE2]/95 p-3 shadow-[0_30px_70px_-20px_rgba(0,0,0,0.7)] backdrop-blur sm:w-[330px]">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="font-machine text-[10px] uppercase tracking-[0.14em] text-wa-deep">WhatsApp · 23:41</p>
        <p className="flex items-center gap-1.5 font-machine text-[10px] uppercase tracking-[0.14em] text-neutral-500">
          <span className="h-1.5 w-1.5 rounded-full bg-wa" /> fora do expediente
        </p>
      </div>
      <div className="flex h-[236px] flex-col justify-end gap-1.5 overflow-hidden" aria-live="polite">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((m, i) => (
            <motion.div
              key={`${i}-${m.text}`}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            >
              <Bubble message={m} />
            </motion.div>
          ))}
          {typing && (
            <motion.div key="typing" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TypingBubble />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

export function Hero() {
  const { open } = useDiagnostic()

  return (
    <section id="inicio" className="relative overflow-hidden bg-ink text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 h-[640px] w-[640px] rounded-full bg-wa/[0.13] blur-[120px]"
      />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-16 pt-32 sm:px-8 lg:min-h-[100svh] lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:gap-6 lg:pb-20 lg:pt-28">
        <div className="relative z-10">
          <h1 className="font-landing text-[clamp(2.6rem,6.6vw,5.4rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
            Seu WhatsApp trabalhando por você.
            <span className="mt-2 block font-human text-[1.08em] font-normal italic tracking-[-0.02em] text-wa">
              24 horas por dia.
            </span>
          </h1>
          <p className="mt-7 max-w-[540px] text-[17px] leading-relaxed text-white/65">
            Automatize seu atendimento, responda clientes, tire dúvidas, agende compromissos e transforme conversas em vendas
            com um chatbot inteligente. Tudo em uma única plataforma.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <CtaButton ctaId="hero_primary" position="hero" size="lg" onClick={() => open({ origin: 'hero' })}>
              Quero automatizar meu WhatsApp
            </CtaButton>
            <CtaButton ctaId="hero_secondary" position="hero" size="lg" variant="outline-light" icon={false} href="#como-funciona">
              Ver como funciona
            </CtaButton>
          </div>
          <ul className="mt-12 grid max-w-[560px] grid-cols-2 gap-x-6 gap-y-4 border-t border-white/10 pt-7">
            {highlights.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-white/80">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/[0.06] text-wa">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-[480px] lg:max-w-none">
          <div className="relative overflow-hidden rounded-[36px] border border-white/10">
            <HeroReveal />
          </div>
          <div className="relative z-10 -mt-28 flex justify-center sm:-mt-36 lg:absolute lg:-left-24 lg:bottom-10 lg:mt-0 lg:block">
            <HeroChat />
          </div>
        </div>
      </div>
    </section>
  )
}
