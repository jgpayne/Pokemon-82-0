import { AnimatePresence, motion } from 'framer-motion'
import type { Pokemon } from '../data/pokedex'
import { BENCH_SLOTS, POSITION_NAMES, slotOverall, type Roster, type Slot } from '../engine/ratings'
import { OvrChip, Sprite } from './ui'
import { cx } from '../lib/cx'

// Spots on a half court (percent of board), basket at the top.
const SPOTS: Record<'PG' | 'SG' | 'SF' | 'PF' | 'C', { x: number; y: number }> = {
  PG: { x: 50, y: 80 },
  SG: { x: 83, y: 60 },
  SF: { x: 17, y: 60 },
  PF: { x: 72, y: 28 },
  C: { x: 30, y: 24 },
}

export function CourtBoard({
  roster,
  pending,
  movingSlot,
  onSlot,
}: {
  roster: Roster
  pending: Pokemon | null
  movingSlot: Slot | null
  onSlot: (slot: Slot) => void
}) {
  return (
    <div className="space-y-3">
      <div className="hardwood relative aspect-[5/4] w-full overflow-hidden rounded-2xl ring-4 ring-amber-950/60 sm:aspect-[16/11]">
        <CourtLines />
        {(Object.keys(SPOTS) as (keyof typeof SPOTS)[]).map((slot) => (
          <div key={slot} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${SPOTS[slot].x}%`, top: `${SPOTS[slot].y}%` }}>
            <SlotButton slot={slot} mon={roster[slot]} pending={pending} moving={movingSlot === slot} anyMoving={!!movingSlot} onClick={() => onSlot(slot)} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-surface-2/80 p-2 ring-1 ring-line">
        {BENCH_SLOTS.map((slot) => (
          <div key={slot} className="flex justify-center">
            <SlotButton slot={slot} mon={roster[slot]} pending={pending} moving={movingSlot === slot} anyMoving={!!movingSlot} onClick={() => onSlot(slot)} bench />
          </div>
        ))}
      </div>
    </div>
  )
}

function SlotButton({
  slot,
  mon,
  pending,
  moving,
  anyMoving,
  onClick,
  bench,
}: {
  slot: Slot
  mon?: Pokemon
  pending: Pokemon | null
  moving: boolean
  anyMoving: boolean
  onClick: () => void
  bench?: boolean
}) {
  const target = (pending && !mon) || (anyMoving && !moving)
  const preview = pending && !mon ? slotOverall(pending, slot) : null
  const label = mon
    ? `${POSITION_NAMES[slot]}: ${mon.name}, ${slotOverall(mon, slot)} overall. ${anyMoving ? 'Swap here' : 'Select to move'}`
    : `${POSITION_NAMES[slot]} – empty${preview ? `, ${pending!.name} would be ${preview}` : ''}`
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={!mon && !pending && !anyMoving}
      className={cx(
        'relative flex cursor-pointer flex-col items-center rounded-2xl p-1 transition-transform disabled:cursor-default',
        target && 'animate-pulse hover:scale-105',
        moving && 'scale-105',
      )}
    >
      <span
        className={cx(
          'relative grid place-items-center rounded-full border-[3px] transition-colors',
          bench ? 'h-16 w-16' : 'h-[clamp(56px,13vw,92px)] w-[clamp(56px,13vw,92px)]',
          mon ? 'border-white/80 bg-slate-950/40' : 'border-dashed border-white/70 bg-black/25',
          target && 'border-solid border-accent bg-accent/25 shadow-[0_0_24px_rgba(250,204,21,0.6)]',
          moving && 'border-solid border-secondary shadow-[0_0_24px_rgba(59,130,246,0.7)]',
        )}
      >
        <AnimatePresence mode="popLayout">
          {mon ? (
            <motion.span key={mon.id} initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }}>
              <Sprite id={mon.id} name="" className={bench ? 'h-14 w-14' : 'h-[clamp(50px,12vw,86px)] w-[clamp(50px,12vw,86px)]'} />
            </motion.span>
          ) : preview ? (
            <span className="font-display text-xl text-accent tabular-nums">{preview}</span>
          ) : (
            <span className="font-display text-lg text-white/80">{slot}</span>
          )}
        </AnimatePresence>
      </span>
      <span className="mt-1 flex items-center gap-1 rounded-md bg-slate-950/80 px-1.5 py-0.5 text-[11px] font-semibold whitespace-nowrap">
        <span className="font-display text-accent">{slot}</span>
        {mon ? (
          <>
            <span className="max-w-[84px] truncate">{mon.name}</span>
            <OvrChip ovr={slotOverall(mon, slot)} />
          </>
        ) : (
          <span className="text-white/60">open</span>
        )}
      </span>
    </button>
  )
}

function CourtLines() {
  return (
    <svg viewBox="0 0 160 110" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
      <g fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="0.8">
        <rect x="2" y="2" width="156" height="106" />
        <rect x="58" y="2" width="44" height="38" fill="rgba(239,68,68,0.28)" />
        <path d="M58 40a22 14 0 0 0 44 0" />
        <path d="M14 2v20a66 62 0 0 0 132 0V2" />
        <path d="M58 108a22 14 0 0 1 44 0" />
        <circle cx="80" cy="9" r="2.6" stroke="#f97316" strokeWidth="1" />
        <path d="M72 6h16" strokeWidth="1.2" />
      </g>
    </svg>
  )
}
