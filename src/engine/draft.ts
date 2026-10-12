import { GENERATIONS, POKEDEX, type Pokemon, type PokeType } from '../data/pokedex'
import { pick, shuffle, type Rng } from './rng'

/**
 * Like 82-0's decade + team roll: a spin lands on a generation and a type, and
 * deals Pokémon from that generation with that type. Each half can be
 * re-rolled on its own with a separate budget.
 */
export interface SpinResult {
  gen: number
  type: PokeType
}

export const CHOICES_PER_SPIN = 6
export const GEN_REROLLS = 3
export const TYPE_REROLLS = 3

function poolFor(gen: number, type: PokeType, takenIds: ReadonlySet<number>): Pokemon[] {
  return POKEDEX.filter((p) => p.gen === gen && p.types.includes(type) && !takenIds.has(p.id))
}

function typesIn(gen: number, takenIds: ReadonlySet<number>): PokeType[] {
  const set = new Set<PokeType>()
  for (const p of POKEDEX) if (p.gen === gen && !takenIds.has(p.id)) for (const t of p.types) set.add(t)
  return [...set]
}

/** A fresh generation + type. Only lands on combinations that still have undrafted Pokémon. */
export function spin(rng: Rng, takenIds: ReadonlySet<number>): SpinResult {
  const gen = pick(rng, GENERATIONS)
  return { gen, type: pick(rng, typesIn(gen, takenIds)) }
}

/** Keep the generation, roll a different type that exists in it. */
export function rerollType(rng: Rng, current: SpinResult, takenIds: ReadonlySet<number>): SpinResult {
  const options = typesIn(current.gen, takenIds).filter((t) => t !== current.type)
  return options.length ? { gen: current.gen, type: pick(rng, options) } : current
}

/** Keep the type, roll a different generation that has it. */
export function rerollGen(rng: Rng, current: SpinResult, takenIds: ReadonlySet<number>): SpinResult {
  const options = GENERATIONS.filter((g) => g !== current.gen && poolFor(g, current.type, takenIds).length > 0)
  return options.length ? { gen: pick(rng, options), type: current.type } : current
}

/** Up to 6 undrafted Pokémon from the spun generation and type (fewer if the pool is thin). */
export function choicesFor(rng: Rng, result: SpinResult, takenIds: ReadonlySet<number>): Pokemon[] {
  return shuffle(rng, poolFor(result.gen, result.type, takenIds)).slice(0, CHOICES_PER_SPIN)
}
