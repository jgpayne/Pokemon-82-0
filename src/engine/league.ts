import { getPokemonByName, type Pokemon } from '../data/pokedex'
import { OPPONENTS, type Conference } from '../data/opponents'
import { BENCH_SLOTS, bestPosition, POSITIONS, positionOverall, teamOverall, type Roster, type Slot } from './ratings'
import { makeRng, shuffle, type Rng } from './rng'
import { simGame, type GameResult, type PlayerLine, type Team } from './sim'

export const SEASON_GAMES = 82

/** Best starting five + bench order for an AI roster (brute force over 8P5). */
export function autoAssign(mons: Pokemon[]): Record<Slot, Pokemon> {
  let best: { score: number; five: Pokemon[] } = { score: -1, five: [] }
  const walk = (chosen: Pokemon[]) => {
    if (chosen.length === 5) {
      const score = chosen.reduce((s, m, i) => s + positionOverall(m, POSITIONS[i]), 0)
      if (score > best.score) best = { score, five: [...chosen] }
      return
    }
    for (const m of mons) if (!chosen.includes(m)) walk([...chosen, m])
  }
  walk([])
  const bench = mons.filter((m) => !best.five.includes(m)).sort((a, b) => bestPosition(b).ovr - bestPosition(a).ovr)
  const roster = {} as Record<Slot, Pokemon>
  POSITIONS.forEach((p, i) => (roster[p] = best.five[i]))
  BENCH_SLOTS.forEach((s, i) => (roster[s] = bench[i]))
  return roster
}

let aiTeams: Team[] | null = null
export function getAiTeams(): Team[] {
  aiTeams ??= OPPONENTS.map((o) => ({
    id: o.id,
    city: o.city,
    name: o.name,
    abbr: o.abbr,
    coach: o.coach,
    color: o.color,
    conference: o.conference,
    roster: autoAssign(o.roster.map(getPokemonByName)),
  }))
  return aiTeams
}

export function userTeam(roster: Record<Slot, Pokemon>, name = 'Your Squad'): Team {
  return {
    id: 'user',
    city: 'Pallet Town',
    name,
    abbr: 'YOU',
    coach: 'You',
    color: '#EF4444',
    conference: 'Indigo',
    roster,
    isUser: true,
  }
}

export interface ScheduledGame {
  index: number
  opponentId: string
  home: boolean
  result: GameResult
  userWon: boolean
  userScore: number
  oppScore: number
  wins: number
  losses: number
}

export interface Standing {
  teamId: string
  wins: number
  losses: number
}

export interface Series {
  round: number
  conference: Conference | 'Finals'
  highSeed: { teamId: string; seed: number }
  lowSeed: { teamId: string; seed: number }
  games: { home: string; result: GameResult }[]
  highWins: number
  lowWins: number
  winnerId: string
}

export type PlayoffFinish = 'Missed Playoffs' | 'First Round' | 'Conference Semis' | 'Conference Finals' | 'League Finals' | 'Champion'

export interface PlayerSeason {
  id: number
  slot: Slot
  gp: number
  totals: Omit<PlayerLine, 'id' | 'slot'>
}

export interface SeasonResult {
  seed: string
  teams: Team[]
  games: ScheduledGame[]
  standings: Standing[]
  playoffs: Series[]
  finish: PlayoffFinish
  wins: number
  losses: number
  longestStreak: number
  playerSeasons: PlayerSeason[]
  playoffWins: number
  playoffLosses: number
}

function userSchedule(rng: Rng, opponents: Team[]): { opponentId: string; home: boolean }[] {
  const games: { opponentId: string; home: boolean }[] = []
  for (const o of opponents) {
    games.push({ opponentId: o.id, home: true }, { opponentId: o.id, home: false })
  }
  // Fill to 82 with a third meeting, conference rivals first.
  const extra = shuffle(rng, opponents).sort((a, b) => Number(b.conference === 'Indigo') - Number(a.conference === 'Indigo'))
  for (const o of extra.slice(0, SEASON_GAMES - games.length)) games.push({ opponentId: o.id, home: rng() < 0.5 })
  return shuffle(rng, games)
}

const emptyTotals = (): PlayerSeason['totals'] => ({
  min: 0, pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, tov: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, superEff: 0,
})

function bestOfSeven(rng: Rng, high: Team, low: Team): { games: Series['games']; highWins: number; lowWins: number } {
  const homePattern = [true, true, false, false, true, false, true]
  const games: Series['games'] = []
  let hw = 0
  let lw = 0
  for (let g = 0; hw < 4 && lw < 4; g++) {
    const highHome = homePattern[g]
    const [home, away] = highHome ? [high, low] : [low, high]
    const result = simGame(rng, home, away, home.isUser || away.isUser)
    games.push({ home: home.id, result })
    const homeWon = result.homeScore > result.awayScore
    if (homeWon === highHome) hw++
    else lw++
  }
  return { games, highWins: hw, lowWins: lw }
}

export function runSeason(seed: string, roster: Record<Slot, Pokemon>, teamName?: string): SeasonResult {
  const rng = makeRng(`${seed}:season`)
  const user = userTeam(roster, teamName)
  const ai = getAiTeams()
  const teams = [user, ...ai]
  const byId = new Map(teams.map((t) => [t.id, t]))
  const record = new Map(teams.map((t) => [t.id, { wins: 0, losses: 0 }]))
  const gamesPlayed = new Map(teams.map((t) => [t.id, 0]))
  const playerTotals = new Map<number, PlayerSeason>()

  const bump = (winner: string, loser: string) => {
    record.get(winner)!.wins++
    record.get(loser)!.losses++
    gamesPlayed.set(winner, gamesPlayed.get(winner)! + 1)
    gamesPlayed.set(loser, gamesPlayed.get(loser)! + 1)
  }

  const addUserBox = (lines: PlayerLine[]) => {
    for (const l of lines) {
      const ps = playerTotals.get(l.id) ?? { id: l.id, slot: l.slot, gp: 0, totals: emptyTotals() }
      ps.gp++
      for (const k of Object.keys(ps.totals) as (keyof PlayerSeason['totals'])[]) ps.totals[k] += l[k]
      playerTotals.set(l.id, ps)
    }
  }

  const games: ScheduledGame[] = []
  let streak = 0
  let longestStreak = 0
  userSchedule(rng, ai).forEach((g, index) => {
    const opp = byId.get(g.opponentId)!
    const [home, away] = g.home ? [user, opp] : [opp, user]
    const result = simGame(rng, home, away, true)
    const userScore = g.home ? result.homeScore : result.awayScore
    const oppScore = g.home ? result.awayScore : result.homeScore
    const userWon = userScore > oppScore
    bump(userWon ? 'user' : opp.id, userWon ? opp.id : 'user')
    addUserBox(g.home ? result.box!.home : result.box!.away)
    streak = userWon ? streak + 1 : 0
    longestStreak = Math.max(longestStreak, streak)
    const r = record.get('user')!
    games.push({ index, opponentId: opp.id, home: g.home, result, userWon, userScore, oppScore, wins: r.wins, losses: r.losses })
  })

  // AI vs AI: pair teams that still need games until everyone reaches 82.
  let guard = 0
  while (guard++ < 5000) {
    const needing = ai.filter((t) => gamesPlayed.get(t.id)! < SEASON_GAMES)
    if (needing.length < 2) break
    needing.sort((a, b) => gamesPlayed.get(a.id)! - gamesPlayed.get(b.id)!)
    const a = needing[0]
    const b = needing[1 + Math.floor(rng() * (needing.length - 1))]
    const r = simGame(rng, a, b)
    bump(r.homeScore > r.awayScore ? a.id : b.id, r.homeScore > r.awayScore ? b.id : a.id)
  }
  // A leftover odd team plays a random opponent that doesn't count for the other side.
  for (const t of ai) {
    while (gamesPlayed.get(t.id)! < SEASON_GAMES) {
      const opp = ai[Math.floor(rng() * ai.length)]
      if (opp === t) continue
      const r = simGame(rng, t, opp)
      const rec = record.get(t.id)!
      if (r.homeScore > r.awayScore) rec.wins++
      else rec.losses++
      gamesPlayed.set(t.id, gamesPlayed.get(t.id)! + 1)
    }
  }

  const ovr = new Map(teams.map((t) => [t.id, teamOverall(t.roster as Roster)]))
  const standings: Standing[] = teams
    .map((t) => ({ teamId: t.id, ...record.get(t.id)! }))
    .sort((a, b) => b.wins - a.wins || ovr.get(b.teamId)! - ovr.get(a.teamId)!)

  // Playoffs: top 8 in each conference, 1v8 / 4v5 / 3v6 / 2v7 bracket.
  const playoffs: Series[] = []
  const playSeries = (round: number, conference: Series['conference'], a: { teamId: string; seed: number }, b: { teamId: string; seed: number }) => {
    const aRec = record.get(a.teamId)!
    const bRec = record.get(b.teamId)!
    const aHigh = a.seed < b.seed || (a.seed === b.seed && aRec.wins >= bRec.wins)
    const [high, low] = aHigh ? [a, b] : [b, a]
    const s = bestOfSeven(rng, byId.get(high.teamId)!, byId.get(low.teamId)!)
    const series: Series = { round, conference, highSeed: high, lowSeed: low, ...s, winnerId: s.highWins === 4 ? high.teamId : low.teamId }
    playoffs.push(series)
    return series.winnerId === high.teamId ? high : low
  }

  const confChamps: { teamId: string; seed: number }[] = []
  for (const conf of ['Indigo', 'Kanto'] as Conference[]) {
    const seeds = standings
      .filter((s) => byId.get(s.teamId)!.conference === conf)
      .slice(0, 8)
      .map((s, i) => ({ teamId: s.teamId, seed: i + 1 }))
    let round = [[0, 7], [3, 4], [2, 5], [1, 6]].map(([x, y]) => [seeds[x], seeds[y]] as const)
    let r = 1
    while (round.length) {
      const winners = round.map(([x, y]) => playSeries(r, conf, x, y))
      if (winners.length === 1) {
        confChamps.push(winners[0])
        break
      }
      round = []
      for (let i = 0; i < winners.length; i += 2) round.push([winners[i], winners[i + 1]])
      r++
    }
  }
  // Finals: better regular season record gets home court.
  const [c1, c2] = confChamps
  const finalsHigh = record.get(c1.teamId)!.wins >= record.get(c2.teamId)!.wins ? c1 : c2
  const finalsLow = finalsHigh === c1 ? c2 : c1
  playSeries(4, 'Finals', { teamId: finalsHigh.teamId, seed: 1 }, { teamId: finalsLow.teamId, seed: 2 })

  const userSeries = playoffs.filter((s) => s.highSeed.teamId === 'user' || s.lowSeed.teamId === 'user')
  let finish: PlayoffFinish = 'Missed Playoffs'
  let playoffWins = 0
  let playoffLosses = 0
  if (userSeries.length) {
    const last = userSeries[userSeries.length - 1]
    const names: PlayoffFinish[] = ['First Round', 'Conference Semis', 'Conference Finals', 'League Finals']
    finish = last.winnerId === 'user' && last.round === 4 ? 'Champion' : names[last.round - 1]
    for (const s of userSeries) {
      const userHigh = s.highSeed.teamId === 'user'
      playoffWins += userHigh ? s.highWins : s.lowWins
      playoffLosses += userHigh ? s.lowWins : s.highWins
    }
  }

  const user82 = record.get('user')!
  return {
    seed,
    teams,
    games,
    standings,
    playoffs,
    finish,
    wins: user82.wins,
    losses: user82.losses,
    longestStreak,
    playerSeasons: [...playerTotals.values()],
    playoffWins,
    playoffLosses,
  }
}
