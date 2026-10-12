import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { WHEEL, type SpinResult } from '../engine/draft'
import { TypeBadge } from './ui'

/** Slot-machine style reel: flickers through types, then slams onto the result. */
export function SpinReel({ result, spinKey, onDone }: { result: SpinResult | null; spinKey: number; onDone: () => void }) {
  // The parent remounts this per spin (key), so state starts fresh for each one.
  const reduced = useReducedMotion()
  const animate = !!result && !reduced
  const [shown, setShown] = useState<SpinResult | null>(animate ? WHEEL[spinKey % WHEEL.length] : result)
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
      setShown(WHEEL[(i * 7 + spinKey) % WHEEL.length])
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
      <div className="absolute inset-y-0 left-3 flex items-center font-display text-2xl text-primary">▶</div>
      <div className="absolute inset-y-0 right-3 flex items-center font-display text-2xl text-primary">◀</div>
      {shown ? (
        <motion.div
          key={`${shown}-${rolling}`}
          initial={rolling ? { y: -30, opacity: 0.4 } : { scale: 1.6, opacity: 0 }}
          animate={rolling ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
          transition={rolling ? { duration: 0.05 } : { type: 'spring', stiffness: 500, damping: 14 }}
        >
          <TypeBadge type={shown} size="lg" />
        </motion.div>
      ) : (
        <span className="font-display text-xl text-muted uppercase">Spin for a type</span>
      )}
      {!rolling && result && <span className="sr-only">Landed on {result === 'wild' ? 'Wild card' : result}</span>}
    </div>
  )
}
