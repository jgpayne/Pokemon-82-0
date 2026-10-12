import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { genLabel, GENERATIONS, REGIONS, TYPE_COLORS, type PokeType } from '../data/pokedex'
import type { SpinResult } from '../engine/draft'
import { TypeBadge } from './ui'

const REEL_TYPES = Object.keys(TYPE_COLORS) as PokeType[]
export type Rolled = 'both' | 'gen' | 'type'

/**
 * Two slot-machine windows (generation, type). The ones being rolled flicker
 * through values, then slam onto the result. Remounted per spin via `key`.
 */
export function SpinReel({ result, rolled, spinKey, onDone }: { result: SpinResult | null; rolled: Rolled; spinKey: number; onDone: () => void }) {
  const reduced = useReducedMotion()
  const animate = !!result && !reduced
  const rollGen = rolled !== 'type'
  const rollType = rolled !== 'gen'
  const frame = (i: number): SpinResult | null =>
    result && {
      gen: rollGen ? GENERATIONS[(i * 4 + spinKey) % GENERATIONS.length] : result.gen,
      type: rollType ? REEL_TYPES[(i * 7 + spinKey) % REEL_TYPES.length] : result.type,
    }
  const [shown, setShown] = useState<SpinResult | null>(animate ? frame(0) : result)
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
      setShown(frame(i))
      delay *= 1.12
      timer = setTimeout(tick, delay)
    }
    timer = setTimeout(tick, animate ? delay : 0)
    return () => clearTimeout(timer)
    // frame only depends on props captured at mount (component is keyed per spin).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, animate, spinKey])

  const settle = (spinning: boolean) =>
    rolling && spinning
      ? { initial: { y: -24, opacity: 0.4 }, animate: { y: 0, opacity: 1 }, transition: { duration: 0.05 } }
      : { initial: spinning ? { scale: 1.5, opacity: 0 } : false, animate: { scale: 1, opacity: 1 }, transition: { type: 'spring' as const, stiffness: 500, damping: 14 } }

  return (
    <div className="grid grid-cols-2 gap-2" aria-live="polite">
      <Window label="Generation">
        {shown ? (
          <motion.div key={`g${shown.gen}-${rolling}`} {...settle(rollGen)} className="text-center leading-none">
            <div className="font-display text-2xl text-accent sm:text-3xl">{genLabel(shown.gen)}</div>
            <div className="mt-1 text-xs tracking-widest text-muted uppercase">{REGIONS[shown.gen]}</div>
          </motion.div>
        ) : (
          <span className="font-display text-lg text-muted">GEN ?</span>
        )}
      </Window>
      <Window label="Type">
        {shown ? (
          <motion.div key={`t${shown.type}-${rolling}`} {...settle(rollType)}>
            <TypeBadge type={shown.type} size="lg" />
          </motion.div>
        ) : (
          <span className="font-display text-lg text-muted">TYPE ?</span>
        )}
      </Window>
      {!rolling && result && (
        <span className="sr-only">
          Landed on {genLabel(result.gen)} ({REGIONS[result.gen]}), {result.type} type
        </span>
      )}
    </div>
  )
}

function Window({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="relative flex h-24 items-center justify-center overflow-hidden rounded-2xl bg-slate-950 ring-2 ring-line">
      <span className="absolute top-1.5 left-3 text-[10px] tracking-widest text-muted uppercase">{label}</span>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-slate-950 to-transparent" />
      {children}
    </div>
  )
}
