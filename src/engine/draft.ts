import { POKEDEX, type Pokemon, type PokeType } from '../data/pokedex'
import { pick, shuffle, type Rng } from './rng'

export type SpinResult = PokeType | 'wild'

export const CHOICES_PER_SPIN = 5
export const RESPINS = 3

/** Types with enough Gen 1 members to make a fair spin, plus a Wild card. */
export const WHEEL: SpinResult[] = (() => {
  const counts = new Map<PokeType, number>()
  for (const p of POKEDEX) for (const t of p.types) counts.set(t, (counts.get(t) ?? 0) + 1)
  const types = [...counts.entries()].filter(([, n]) => n >= 3).map(([t]) => t)
  return [...types, 'wild']
})()

export function spin(rng: Rng): SpinResult {
  return pick(rng, WHEEL)
}

export function choicesFor(rng: Rng, result: SpinResult, takenIds: ReadonlySet<number>): Pokemon[] {
  const pool = POKEDEX.filter((p) => !takenIds.has(p.id) && (result === 'wild' || p.types.includes(result)))
  return shuffle(rng, pool).slice(0, CHOICES_PER_SPIN)
}
