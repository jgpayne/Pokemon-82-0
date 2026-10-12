import { create } from 'zustand'
import type { Pokemon } from '../data/pokedex'
import { choicesFor, GEN_REROLLS, rerollGen, rerollType, spin, TYPE_REROLLS, type SpinResult } from '../engine/draft'
import { runSeason, type SeasonResult } from '../engine/league'
import { SLOTS, type Roster, type Slot } from '../engine/ratings'
import { dailySeed, makeRng, randomSeed, type Rng } from '../engine/rng'

export type Screen = 'home' | 'draft' | 'season' | 'playoffs' | 'results'
export type Mode = 'daily' | 'free'

interface GameState {
  screen: Screen
  mode: Mode
  seed: string
  rng: Rng
  roster: Roster
  genRerolls: number
  typeRerolls: number
  /** `rolled` says which reel(s) animate for this result. */
  current: { result: SpinResult; choices: Pokemon[]; rolled: 'both' | 'gen' | 'type' } | null
  spinCount: number
  selected: { kind: 'choice'; mon: Pokemon } | { kind: 'slot'; slot: Slot } | null
  teamName: string
  season: SeasonResult | null
  revealed: number

  start: (mode: Mode, seed?: string) => void
  doSpin: () => void
  rerollGen: () => void
  rerollType: () => void
  select: (sel: GameState['selected']) => void
  placeAt: (slot: Slot) => void
  setTeamName: (name: string) => void
  simulate: () => void
  setRevealed: (n: number) => void
  goto: (screen: Screen) => void
  reset: () => void
}

const takenIds = (r: Roster) => new Set(Object.values(r).map((p) => p!.id))

export const BEST_KEY = 'poke82-best'

export interface BestRecord {
  wins: number
  losses: number
  finish: string
  team: string
}

export function loadBest(): BestRecord | null {
  try {
    const raw = localStorage.getItem(BEST_KEY)
    return raw ? (JSON.parse(raw) as BestRecord) : null
  } catch {
    return null
  }
}

function saveBest(s: SeasonResult, team: string) {
  try {
    const best = loadBest()
    if (!best || s.wins > best.wins) {
      localStorage.setItem(BEST_KEY, JSON.stringify({ wins: s.wins, losses: s.losses, finish: s.finish, team }))
    }
  } catch {
    // Storage blocked (private mode) – best record just isn't remembered.
  }
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'home',
  mode: 'free',
  seed: '',
  rng: makeRng(0),
  roster: {},
  genRerolls: GEN_REROLLS,
  typeRerolls: TYPE_REROLLS,
  current: null,
  spinCount: 0,
  selected: null,
  teamName: 'Pallet Town Pokéballers',
  season: null,
  revealed: 0,

  start: (mode, seed) => {
    const s = seed ?? (mode === 'daily' ? dailySeed() : randomSeed())
    set({
      screen: 'draft',
      mode,
      seed: s,
      rng: makeRng(`${s}:draft`),
      roster: {},
      genRerolls: GEN_REROLLS,
      typeRerolls: TYPE_REROLLS,
      current: null,
      spinCount: 0,
      selected: null,
      season: null,
      revealed: 0,
    })
  },

  doSpin: () => {
    const { rng, roster } = get()
    const taken = takenIds(roster)
    const result = spin(rng, taken)
    set((st) => ({ current: { result, choices: choicesFor(rng, result, taken), rolled: 'both' }, selected: null, spinCount: st.spinCount + 1 }))
  },

  rerollGen: () => {
    const { rng, roster, current, genRerolls } = get()
    if (!current || genRerolls <= 0) return
    const taken = takenIds(roster)
    const result = rerollGen(rng, current.result, taken)
    set((st) => ({
      current: { result, choices: choicesFor(rng, result, taken), rolled: 'gen' },
      genRerolls: st.genRerolls - 1,
      selected: null,
      spinCount: st.spinCount + 1,
    }))
  },

  rerollType: () => {
    const { rng, roster, current, typeRerolls } = get()
    if (!current || typeRerolls <= 0) return
    const taken = takenIds(roster)
    const result = rerollType(rng, current.result, taken)
    set((st) => ({
      current: { result, choices: choicesFor(rng, result, taken), rolled: 'type' },
      typeRerolls: st.typeRerolls - 1,
      selected: null,
      spinCount: st.spinCount + 1,
    }))
  },

  select: (selected) => set({ selected }),

  placeAt: (slot) => {
    const { selected, roster } = get()
    if (!selected) {
      if (roster[slot]) set({ selected: { kind: 'slot', slot } })
      return
    }
    if (selected.kind === 'choice') {
      if (roster[slot]) return
      set({ roster: { ...roster, [slot]: selected.mon }, current: null, selected: null })
      return
    }
    // Move / swap two placed players.
    const next = { ...roster }
    const a = next[selected.slot]
    const b = next[slot]
    if (b) next[selected.slot] = b
    else delete next[selected.slot]
    next[slot] = a
    set({ roster: next, selected: null })
  },

  setTeamName: (teamName) => set({ teamName }),

  simulate: () => {
    const { roster, seed, teamName } = get()
    if (SLOTS.some((s) => !roster[s])) return
    const season = runSeason(seed, roster as Record<Slot, Pokemon>, teamName)
    saveBest(season, teamName)
    set({ season, revealed: 0, screen: 'season' })
  },

  setRevealed: (revealed) => set({ revealed }),
  goto: (screen) => set({ screen }),
  reset: () => set({ screen: 'home', current: null, selected: null, season: null }),
}))
