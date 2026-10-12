import type { Pokemon, PokeType } from '../data/pokedex'

export const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'] as const
export type Position = (typeof POSITIONS)[number]
export const SLOTS = ['PG', 'SG', 'SF', 'PF', 'C', '6TH', '7TH', '8TH'] as const
export type Slot = (typeof SLOTS)[number]
export const BENCH_SLOTS: Slot[] = ['6TH', '7TH', '8TH']

export const POSITION_NAMES: Record<Slot, string> = {
  PG: 'Point Guard',
  SG: 'Shooting Guard',
  SF: 'Small Forward',
  PF: 'Power Forward',
  C: 'Center',
  '6TH': 'Sixth Mon',
  '7TH': 'Bench',
  '8TH': 'Bench',
}

export interface Ratings {
  shooting: number
  finishing: number
  playmaking: number
  perimeterD: number
  interiorD: number
  rebounding: number
  athleticism: number
  stamina: number
}

export type RatingKey = keyof Ratings

export const RATING_LABELS: Record<RatingKey, string> = {
  shooting: 'Shooting',
  finishing: 'Finishing',
  playmaking: 'Playmaking',
  perimeterD: 'Perimeter D',
  interiorD: 'Interior D',
  rebounding: 'Rebounding',
  athleticism: 'Athleticism',
  stamina: 'Stamina',
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const lin = (v: number, lo: number, hi: number) => clamp01((v - lo) / (hi - lo))
const logLin = (v: number, lo: number, hi: number) => lin(Math.log(v), Math.log(lo), Math.log(hi))
const toRating = (x: number) => Math.round(25 + 74 * clamp01(x))

/** 0..1 "frame" from height + weight (log scale: Diglett ≈ 0, Onix/Snorlax ≈ 1). */
export function sizeFactor(p: Pokemon): number {
  return 0.5 * logLin(p.heightDm, 3, 35) + 0.5 * logLin(p.weightHg, 20, 2500)
}

const cache = new Map<number, Ratings>()

/**
 * Turns base stats into basketball ratings (25–99):
 * Sp. Atk is touch/shooting, Attack is power at the rim, Speed drives playmaking and
 * athleticism, the defensive stats guard the perimeter (Sp. Def) and paint (Def), and
 * HP plus physical size wins the glass.
 */
export function ratingsFor(p: Pokemon): Ratings {
  const hit = cache.get(p.id)
  if (hit) return hit
  const s = (v: number) => lin(v, 20, 150)
  const { hp, atk, def, spa, spd, spe } = p.stats
  const size = sizeFactor(p)
  const r: Ratings = {
    shooting: toRating(0.75 * s(spa) + 0.25 * s(spe)),
    finishing: toRating(0.6 * s(atk) + 0.25 * size + 0.15 * s(spe)),
    playmaking: toRating(0.55 * s(spe) + 0.45 * s(spa)),
    perimeterD: toRating(0.5 * s(spe) + 0.5 * s(spd)),
    interiorD: toRating(0.55 * s(def) + 0.45 * size),
    rebounding: toRating(0.35 * s(hp) + 0.5 * size + 0.15 * s(atk)),
    athleticism: toRating(s(spe)),
    stamina: toRating(s(hp)),
  }
  cache.set(p.id, r)
  return r
}

export const POSITION_WEIGHTS: Record<Position, Partial<Record<RatingKey, number>>> = {
  PG: { playmaking: 0.35, shooting: 0.2, perimeterD: 0.2, athleticism: 0.2, finishing: 0.05 },
  SG: { shooting: 0.4, perimeterD: 0.2, finishing: 0.15, athleticism: 0.15, playmaking: 0.1 },
  SF: { finishing: 0.25, shooting: 0.2, perimeterD: 0.2, athleticism: 0.15, rebounding: 0.1, playmaking: 0.1 },
  PF: { finishing: 0.3, interiorD: 0.25, rebounding: 0.25, shooting: 0.1, perimeterD: 0.1 },
  C: { interiorD: 0.35, rebounding: 0.35, finishing: 0.2, shooting: 0.1 },
}

export function positionOverall(p: Pokemon, pos: Position): number {
  const r = ratingsFor(p)
  const w = POSITION_WEIGHTS[pos]
  let total = 0
  for (const k of Object.keys(w) as RatingKey[]) total += r[k] * (w[k] ?? 0)
  return Math.round(total)
}

export function bestPosition(p: Pokemon): { pos: Position; ovr: number } {
  let best: { pos: Position; ovr: number } = { pos: 'PG', ovr: -1 }
  for (const pos of POSITIONS) {
    const ovr = positionOverall(p, pos)
    if (ovr > best.ovr) best = { pos, ovr }
  }
  return best
}

/** Rating of a Pokémon playing a roster slot; bench slots use their natural position. */
export function slotOverall(p: Pokemon, slot: Slot): number {
  return slot === '6TH' || slot === '7TH' || slot === '8TH' ? bestPosition(p).ovr : positionOverall(p, slot)
}

export function grade(ovr: number): string {
  if (ovr >= 85) return 'S'
  if (ovr >= 77) return 'A'
  if (ovr >= 69) return 'B'
  if (ovr >= 60) return 'C'
  if (ovr >= 50) return 'D'
  return 'F'
}

export type Roster = Partial<Record<Slot, Pokemon>>

export interface Chemistry {
  score: number
  notes: string[]
}

export function chemistry(roster: Roster): Chemistry {
  const mons = Object.values(roster).filter(Boolean) as Pokemon[]
  const notes: string[] = []
  if (mons.length === 0) return { score: 0, notes }
  let score = 0
  const types = new Set<PokeType>(mons.flatMap((m) => m.types))
  const diversity = Math.max(-2, Math.min(3, (types.size - 5) * 0.5))
  if (mons.length >= 5) {
    score += diversity
    if (diversity > 0) notes.push(`Type diversity +${diversity}`)
    if (diversity < 0) notes.push(`One-dimensional types ${diversity}`)
  }
  const chains = new Map<number, number>()
  for (const m of mons) chains.set(m.chain, (chains.get(m.chain) ?? 0) + 1)
  const families = [...chains.values()].filter((n) => n > 1).length
  if (families) {
    score += families * 1.5
    notes.push(`Evolution family ties +${families * 1.5}`)
  }
  const legends = mons.filter((m) => m.legendary).length
  if (legends > 2) {
    score -= (legends - 2) * 1.5
    notes.push(`Too many legendary egos −${(legends - 2) * 1.5}`)
  }
  return { score, notes }
}

/** Team overall: starters at their slots (80%), bench (20%), plus chemistry. */
export function teamOverall(roster: Roster): number {
  let starters = 0
  let starterCount = 0
  for (const pos of POSITIONS) {
    const p = roster[pos]
    if (p) {
      starters += positionOverall(p, pos)
      starterCount++
    }
  }
  if (!starterCount) return 0
  const bench = BENCH_SLOTS.map((s) => roster[s]).filter(Boolean) as Pokemon[]
  const benchAvg = bench.length ? bench.reduce((a, p) => a + bestPosition(p).ovr, 0) / bench.length : starters / starterCount - 10
  return Math.round((starters / starterCount) * 0.8 + benchAvg * 0.2 + chemistry(roster).score)
}
