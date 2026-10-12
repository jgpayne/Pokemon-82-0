import { POKEDEX, type Pokemon, type PokeType } from '../data/pokedex'
import { pick, shuffle, type Rng } from './rng'

/**
 * A spin lands on two different types and deals from both, so a thin Gen 1
 * type (Bug, Fairy, Grass…) is always paired with a second pool instead of
 * being a dead spin. Occasionally it lands on a Wild card instead.
 */
export type SpinResult = { kind: 'pair'; types: [PokeType, PokeType] } | { kind: 'wild' }

export const PER_TYPE = 3
export const CHOICES_PER_SPIN = PER_TYPE * 2
export const RESPINS = 3
/** Chance a spin is a Wild card (any Pokémon) instead of a type pair. */
export const WILD_CHANCE = 1 / 12

/** Types with enough Gen 1 members to deal from. */
export const SPIN_TYPES: PokeType[] = (() => {
  const counts = new Map<PokeType, number>()
  for (const p of POKEDEX) for (const t of p.types) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts.entries()].filter(([, n]) => n >= 3).map(([t]) => t)
})()

export function spin(rng: Rng): SpinResult {
  if (rng() < WILD_CHANCE) return { kind: 'wild' }
  const a = pick(rng, SPIN_TYPES)
  let b = pick(rng, SPIN_TYPES)
  while (b === a) b = pick(rng, SPIN_TYPES)
  return { kind: 'pair', types: [a, b] }
}

export function spinLabel(result: SpinResult): string {
  return result.kind === 'wild' ? 'Wild card' : `${result.types[0]} and ${result.types[1]}`
}

/** Up to 3 Pokémon of each spun type (topped up from the other if one runs dry), or 6 of any type on a Wild card. */
export function choicesFor(rng: Rng, result: SpinResult, takenIds: ReadonlySet<number>): Pokemon[] {
  const open = POKEDEX.filter((p) => !takenIds.has(p.id))
  if (result.kind === 'wild') return shuffle(rng, open).slice(0, CHOICES_PER_SPIN)
  const [a, b] = result.types
  const first = shuffle(rng, open.filter((p) => p.types.includes(a))).slice(0, PER_TYPE)
  const restB = shuffle(rng, open.filter((p) => p.types.includes(b) && !first.includes(p)))
  const second = restB.slice(0, CHOICES_PER_SPIN - first.length)
  // If the second type ran short, top up from the first type's remaining pool.
  const topUp = shuffle(rng, open.filter((p) => p.types.includes(a) && !first.includes(p) && !second.includes(p)))
  const deal = [...first, ...second, ...topUp].slice(0, CHOICES_PER_SPIN)
  // Keep the shown order mixed but stable for the seed.
  return shuffle(rng, deal)
}
