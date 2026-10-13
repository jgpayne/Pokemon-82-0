/**
 * Live, arcade-style 5-on-5 basketball (NBA Jam spirit) on a 94×50 ft court.
 * Pure TypeScript: the UI calls `step()` every frame with the player's input and
 * renders the resulting state. With `userTeam: null` both teams are AI-driven,
 * which the tests use to play whole games headless.
 */
import type { Pokemon } from '../data/pokedex'
import { bestMatchup } from '../data/typeChart'
import { BENCH_SLOTS, POSITIONS, ratingsFor, type Ratings, type Slot } from '../engine/ratings'
import { makeRng, type Rng } from '../engine/rng'
import type { GameResult, PlayerLine, Team } from '../engine/sim'

export const COURT = { w: 94, h: 50 } as const
export const BASKET_X = [88.75, 5.25] as const // basket each team attacks: team 0 → right, team 1 → left
export const BASKET_Y = 25
const RIM_Z = 10
const SHOT_CLOCK = 16
const OT_SECONDS = 40
const DEAD_BALL = 0.9
const BREAK_SECONDS = 2.5

export interface Vec {
  x: number
  y: number
}

/** Per-frame input. `shoot` is held (hold to charge, release to shoot); `pass`/`action` are one-frame presses. */
export interface PlayInput {
  move: Vec
  shoot: boolean
  pass: boolean
  action: boolean
  turbo: boolean
}

export const NO_INPUT: PlayInput = { move: { x: 0, y: 0 }, shoot: false, pass: false, action: false, turbo: false }

export interface Actor {
  key: string
  team: 0 | 1
  slot: Slot
  role: number // 0..4 = PG..C while on court
  mon: Pokemon
  r: Ratings
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  stamina: number
  stumble: number
  jump: number
  cooldown: number
  cutTimer: number
  onCourt: boolean
  onFire: boolean
  makesInRow: number
  seconds: number
  line: PlayerLine
}

export interface Shot {
  shooter: Actor
  from: Vec
  t: number
  dur: number
  value: 2 | 3
  make: boolean
  blocked: boolean
  superEff: boolean
  apex: number
}

export interface Ball {
  state: 'held' | 'pass' | 'shot' | 'loose'
  holder: Actor | null
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  target: Actor | null
  passer: Actor | null
  shot: Shot | null
  lastTouch: 0 | 1
  /** Who passed to the current holder, for assists. */
  assistFrom: Actor | null
  assistTimer: number
}

export interface FloatText {
  text: string
  x: number
  y: number
  t: number
  color: string
}

export interface PlayState {
  rng: Rng
  teams: [Team, Team]
  actors: Actor[]
  court: [Actor[], Actor[]]
  ball: Ball
  score: [number, number]
  quarter: number
  clock: number
  quarterSeconds: number
  shotClock: number
  possession: 0 | 1
  difficulty: [number, number]
  userTeam: 0 | null
  controlled: Actor | null
  meter: number | null
  phase: 'live' | 'break' | 'final'
  dead: number
  breakTimer: number
  texts: FloatText[]
  time: number
  periodSeconds: number[]
  periodScores: [number[], number[]]
  decide: number[]
}

export interface PlayOptions {
  home: Team
  away: Team
  seed: string
  /** AI strength for each team, 0 (first gym) … 1 (champion). */
  difficulty: [number, number]
  userTeam: 0 | null
  quarterSeconds?: number
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
const basketOf = (team: 0 | 1): Vec => ({ x: BASKET_X[team], y: BASKET_Y })
const ownBasket = (team: 0 | 1): Vec => ({ x: BASKET_X[team === 0 ? 1 : 0], y: BASKET_Y })
const dirToward = (team: 0 | 1) => (team === 0 ? 1 : -1)

function newLine(mon: Pokemon, slot: Slot): PlayerLine {
  return { id: mon.id, slot, min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, superEff: 0 }
}

function makeActor(team: 0 | 1, slot: Slot, mon: Pokemon): Actor {
  const r = ratingsFor(mon)
  const size = Math.min(1, Math.max(0, (Math.log(mon.heightDm) - Math.log(3)) / (Math.log(35) - Math.log(3))))
  return {
    key: `${team}-${slot}`,
    team,
    slot,
    role: 0,
    mon,
    r,
    x: 47,
    y: 25,
    vx: 0,
    vy: 0,
    radius: 1.1 + size * 1.1,
    stamina: 1,
    stumble: 0,
    jump: 0,
    cooldown: 0,
    cutTimer: 0,
    onCourt: false,
    onFire: false,
    makesInRow: 0,
    seconds: 0,
    line: newLine(mon, slot),
  }
}

/** Spacing spots by role, as offsets from the attacked basket (x toward half court). */
const SPOTS: Vec[] = [
  { x: 25, y: 0 }, // PG: top of the key
  { x: 18, y: 17 }, // SG: right wing
  { x: 5, y: -21 }, // SF: left corner
  { x: 9, y: -9 }, // PF: left elbow/block
  { x: 4, y: 7 }, // C: right block
]

function spotFor(team: 0 | 1, role: number): Vec {
  const b = basketOf(team)
  const s = SPOTS[role]
  return { x: b.x - dirToward(team) * s.x, y: b.y + s.y }
}

export function createGame(opts: PlayOptions): PlayState {
  const teams: [Team, Team] = [opts.home, opts.away]
  const actors: Actor[] = []
  teams.forEach((t, ti) => {
    for (const slot of [...POSITIONS, ...BENCH_SLOTS] as Slot[]) actors.push(makeActor(ti as 0 | 1, slot, t.roster[slot]))
  })
  const state: PlayState = {
    rng: makeRng(`${opts.seed}:play`),
    teams,
    actors,
    court: [[], []],
    ball: { state: 'held', holder: null, x: 47, y: 25, z: 4, vx: 0, vy: 0, vz: 0, target: null, passer: null, shot: null, lastTouch: 0, assistFrom: null, assistTimer: 0 },
    score: [0, 0],
    quarter: 1,
    quarterSeconds: opts.quarterSeconds ?? 75,
    clock: opts.quarterSeconds ?? 75,
    shotClock: SHOT_CLOCK,
    possession: 0,
    difficulty: opts.difficulty,
    userTeam: opts.userTeam,
    controlled: null,
    meter: null,
    phase: 'live',
    dead: DEAD_BALL,
    breakTimer: 0,
    texts: [],
    time: 0,
    periodSeconds: [],
    periodScores: [[], []],
    decide: [0, 0],
  }
  startPeriod(state)
  return state
}

/** Starters play Q1, Q3 and overtime; the bench spells the three most tired starters in Q2 and Q4. */
function setLineups(s: PlayState) {
  for (const team of [0, 1] as const) {
    const all = s.actors.filter((a) => a.team === team)
    const starters = all.filter((a) => (POSITIONS as readonly string[]).includes(a.slot))
    const bench = all.filter((a) => (BENCH_SLOTS as string[]).includes(a.slot))
    const lineup = [...starters]
    if (s.quarter === 2 || s.quarter === 4) {
      const tired = [...starters].sort((a, b) => a.stamina - b.stamina).slice(0, s.quarter === 2 ? 3 : 1)
      tired.forEach((t, i) => (lineup[lineup.indexOf(t)] = bench[i]))
    }
    for (const a of all) a.onCourt = false
    lineup.forEach((a, role) => {
      a.onCourt = true
      a.role = role
    })
    s.court[team] = lineup
  }
}

function startPeriod(s: PlayState) {
  setLineups(s)
  for (const a of s.actors) {
    a.stamina = Math.min(1, a.stamina + (a.onCourt ? 0.35 : 1))
    a.onFire = false
    a.makesInRow = 0
  }
  // Alternate who starts with the ball.
  giveBall(s, ((s.quarter + 1) % 2) as 0 | 1, true)
  for (const team of [0, 1] as const) {
    for (const a of s.court[team]) {
      // Everyone starts in their own half around the centre line.
      a.x = 47 - dirToward(team) * (6 + a.role * 3)
      a.y = clamp(spotFor(team, a.role).y, 4, 46)
      a.vx = a.vy = 0
    }
  }
  const handler = s.ball.holder!
  handler.x = 47 - dirToward(handler.team) * 4
  handler.y = 25
  s.ball.x = handler.x
  s.ball.y = handler.y
}

/** Possession change: the point guard brings it up from the backcourt. */
function giveBall(s: PlayState, team: 0 | 1, periodStart = false) {
  const pg = s.court[team][0]
  s.possession = team
  s.ball = { ...s.ball, state: 'held', holder: pg, target: null, passer: null, shot: null, z: 4, vx: 0, vy: 0, vz: 0, lastTouch: team, assistFrom: null, assistTimer: 0 }
  if (!periodStart) {
    const own = ownBasket(team)
    pg.x = own.x + dirToward(team) * 5
    pg.y = 25
    s.ball.x = pg.x
    s.ball.y = pg.y
  }
  s.shotClock = SHOT_CLOCK
  s.dead = DEAD_BALL
  s.meter = null
  updateControl(s)
}

function updateControl(s: PlayState) {
  if (s.userTeam === null) return
  const team = s.userTeam
  if (s.ball.state === 'held' && s.ball.holder?.team === team) {
    s.controlled = s.ball.holder
  } else if (s.ball.state === 'pass' && s.ball.target?.team === team) {
    s.controlled = s.ball.target
  } else if (!s.controlled || !s.controlled.onCourt || s.controlled.team !== team || s.possession !== team) {
    s.controlled = nearestTo(s.court[team], s.ball)
  }
}

function nearestTo(list: Actor[], p: Vec): Actor {
  return list.reduce((best, a) => (dist(a, p) < dist(best, p) ? a : best), list[0])
}

function say(s: PlayState, text: string, at: Vec, color = '#facc15') {
  s.texts.push({ text, x: at.x, y: at.y, t: 0, color })
}

/** Probability a shot from (x, y) goes in, before timing and blocks. */
export function shotChance(s: PlayState, shooter: Actor, at: Vec): { p: number; value: 2 | 3; d: number; superEff: boolean } {
  const b = basketOf(shooter.team)
  const d = dist(at, b)
  const three = d >= 22.5
  const r = shooter.r
  let p: number
  if (d < 5) p = 0.6 + (r.finishing - 60) * 0.006
  else if (!three) p = 0.46 - (d - 5) * 0.007 + ((r.shooting * 0.6 + r.finishing * 0.4) - 60) * 0.005
  else p = 0.37 - Math.max(0, d - 23.5) * 0.025 + (r.shooting - 60) * 0.0055
  const defenders = s.court[shooter.team === 0 ? 1 : 0]
  const nearest = nearestTo(defenders, at)
  const gap = dist(nearest, at)
  if (gap < 6) {
    const defRating = d < 10 ? nearest.r.interiorD : nearest.r.perimeterD
    p -= ((6 - gap) / 6) * (0.16 + (defRating - 60) * 0.002)
  }
  const matchup = clamp(bestMatchup(shooter.mon.types, nearest.mon.types), 0.5, 2)
  p += Math.log2(matchup) * 0.04
  if (shooter.onFire) p += 0.1
  p -= (1 - shooter.stamina) * 0.08
  p += (s.difficulty[shooter.team] - 0.4) * 0.14
  return { p: clamp(p, 0.04, 0.93), value: three ? 3 : 2, d, superEff: matchup > 1 && gap < 8 }
}

function release(s: PlayState, shooter: Actor, timing: number) {
  const at = { x: shooter.x, y: shooter.y }
  const { p, value, d, superEff } = shotChance(s, shooter, at)
  const chance = clamp(p + timing, 0.03, 0.97)
  const make = s.rng() < chance
  // AI shot-blocking at the release; the user's defender can also jump to block.
  const defenders = s.court[shooter.team === 0 ? 1 : 0]
  let blocked = false
  for (const dfn of defenders) {
    const gap = dist(dfn, at)
    if (gap > 3.4) continue
    const userJump = dfn === s.controlled && dfn.jump > 0
    const base = userJump ? 0.32 : d < 12 ? 0.07 : 0.03
    const pBlock = base + (dfn.r.interiorD - 60) * 0.003 + (dfn.radius - shooter.radius) * 0.05
    if (s.rng() < clamp(pBlock, 0, 0.6)) {
      blocked = true
      dfn.line.blk++
      say(s, 'BLOCKED!', dfn, '#f43f5e')
      break
    }
  }
  shooter.line.fga++
  if (value === 3) shooter.line.tpa++
  s.ball.state = 'shot'
  s.ball.holder = null
  s.ball.shot = { shooter, from: at, t: 0, dur: 0.5 + d / 45, value, make: make && !blocked, blocked, superEff, apex: RIM_Z + 2 + d * 0.3 }
  s.ball.z = 7
  s.meter = null
  if (blocked) {
    // Swatted: the ball pops loose near the shooter.
    const ang = s.rng() * Math.PI * 2
    loose(s, at, Math.cos(ang) * 14, Math.sin(ang) * 14, 6)
  }
}

function loose(s: PlayState, at: Vec, vx: number, vy: number, vz: number, z = 8) {
  s.ball = { ...s.ball, state: 'loose', holder: null, shot: null, target: null, x: at.x, y: at.y, z, vx, vy, vz }
}

function pass(s: PlayState, from: Actor, to: Actor) {
  s.ball.state = 'pass'
  s.ball.holder = null
  s.ball.passer = from
  s.ball.target = to
  s.meter = null
  updateControl(s)
}

function bestPassTarget(s: PlayState, from: Actor, aim?: Vec): Actor | null {
  const mates = s.court[from.team].filter((a) => a !== from)
  const defenders = s.court[from.team === 0 ? 1 : 0]
  let best: Actor | null = null
  let bestScore = -Infinity
  for (const m of mates) {
    const open = Math.min(...defenders.map((d) => dist(d, m)))
    let score = open - dist(from, m) * 0.15 - dist(m, basketOf(from.team)) * 0.08
    if (aim && (aim.x || aim.y)) {
      const dx = m.x - from.x
      const dy = m.y - from.y
      const len = Math.hypot(dx, dy) || 1
      score += ((dx * aim.x + dy * aim.y) / len) * 12
    }
    if (score > bestScore) {
      bestScore = score
      best = m
    }
  }
  return best
}

function steal(s: PlayState, thief: Actor, victim: Actor) {
  const p = clamp(0.3 + (thief.r.perimeterD - victim.r.playmaking) * 0.008, 0.08, 0.7)
  thief.cooldown = 0.8
  if (s.rng() < p) {
    victim.line.tov++
    thief.line.stl++
    say(s, 'STEAL!', thief, '#38bdf8')
    s.possession = thief.team
    s.ball = { ...s.ball, state: 'held', holder: thief, lastTouch: thief.team, assistFrom: null, assistTimer: 0 }
    s.shotClock = SHOT_CLOCK
    s.meter = null
    updateControl(s)
    return true
  }
  thief.stumble = 0.45
  return false
}

function turnover(s: PlayState, reason: string) {
  const team = s.possession
  const handler = s.ball.holder
  if (handler) handler.line.tov++
  say(s, reason, handler ?? s.ball, '#f97316')
  giveBall(s, team === 0 ? 1 : 0)
}

// ---------------------------------------------------------------- per-frame AI

function moveToward(a: Actor, target: Vec, speedFrac = 1) {
  const dx = target.x - a.x
  const dy = target.y - a.y
  const d = Math.hypot(dx, dy)
  if (d < 0.4) return { x: 0, y: 0 }
  const f = Math.min(1, d / 3) * speedFrac
  return { x: (dx / d) * f, y: (dy / d) * f }
}

function aiDesire(s: PlayState, a: Actor): Vec {
  const ball = s.ball
  const offense = a.team === s.possession
  if (ball.state === 'loose') {
    // Closest two from each team chase it; the rest drift back on defense.
    const mates = [...s.court[a.team]].sort((p, q) => dist(p, ball) - dist(q, ball))
    if (mates.indexOf(a) < 2) return moveToward(a, ball)
    return moveToward(a, offense ? spotFor(a.team, a.role) : guardPoint(s, a))
  }
  if (ball.state === 'shot') {
    // Crash the glass with the bigs, others get back.
    const rim = basketOf(s.possession)
    if (a.role >= 3) return moveToward(a, { x: rim.x - dirToward(s.possession) * 4, y: rim.y + (a.role === 3 ? -4 : 4) })
    return moveToward(a, offense ? spotFor(a.team, a.role) : guardPoint(s, a), 0.6)
  }
  if (offense) {
    if (ball.holder === a) return handlerMove(s, a)
    // Off-ball: space the floor, with an occasional basket cut.
    if (a.cutTimer > 0) return moveToward(a, { x: basketOf(a.team).x - dirToward(a.team) * 3, y: 25 })
    return moveToward(a, spotFor(a.team, a.role), 0.85)
  }
  return moveToward(a, guardPoint(s, a))
}

/**
 * Where a defender should stand: between their man and the basket, tighter on
 * the ball. When the ball handler attacks the paint, the defender closest to
 * the rim (other than the on-ball one) slides over to help; better clubs help
 * harder and guard the ball tighter.
 */
function guardPoint(s: PlayState, a: Actor): Vec {
  const opp = s.court[a.team === 0 ? 1 : 0]
  const mark = opp[a.role]
  const rim = ownBasket(a.team)
  const diff = s.difficulty[a.team]
  const dx = rim.x - mark.x
  const dy = rim.y - mark.y
  const d = Math.hypot(dx, dy) || 1
  const handler = s.ball.state === 'held' ? s.ball.holder : null
  const gap = handler === mark ? 2.9 - 0.9 * diff : Math.min(7, 3.5 + d * 0.1)
  const man = { x: mark.x + (dx / d) * gap, y: mark.y + (dy / d) * gap }
  if (handler && handler !== mark && handler.team !== a.team && dist(handler, rim) < 16) {
    const mates = s.court[a.team].filter((m) => opp[m.role] !== handler)
    const helper = mates.reduce((best, m) => (dist(m, rim) < dist(best, rim) ? m : best), mates[0])
    if (helper === a) {
      const hx = handler.x - rim.x
      const hy = handler.y - rim.y
      const hd = Math.hypot(hx, hy) || 1
      const help = { x: rim.x + (hx / hd) * 4, y: rim.y + (hy / hd) * 4 }
      const w = 0.35 + 0.6 * diff
      return { x: man.x + (help.x - man.x) * w, y: man.y + (help.y - man.y) * w }
    }
  }
  return man
}

function handlerMove(s: PlayState, a: Actor): Vec {
  const rim = basketOf(a.team)
  const defenders = s.court[a.team === 0 ? 1 : 0]
  const near = nearestTo(defenders, a)
  // Bring it up, then attack the rim, sliding away from the closest defender.
  const target = dist(a, rim) > 26 ? spotFor(a.team, 0) : rim
  const v = moveToward(a, target)
  const away = { x: a.x - near.x, y: a.y - near.y }
  const dn = Math.hypot(away.x, away.y) || 1
  if (dn < 5) {
    v.x += (away.y / dn) * 0.6 * (a.y < 25 ? 1 : -1)
    v.y += (-away.x / dn) * 0.6 * (a.y < 25 ? 1 : -1)
  }
  return v
}

function aiDecide(s: PlayState, a: Actor) {
  // Offensive decisions for an AI ball handler.
  const diff = s.difficulty[a.team]
  const { p, value, d } = shotChance(s, a, a)
  const ev = p * value
  const wantShot = d < 4.5 || ev > 1.02 - (14 - s.shotClock) * 0.02 || s.shotClock < 2.2
  if (wantShot && d < 30) {
    release(s, a, (diff - 0.5) * 0.06 + (s.rng() - 0.5) * 0.08)
    return
  }
  if (s.rng() < 0.32) {
    const to = bestPassTarget(s, a)
    if (to) pass(s, a, to)
  }
}

function aiDefend(s: PlayState, a: Actor, dt: number) {
  const handler = s.ball.holder
  if (!handler || a.cooldown > 0 || dist(a, handler) > 3.4) return
  const diff = s.difficulty[a.team]
  const rate = (0.12 + diff * 0.35) * (1 + (a.r.perimeterD - handler.r.playmaking) / 120)
  if (s.rng() < rate * dt) steal(s, a, handler)
}

// ---------------------------------------------------------------- step

export function step(s: PlayState, dt: number, input: PlayInput = NO_INPUT): void {
  for (const t of s.texts) t.t += dt
  s.texts = s.texts.filter((t) => t.t < 1.4)
  if (s.phase === 'final') return
  if (s.phase === 'break') {
    s.breakTimer -= dt
    if (s.breakTimer <= 0) {
      s.phase = 'live'
      startPeriod(s)
    }
    return
  }
  s.time += dt
  const user = s.userTeam !== null ? s.controlled : null

  if (s.dead > 0) {
    s.dead -= dt
  } else {
    s.clock -= dt
    if (s.ball.state !== 'shot') s.shotClock -= dt
  }

  // Timers
  for (const a of s.actors) {
    if (a.onCourt) a.seconds += dt
    a.stumble = Math.max(0, a.stumble - dt)
    a.jump = Math.max(0, a.jump - dt)
    a.cooldown = Math.max(0, a.cooldown - dt)
    a.cutTimer = Math.max(0, a.cutTimer - dt)
    if (a.onCourt && a.cutTimer <= 0 && s.rng() < 0.08 * dt) a.cutTimer = 1.2
  }

  // ---- user actions
  if (user && s.dead <= 0) userActions(s, user, input, dt)

  // ---- AI decisions (rate depends on difficulty)
  if (s.dead <= 0 && s.ball.state === 'held' && s.ball.holder && s.ball.holder !== user) {
    const team = s.ball.holder.team
    s.decide[team] -= dt
    if (s.decide[team] <= 0) {
      s.decide[team] = 0.42 - 0.22 * s.difficulty[team] + s.rng() * 0.1
      aiDecide(s, s.ball.holder)
    }
  }
  if (s.ball.state === 'held') {
    for (const a of s.court[s.possession === 0 ? 1 : 0]) if (a !== user) aiDefend(s, a, dt)
  }

  // ---- movement
  for (const team of [0, 1] as const) {
    for (const a of s.court[team]) {
      let want: Vec
      let turbo = false
      if (a === user) {
        want = s.meter !== null ? { x: 0, y: 0 } : input.move
        turbo = input.turbo
      } else {
        want = s.dead > 0 && s.ball.holder === a ? { x: 0, y: 0 } : aiDesire(s, a)
        turbo = s.ball.state === 'loose' || (team !== s.possession && dist(a, s.ball) > 15)
      }
      const fatigue = 0.75 + 0.25 * a.stamina
      const aiBoost = a === user ? 1 : 0.94 + 0.08 * s.difficulty[team]
      const top = (12 + a.r.athleticism * 0.09) * fatigue * aiBoost * (a.onFire ? 1.08 : 1) * (a.stumble > 0 ? 0.35 : 1)
      const boost = turbo && a.stamina > 0.15 ? 1.35 : 1
      const mag = Math.min(1, Math.hypot(want.x, want.y))
      const tx = want.x * top * boost
      const ty = want.y * top * boost
      // Quick acceleration, arcade feel.
      a.vx += (tx - a.vx) * Math.min(1, dt * 9)
      a.vy += (ty - a.vy) * Math.min(1, dt * 9)
      a.x = clamp(a.x + a.vx * dt, 0.8, COURT.w - 0.8)
      a.y = clamp(a.y + a.vy * dt, 0.8, COURT.h - 0.8)
      const drain = boost > 1 ? 0.07 : 0.012 * mag
      a.stamina = clamp(a.stamina - drain * dt + (mag < 0.2 ? 0.03 * dt : 0), 0, 1)
    }
  }
  separate(s)

  // ---- ball
  updateBall(s, dt)

  // ---- clocks
  if (s.ball.state === 'held' && s.shotClock <= 0 && s.dead <= 0) turnover(s, 'SHOT CLOCK!')
  if (s.clock <= 0 && s.ball.state !== 'shot') endPeriod(s)
}

function userActions(s: PlayState, user: Actor, input: PlayInput, dt: number) {
  const ball = s.ball
  const hasBall = ball.state === 'held' && ball.holder === user
  if (hasBall) {
    if (input.shoot) {
      s.meter = (s.meter ?? 0) + dt / 0.8
      if (s.meter >= 1.25) userRelease(s, user)
    } else if (s.meter !== null) {
      userRelease(s, user)
    } else if (input.pass) {
      const to = bestPassTarget(s, user, input.move)
      if (to) pass(s, user, to)
    }
    return
  }
  s.meter = null
  if (s.possession !== user.team || ball.state === 'loose') {
    if (input.pass && s.possession !== user.team) {
      // Switch to the defender closest to the ball.
      s.controlled = nearestTo(s.court[user.team].filter((a) => a !== user), ball)
      return
    }
    if (input.action && user.cooldown <= 0) {
      user.jump = 0.4
      user.cooldown = 0.6
      if (ball.state === 'held' && ball.holder && dist(user, ball.holder) < 4) {
        steal(s, user, ball.holder)
      } else if (ball.state === 'shot' && ball.shot && ball.shot.t < 0.3 && !ball.shot.blocked && dist(user, ball.shot.from) < 4.5) {
        const shooter = ball.shot.shooter
        const p = clamp(0.3 + (user.r.interiorD - 60) * 0.004 + (user.radius - shooter.radius) * 0.06, 0.08, 0.65)
        if (s.rng() < p) {
          ball.shot.make = false
          ball.shot.blocked = true
          user.line.blk++
          say(s, 'BLOCKED!', user, '#f43f5e')
          const ang = s.rng() * Math.PI * 2
          loose(s, ball, Math.cos(ang) * 14, Math.sin(ang) * 14, 6)
        }
      }
    }
  }
}

/** Timing window: the sweet spot is near the top of the meter. */
export function timingBonus(meter: number): { bonus: number; label: string | null } {
  const off = Math.abs(meter - 0.85)
  if (off <= 0.05) return { bonus: 0.12, label: 'PERFECT!' }
  if (off <= 0.14) return { bonus: 0.04, label: null }
  return { bonus: meter < 0.85 ? -0.12 : -0.16, label: meter < 0.85 ? 'EARLY' : 'LATE' }
}

function userRelease(s: PlayState, user: Actor) {
  const { bonus, label } = timingBonus(s.meter ?? 0)
  if (label) say(s, label, { x: user.x, y: user.y - 2.5 }, label === 'PERFECT!' ? '#22c55e' : '#f97316')
  release(s, user, bonus)
}

function separate(s: PlayState) {
  const all = [...s.court[0], ...s.court[1]]
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]
      const b = all[j]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const d = Math.hypot(dx, dy) || 0.01
      const min = (a.radius + b.radius) * 0.8
      if (d < min) {
        const push = (min - d) / 2
        a.x -= (dx / d) * push
        a.y -= (dy / d) * push
        b.x += (dx / d) * push
        b.y += (dy / d) * push
      }
    }
  }
}

function updateBall(s: PlayState, dt: number) {
  const ball = s.ball
  ball.assistTimer = Math.max(0, ball.assistTimer - dt)
  if (ball.state === 'held' && ball.holder) {
    const h = ball.holder
    // Dribble bob.
    ball.x = h.x + h.radius * 0.6 * dirToward(h.team)
    ball.y = h.y + 0.6
    ball.z = s.meter !== null ? 7 : 1.5 + Math.abs(Math.sin(s.time * 9)) * 2.5
    return
  }
  if (ball.state === 'pass' && ball.target) {
    const t = ball.target
    const dx = t.x - ball.x
    const dy = t.y - ball.y
    const d = Math.hypot(dx, dy)
    const sp = 48 * dt
    if (d <= sp + t.radius * 0.5) {
      catchPass(s, t)
      return
    }
    ball.x += (dx / d) * sp
    ball.y += (dy / d) * sp
    ball.z = 4
    // Interceptions by defenders in the lane.
    for (const dfn of s.court[t.team === 0 ? 1 : 0]) {
      if (dist(dfn, ball) < dfn.radius + 0.6 && s.rng() < (0.25 + dfn.r.perimeterD * 0.004) * (dt * 60) * 0.25) {
        if (ball.passer) ball.passer.line.tov++
        dfn.line.stl++
        say(s, 'PICKED OFF!', dfn, '#38bdf8')
        s.possession = dfn.team
        s.ball = { ...ball, state: 'held', holder: dfn, target: null, passer: null, lastTouch: dfn.team, assistFrom: null }
        s.shotClock = SHOT_CLOCK
        updateControl(s)
        return
      }
    }
    return
  }
  if (ball.state === 'shot' && ball.shot) {
    const sh = ball.shot
    sh.t += dt
    const k = Math.min(1, sh.t / sh.dur)
    const rim = basketOf(sh.shooter.team)
    ball.x = sh.from.x + (rim.x - sh.from.x) * k
    ball.y = sh.from.y + (rim.y - sh.from.y) * k
    ball.z = 7 + (RIM_Z - 7) * k + 4 * (sh.apex - RIM_Z) * k * (1 - k)
    if (k >= 1) resolveShot(s, sh)
    return
  }
  if (ball.state === 'loose') {
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt
    ball.vz -= 32 * dt
    ball.z += ball.vz * dt
    if (ball.z < 0) {
      ball.z = 0
      ball.vz = -ball.vz * 0.5
      ball.vx *= 0.8
      ball.vy *= 0.8
    }
    if (ball.x < 0.5 || ball.x > COURT.w - 0.5) ball.vx = -ball.vx
    if (ball.y < 0.5 || ball.y > COURT.h - 0.5) ball.vy = -ball.vy
    ball.x = clamp(ball.x, 0.5, COURT.w - 0.5)
    ball.y = clamp(ball.y, 0.5, COURT.h - 0.5)
    ball.vx *= 1 - dt * 0.6
    ball.vy *= 1 - dt * 0.6
    if (ball.z > 9) return
    // Whoever can reach it grabs it; rebounding extends reach.
    let best: Actor | null = null
    let bestScore = -Infinity
    for (const a of [...s.court[0], ...s.court[1]]) {
      const reach = a.radius + 0.6 + a.r.rebounding / 70
      if (dist(a, ball) > reach) continue
      const score = a.r.rebounding + s.rng() * 40
      if (score > bestScore) {
        bestScore = score
        best = a
      }
    }
    if (best) {
      best.line.reb++
      const changed = best.team !== s.possession
      s.possession = best.team
      s.ball = { ...ball, state: 'held', holder: best, lastTouch: best.team, assistFrom: null, assistTimer: 0, vx: 0, vy: 0 }
      s.shotClock = SHOT_CLOCK
      if (changed) s.meter = null
      updateControl(s)
    }
  }
}

function catchPass(s: PlayState, to: Actor) {
  const passer = s.ball.passer
  s.ball = { ...s.ball, state: 'held', holder: to, target: null, passer: null, lastTouch: to.team, assistFrom: passer, assistTimer: 3 }
  updateControl(s)
}

function resolveShot(s: PlayState, sh: Shot) {
  const shooter = sh.shooter
  const team = shooter.team
  if (sh.make) {
    s.score[team] += sh.value
    shooter.line.fgm++
    shooter.line.pts += sh.value
    if (sh.value === 3) shooter.line.tpm++
    if (s.ball.assistFrom && s.ball.assistTimer > 0 && s.ball.assistFrom !== shooter) s.ball.assistFrom.line.ast++
    say(s, `+${sh.value}`, basketOf(team), sh.value === 3 ? '#facc15' : '#ffffff')
    if (sh.superEff) {
      shooter.line.superEff++
      say(s, 'SUPER EFFECTIVE!', { x: basketOf(team).x - dirToward(team) * 6, y: BASKET_Y - 5 }, '#22c55e')
    }
    shooter.makesInRow++
    if (shooter.makesInRow >= 3 && !shooter.onFire) {
      shooter.onFire = true
      say(s, 'ON FIRE!', shooter, '#f97316')
    }
    // Scoring puts the other team's fire out.
    for (const a of s.actors) if (a.team !== team) a.onFire = false
    giveBall(s, team === 0 ? 1 : 0)
    return
  }
  shooter.makesInRow = 0
  const rim = basketOf(team)
  const ang = (team === 0 ? Math.PI : 0) + (s.rng() - 0.5) * 2.4
  const sp = 9 + s.rng() * 9
  loose(s, rim, Math.cos(ang) * sp, Math.sin(ang) * sp, 7, RIM_Z)
}

function endPeriod(s: PlayState) {
  s.periodSeconds.push(s.quarterSeconds)
  for (const team of [0, 1] as const) {
    const before = s.periodScores[team].reduce((a, b) => a + b, 0)
    s.periodScores[team].push(s.score[team] - before)
  }
  if (s.quarter >= 4 && s.score[0] !== s.score[1]) {
    s.phase = 'final'
    s.clock = 0
    return
  }
  s.quarter++
  s.quarterSeconds = s.quarter > 4 ? OT_SECONDS : s.quarterSeconds
  s.clock = s.quarterSeconds
  s.phase = 'break'
  s.breakTimer = BREAK_SECONDS
}

export function periodLabel(q: number): string {
  return q <= 4 ? `Q${q}` : q === 5 ? 'OT' : `${q - 4}OT`
}

/** Box score in the same shape as simulated games, so the existing box score UI can show it. */
export function toGameResult(s: PlayState): GameResult {
  const total = s.periodSeconds.reduce((a, b) => a + b, 0) || 1
  const minutes = 48 + Math.max(0, s.periodSeconds.length - 4) * 5
  const lines = (team: 0 | 1) =>
    s.actors.filter((a) => a.team === team).map((a) => ({ ...a.line, min: Math.round((a.seconds / total) * minutes) }))
  return {
    homeId: s.teams[0].id,
    awayId: s.teams[1].id,
    homeScore: s.score[0],
    awayScore: s.score[1],
    overtimes: Math.max(0, s.periodSeconds.length - 4),
    quarters: { home: [...s.periodScores[0]], away: [...s.periodScores[1]] },
    box: { home: lines(0), away: lines(1) },
  }
}
