import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { SPIN_TYPES, spinLabel, type SpinResult } from '../engine/draft'
import { TypeBadge } from './ui'

const reelFrame = (i: number): SpinResult => ({
  kind: 'pair',
  types: [SPIN_TYPES[i % SPIN_TYPES.length], SPIN_TYPES[(i * 5 + 3) % SPIN_TYPES.length]],
})

/** Slot-machine style reel: flickers through type pairs, then slams onto the result. */
export function SpinReel({ result, spinKey, onDone }: { result: SpinResult | null; spinKey: number; onDone: () => void }) {
  // The parent remounts this per spin (key), so state starts fresh for each one.
  const reduced = useReducedMotion()
  const animate = !!result && !reduced
  const [shown, setShown] = useState<SpinResult | null>(animate ? reelFrame(spinKey) : result)
  const [rolling, setRolling] = useState(animate)
  const done = useRef(onDone)

  useEffect(() => {
    if (!result) return
    let i = 0
    let delay = 45
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      i++
      if (!animate || i > 14) {
        setShown(result)
        setRolling(false)
        done.current()
        return
      }
      setShown(reelFrame(i * 7 + spinKey))
      delay *= 1.12
      timer = setTimeout(tick, delay)
    }
    timer = setTimeout(tick, animate ? delay : 0)
    return () => clearTimeout(timer)
  }, [result, animate, spinKey])

  return (
    <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ring-2 ring-line" aria-live="polite">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-slate-950 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-950 to-transparent" />
      <div className="absolute inset-y-0 left-2 flex items-center font-display text-xl text-primary sm:left-3 sm:text-2xl">▶</div>
      <div className="absolute inset-y-0 right-2 flex items-center font-display text-xl text-primary sm:right-3 sm:text-2xl">◀</div>
      {shown ? (
        <motion.div
          key={`${spinLabel(shown)}-${rolling}`}
          className="flex items-center gap-2 sm:gap-3"
          initial={rolling ? { y: -30, opacity: 0.4 } : { scale: 1.5, opacity: 0 }}
          animate={rolling ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={rolling ? { duration: 0.05 } : { type: 'spring', stiffness: 500, damping: 14 }}
        >
          {shown.kind === 'wild' ? (
            <TypeBadge type="wild" size="lg" />
          ) : (
            <>
              <TypeBadge type={shown.types[0]} size="lg" />
              <span className="font-display text-xl text-muted" aria-hidden>
                ×
              </span>
              <TypeBadge type={shown.types[1]} size="lg" />
            </>
          )}
        </motion.div>
      ) : (
        <span className="font-display text-xl text-muted uppercase">Spin for two types</span>
      )}
      {!rolling && result && <span className="sr-only">Landed on {spinLabel(result)}</span>}
    </div>
  )
}
