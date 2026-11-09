import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  animate,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from 'motion/react'
import { cn } from '@/lib/utils'

const SLATS = 7
const TURN = 120
// Distance from a triangular prism's axis to a face, as a share of the face width: 1 / (2·tan 60°).
const APOTHEM = '28.8675cqw'

type Side = 'left' | 'right'

const wrap180 = (a: number) => ((((a + 180) % 360) + 360) % 360) - 180

function shade(angle: number) {
  const a = Math.abs(wrap180(angle))
  if (a >= 90) return 0.85
  return Math.min((1 - Math.cos((a * Math.PI) / 180)) * 1.5, 0.85)
}

function Face({
  angle,
  rotation,
  index,
  children,
}: {
  angle: number
  rotation: MotionValue<number>
  index: number
  children: ReactNode
}) {
  const darkness = useTransform(rotation, (r) => shade(r + angle))
  return (
    <div
      className={cn(
        'absolute inset-0 overflow-hidden [backface-visibility:hidden]',
        index === 0 && 'rounded-l-[28px]',
        index === SLATS - 1 && 'rounded-r-[28px]',
      )}
      style={{ transform: `rotateY(${angle}deg) translateZ(${APOTHEM})` }}
    >
      <div
        className="absolute inset-y-0"
        style={{ width: `${SLATS * 100}%`, left: `${-index * 100}%` }}
      >
        {children}
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 bg-black"
        style={{ opacity: darkness }}
      />
    </div>
  )
}

function Slat({
  index,
  target,
  delay,
  front,
  back,
}: {
  index: number
  target: number
  delay: number
  front: ReactNode
  back: ReactNode
}) {
  const rotation = useMotionValue(0)
  const transform = useMotionTemplate`translateZ(-${APOTHEM}) rotateY(${rotation}deg)`

  useEffect(() => {
    const controls = animate(rotation, target, {
      type: 'spring',
      stiffness: 150,
      damping: 17,
      mass: 0.9,
      delay,
    })
    return () => controls.stop()
  }, [rotation, target, delay])

  return (
    <div
      className="absolute inset-y-0 [container-type:inline-size] [transform-style:preserve-3d]"
      style={{ left: `${(index * 100) / SLATS}%`, width: `calc(${100 / SLATS}% + 0.5px)` }}
    >
      <motion.div className="absolute inset-0 [transform-style:preserve-3d]" style={{ transform }}>
        <Face angle={0} rotation={rotation} index={index}>
          {front}
        </Face>
        <Face angle={TURN} rotation={rotation} index={index}>
          {back}
        </Face>
        <Face angle={-TURN} rotation={rotation} index={index}>
          {back}
        </Face>
      </motion.div>
    </div>
  )
}

/**
 * A card made of vertical triangular prisms, like a trivision billboard: on hover, focus or tap the prisms turn in a
 * wave from the side the pointer came in, from the front face to the back face.
 */
export function PrismCard({
  label,
  front,
  back,
  className,
}: {
  label: string
  front: ReactNode
  back: ReactNode
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const pointerType = useRef('mouse')
  const [turned, setTurned] = useState(false)
  const [side, setSide] = useState<Side>('left')

  function sideOf(event: { clientX: number }): Side {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return 'left'
    return event.clientX < rect.left + rect.width / 2 ? 'left' : 'right'
  }

  function turn(next: boolean, from: Side) {
    setSide(from)
    setTurned(next)
  }

  return (
    <div
      ref={ref}
      tabIndex={0}
      role="group"
      aria-label={label}
      className={cn(
        'relative aspect-[4/5] w-full cursor-pointer select-none rounded-[28px] outline-none [perspective:1600px]',
        'focus-visible:ring-2 focus-visible:ring-wa focus-visible:ring-offset-4 focus-visible:ring-offset-neutral-100',
        className,
      )}
      onPointerEnter={(event) => {
        pointerType.current = event.pointerType
        if (event.pointerType === 'mouse') turn(true, sideOf(event))
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') turn(false, sideOf(event))
      }}
      onPointerDown={(event) => {
        pointerType.current = event.pointerType
      }}
      onClick={(event) => {
        if (pointerType.current !== 'mouse') turn(!turned, sideOf(event))
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(':focus-visible')) turn(true, 'left')
      }}
      onBlur={() => turn(false, 'left')}
    >
      {reduceMotion ? (
        <div className="absolute inset-0 overflow-hidden rounded-[28px]">
          <div className="absolute inset-0">{front}</div>
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-200',
              turned ? 'opacity-100' : 'opacity-0',
            )}
          >
            {back}
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 [transform-style:preserve-3d]" aria-hidden>
          {Array.from({ length: SLATS }, (_, i) => {
            const order = side === 'left' ? i : SLATS - 1 - i
            const direction = side === 'left' ? -1 : 1
            return (
              <Slat
                key={i}
                index={i}
                target={turned ? direction * TURN : 0}
                delay={order * 0.045}
                front={front}
                back={back}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
