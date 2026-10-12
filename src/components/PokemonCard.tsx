import { motion } from 'framer-motion'
import { genLabel, heightLabel, TYPE_COLORS, weightLabel, type Pokemon } from '../data/pokedex'
import { bestPosition, ratingsFor, RATING_LABELS, slotOverall, type RatingKey, type Slot } from '../engine/ratings'
import { OvrChip, RatingBar, Sprite, TypeBadge } from './ui'
import { cx } from '../lib/cx'

const SHOWN: RatingKey[] = ['shooting', 'finishing', 'playmaking', 'perimeterD', 'interiorD', 'rebounding']

export function PokemonCard({
  mon,
  selected,
  openSlots,
  onSelect,
  index = 0,
}: {
  mon: Pokemon
  selected: boolean
  openSlots: Slot[]
  onSelect: () => void
  index?: number
}) {
  const r = ratingsFor(mon)
  const best = bestPosition(mon)
  const fits = openSlots
    .map((s) => ({ s, ovr: slotOverall(mon, s) }))
    .sort((a, b) => b.ovr - a.ovr)
    .slice(0, 3)
  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 24, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.07, type: 'spring', stiffness: 320, damping: 24 }}
      whileHover={{ y: -4 }}
      className={cx(
        'group relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-surface-2 p-3 text-left ring-2 transition-colors',
        selected ? 'ring-accent shadow-[0_0_0_4px_rgba(250,204,21,0.25),0_12px_30px_rgba(250,204,21,0.25)]' : 'ring-line hover:ring-white/30',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-60"
        style={{ background: `radial-gradient(120px 90px at 50% 70%, var(--glow), transparent)`, ['--glow' as string]: `${TYPE_COLORS[mon.types[0]]}` }}
      />
      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] text-muted tabular-nums">#{String(mon.id).padStart(4, '0')} · {genLabel(mon.gen)}</div>
          <div className="truncate font-display text-base leading-tight sm:text-lg">{mon.name}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <OvrChip ovr={best.ovr} label={best.pos} className="text-sm" />
          {mon.legendary && <span className="rounded bg-accent/15 px-1 text-[10px] font-bold text-accent uppercase">Legend</span>}
        </div>
      </div>
      <Sprite id={mon.id} name={mon.name} className="relative mx-auto my-1 h-24 w-24 transition-transform group-hover:scale-110" />
      <div className="relative mb-2 flex flex-wrap items-center gap-1">
        {mon.types.map((t) => (
          <TypeBadge key={t} type={t} />
        ))}
        <span className="ml-auto text-[11px] text-muted">
          {heightLabel(mon.heightDm)} · {weightLabel(mon.weightHg)}
        </span>
      </div>
      <div className="relative space-y-1">
        {SHOWN.map((k) => (
          <RatingBar key={k} label={RATING_LABELS[k]} value={r[k]} />
        ))}
      </div>
      {fits.length > 0 && (
        <div className="relative mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
          <span className="text-[11px] text-muted">Fits:</span>
          {fits.map((f) => (
            <OvrChip key={f.s} ovr={f.ovr} label={f.s} />
          ))}
        </div>
      )}
    </motion.button>
  )
}

