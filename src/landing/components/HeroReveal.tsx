import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { Bot, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export function HeroReveal({
  className,
  lensRadius = 150,
  hint = 'Passe o mouse para ver quem responde',
}: {
  className?: string
  lensRadius?: number
  hint?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [canHover, setCanHover] = useState(true)
  const [revealed, setRevealed] = useState(false)

  const x = useMotionValue(50)
  const y = useMotionValue(38)
  const radius = useMotionValue(0)
  const springConfig = { stiffness: 260, damping: 30, mass: 0.6 }
  const sx = useSpring(x, springConfig)
  const sy = useSpring(y, springConfig)
  const sr = useSpring(radius, { stiffness: 200, damping: 26 })

  const mask = useMotionTemplate`radial-gradient(circle ${sr}px at ${sx}% ${sy}%, #000 0%, #000 82%, transparent 100%)`
  const ringLeft = useMotionTemplate`${sx}%`
  const ringTop = useMotionTemplate`${sy}%`
  const ringSize = useTransform(sr, (r) => r * 2)
  const ringOpacity = useTransform(sr, [0, 40], [0, 1])

  useEffect(() => {
    const media = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setCanHover(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const interactive = canHover && !reduceMotion

  function handleMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    x.set(((event.clientX - rect.left) / rect.width) * 100)
    y.set(((event.clientY - rect.top) / rect.height) * 100)
  }

  function toggle() {
    const next = !revealed
    setRevealed(next)
    x.set(50)
    y.set(36)
    const target = next ? 900 : 0
    if (reduceMotion) {
      radius.jump(target)
      sr.jump(target)
    } else {
      animate(radius, target, { duration: 0.6, ease: [0.22, 1, 0.36, 1] })
    }
  }

  return (
    <div
      ref={ref}
      onPointerEnter={() => interactive && radius.set(lensRadius)}
      onPointerLeave={() => interactive && !revealed && radius.set(0)}
      onPointerMove={handleMove}
      className={cn('group relative isolate aspect-[3/4] w-full select-none overflow-hidden bg-ink', interactive && 'cursor-none', className)}
    >
      <img
        src="/landing/hero-woman.jpg"
        alt="Recepcionista sorrindo com headset, pronta para atender"
        width={864}
        height={1152}
        fetchPriority="high"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover"
      />
      <motion.img
        src="/landing/hero-robot.jpg"
        alt=""
        aria-hidden
        width={864}
        height={1152}
        draggable={false}
        style={{ WebkitMaskImage: mask, maskImage: mask }}
        className="absolute inset-0 h-full w-full object-cover"
      />

      <motion.div
        aria-hidden
        style={{ left: ringLeft, top: ringTop, width: ringSize, height: ringSize, opacity: ringOpacity }}
        className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-wa/70 shadow-[0_0_60px_rgba(37,211,102,0.25)]"
      >
        <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink/80 px-2.5 py-1 font-machine text-[10px] uppercase tracking-[0.14em] text-wa backdrop-blur">
          IA respondendo
        </span>
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink via-ink/40 to-transparent" />

      {interactive ? (
        <p className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/15 bg-ink/60 px-3 py-1.5 font-machine text-[10px] uppercase tracking-[0.14em] text-white/80 backdrop-blur transition-opacity duration-300 group-hover:opacity-0">
          {hint}
        </p>
      ) : (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={revealed}
          className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-ink/70 px-3.5 py-2 font-machine text-[11px] uppercase tracking-[0.12em] text-white backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wa"
        >
          {revealed ? <UserRound className="h-3.5 w-3.5 text-wa" /> : <Bot className="h-3.5 w-3.5 text-wa" />}
          {revealed ? 'Ver o atendimento humano' : 'Ver quem responde'}
        </button>
      )}
    </div>
  )
}
