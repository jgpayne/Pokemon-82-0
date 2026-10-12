import type { Pokemon } from '../data/pokedex'
import { bestMatchup } from '../data/typeChart'
import { chemistry, ratingsFor, SLOTS, type Ratings, type Slot } from './ratings'
import { pickWeighted, type Rng } from './rng'

export interface Team {
  id: string
  city: string
  name: string
  abbr: string
  coach: string
  color: string
  conference: string
  roster: Record<Slot, Pokemon>
  isUser?: boolean
}

export interface PlayerLine {
  id: number
  slot: Slot
  min: number
  pts: number
  reb: number
  ast: number
  stl: number
  blk: number
  tov: number
  fgm: number
  fga: number
  tpm: number
  tpa: number
  ftm: number
  fta: number
  superEff: number
}

export interface GameResult {
  homeId: string
  awayId: string
  homeScore: number
  awayScore: number
  overtimes: number
  quarters: { home: number[]; away: number[] }
  box?: { home: PlayerLine[]; away: PlayerLine[] }
}

interface SimPlayer {
  mon: Pokemon
  r: Ratings
  slot: Slot
  line: PlayerLine
  usage: number
  onCourt: number
}

interface SimTeam {
  players: SimPlayer[]
  chem: number
  home: boolean
}

// Tuning knobs. RATING_EDGE converts a one-point rating gap into make-probability.
const RATING_EDGE = 0.0036
const HOME_EDGE = 0.012
const BENCH_WEIGHTS = [0.45, 0.33, 0.22]

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length

function prepare(team: Team, home: boolean): SimTeam {
  const players = SLOTS.map((slot) => {
    const mon = team.roster[slot]
    const r = ratingsFor(mon)
    return {
      mon,
      r,
      slot,
      usage: Math.pow(Math.max(r.shooting, r.finishing) + r.playmaking * 0.3, 2.2),
      onCourt: 0,
      line: { id: mon.id, slot, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, superEff: 0 },
    }
  })
  return { players, chem: chemistry(team.roster).score, home }
}

/** Picks five on the floor, slot-matched: mostly starters, stamina keeps them out there longer. */
function lineup(rng: Rng, t: SimTeam): SimPlayer[] {
  const bench = t.players.slice(5)
  const used = new Set<SimPlayer>()
  return t.players.slice(0, 5).map((starter) => {
    const stay = 0.62 + (starter.r.stamina / 99) * 0.16
    if (rng() < stay) return starter
    const options = bench.filter((b) => !used.has(b))
    if (!options.length) return starter
    const sub = pickWeighted(rng, options, (b) => BENCH_WEIGHTS[bench.indexOf(b)])
    used.add(sub)
    return sub
  })
}

function possession(rng: Rng, off: SimTeam, def: SimTeam, chemEdge: number): number {
  const O = lineup(rng, off)
  const D = lineup(rng, def)
  for (const p of O) p.onCourt++
  for (const p of D) p.onCourt++
  const home = off.home ? HOME_EDGE : 0

  for (let attempt = 0; attempt < 4; attempt++) {
    const tovChance = clamp(0.135 + (mean(D.map((p) => p.r.perimeterD)) - mean(O.map((p) => p.r.playmaking))) * 0.0025, 0.06, 0.24)
    if (rng() < tovChance) {
      pickWeighted(rng, O, (p) => p.usage).line.tov++
      if (rng() < 0.55) pickWeighted(rng, D, (p) => p.r.perimeterD ** 2).line.stl++
      return 0
    }

    const idx = O.indexOf(pickWeighted(rng, O, (p) => p.usage))
    const shooter = O[idx]
    const defender = D[idx]
    const matchup = clamp(bestMatchup(shooter.mon.types, defender.mon.types), 0.5, 2)
    const typeEdge = Math.log2(matchup) * 0.035
    const bonus = typeEdge + chemEdge + home

    if (rng() < 0.11) {
      // Shooting foul: two free throws.
      const ft = clamp(0.55 + shooter.r.shooting * 0.0035, 0.5, 0.92)
      let pts = 0
      for (let i = 0; i < 2; i++) {
        shooter.line.fta++
        if (rng() < ft) pts++
      }
      shooter.line.ftm += pts
      shooter.line.pts += pts
      return pts
    }

    const three = rng() < clamp(0.27 + (shooter.r.shooting - shooter.r.finishing) * 0.006, 0.05, 0.55)
    let make: number
    if (three) {
      make = clamp(0.34 + (shooter.r.shooting - defender.r.perimeterD) * RATING_EDGE + bonus, 0.12, 0.6)
    } else {
      const rimProtect = Math.max(...D.map((p) => p.r.interiorD))
      const contest = 0.6 * defender.r.interiorD + 0.4 * rimProtect
      make = clamp(0.5 + (shooter.r.finishing - contest) * RATING_EDGE + bonus, 0.22, 0.8)
    }

    shooter.line.fga++
    if (three) shooter.line.tpa++
    if (rng() < make) {
      const pts = three ? 3 : 2
      shooter.line.fgm++
      if (three) shooter.line.tpm++
      shooter.line.pts += pts
      if (matchup > 1) shooter.line.superEff++
      if (rng() < 0.62) {
        const mates = O.filter((p) => p !== shooter)
        pickWeighted(rng, mates, (p) => p.r.playmaking ** 2).line.ast++
      }
      return pts
    }

    if (!three && rng() < clamp(0.07 + (Math.max(...D.map((p) => p.r.interiorD)) - 60) * 0.002, 0.03, 0.16)) {
      pickWeighted(rng, D, (p) => p.r.interiorD ** 3).line.blk++
    }

    const oreb = clamp(0.24 + (mean(O.map((p) => p.r.rebounding)) - mean(D.map((p) => p.r.rebounding))) * 0.004, 0.1, 0.42)
    if (rng() < oreb) {
      pickWeighted(rng, O, (p) => p.r.rebounding ** 2).line.reb++
      continue
    }
    pickWeighted(rng, D, (p) => p.r.rebounding ** 2).line.reb++
    return 0
  }
  return 0
}

export function simGame(rng: Rng, home: Team, away: Team, withBox = false): GameResult {
  const h = prepare(home, true)
  const a = prepare(away, false)
  const pace = mean([...h.players, ...a.players].slice(0, 16).map((p) => p.r.athleticism))
  const perTeam = Math.round(90 + pace * 0.18 + (rng() - 0.5) * 6)
  const perQuarter = [0, 1, 2, 3].map((q) => Math.round(perTeam / 4) + (q === 3 ? perTeam % 4 : 0))
  const chem = (h.chem - a.chem) * 0.004
  const quarters = { home: [] as number[], away: [] as number[] }
  let hs = 0
  let as = 0
  let overtimes = 0

  const period = (n: number) => {
    let qh = 0
    let qa = 0
    for (let i = 0; i < n; i++) {
      qh += possession(rng, h, a, chem)
      qa += possession(rng, a, h, -chem)
    }
    quarters.home.push(qh)
    quarters.away.push(qa)
    hs += qh
    as += qa
  }

  for (const n of perQuarter) period(n)
  while (hs === as) {
    overtimes++
    period(Math.round(perTeam / 9.6))
  }

  const result: GameResult = { homeId: home.id, awayId: away.id, homeScore: hs, awayScore: as, overtimes, quarters }
  if (withBox) {
    const totalPoss = h.players.reduce((s, p) => s + p.onCourt, 0) / 5
    const minutes = 48 + overtimes * 5
    const finish = (t: SimTeam) =>
      t.players.map((p) => ({ ...p.line, min: Math.round((p.onCourt / totalPoss) * minutes) }))
    result.box = { home: finish(h), away: finish(a) }
  }
  return result
}
