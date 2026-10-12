import raw from './pokemon.json'

export type PokeType =
  | 'normal' | 'fire' | 'water' | 'electric' | 'grass' | 'ice' | 'fighting' | 'poison' | 'ground'
  | 'flying' | 'psychic' | 'bug' | 'rock' | 'ghost' | 'dragon' | 'dark' | 'steel' | 'fairy'

export interface BaseStats {
  hp: number
  atk: number
  def: number
  spa: number
  spd: number
  spe: number
}

export interface Pokemon {
  id: number
  name: string
  types: PokeType[]
  heightDm: number
  weightHg: number
  stats: BaseStats
  gen: number
  stage: number
  chain: number
  evolves: boolean
  legendary: boolean
}

export const POKEDEX = raw as Pokemon[]

export const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
export const REGIONS: Record<number, string> = {
  1: 'Kanto', 2: 'Johto', 3: 'Hoenn', 4: 'Sinnoh', 5: 'Unova', 6: 'Kalos', 7: 'Alola', 8: 'Galar', 9: 'Paldea',
}
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX']
export const genLabel = (gen: number) => `Gen ${ROMAN[gen]}`

const byId = new Map(POKEDEX.map((p) => [p.id, p]))
const byName = new Map(POKEDEX.map((p) => [p.name.toLowerCase(), p]))

export function getPokemon(id: number): Pokemon {
  const p = byId.get(id)
  if (!p) throw new Error(`Unknown Pokémon #${id}`)
  return p
}

export function getPokemonByName(name: string): Pokemon {
  const p = byName.get(name.toLowerCase())
  if (!p) throw new Error(`Unknown Pokémon ${name}`)
  return p
}

export function spriteUrl(id: number): string {
  return `${import.meta.env.BASE_URL}sprites/${id}.webp`
}

export const TYPE_COLORS: Record<PokeType, string> = {
  normal: '#A8A77A',
  fire: '#EE8130',
  water: '#6390F0',
  electric: '#F7D02C',
  grass: '#7AC74C',
  ice: '#96D9D6',
  fighting: '#C22E28',
  poison: '#A33EA1',
  ground: '#E2BF65',
  flying: '#A98FF3',
  psychic: '#F95587',
  bug: '#A6B91A',
  rock: '#B6A136',
  ghost: '#735797',
  dragon: '#6F35FC',
  dark: '#705746',
  steel: '#B7B7CE',
  fairy: '#D685AD',
}

export function heightLabel(dm: number): string {
  const inches = Math.round(dm * 3.937)
  return `${Math.floor(inches / 12)}'${inches % 12}"`
}

export function weightLabel(hg: number): string {
  const lb = hg * 0.2205
  return lb < 1 ? '<1 lb' : `${Math.round(lb)} lb`
}
