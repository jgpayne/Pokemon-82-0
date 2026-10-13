import { describe, expect, it } from 'vitest'
import { getPokemonByName } from '../data/pokedex'
import { autoAssign, getAiTeams, userTeam } from '../engine/league'
import { makeRng } from '../engine/rng'
import { createGame, step, timingBonus, toGameResult, type PlayInput, type PlayState } from './engine'
import { LADDER } from './ladder'

const DT = 1 / 60
const ai = getAiTeams()
const club = (id: string) => ai.find((t) => t.id === id)!

function play(s: PlayState, input?: (s: PlayState, t: number) => PlayInput, maxSeconds = 900) {
  let t = 0
  while (s.phase !== 'final' && t < maxSeconds) {
    step(s, DT, input?.(s, t))
    t += DT
  }
  return t
}

describe('live game engine', () => {
  it('plays a full AI-vs-AI game to a decisive final with sane box scores', () => {
    const s = createGame({ home: club('leon'), away: club('morty'), seed: 'a', difficulty: [0.5, 0.5], userTeam: null })
    const seconds = play(s)
    expect(s.phase).toBe('final')
    expect(seconds).toBeLessThan(600)
    expect(s.score[0]).not.toBe(s.score[1])
    const r = toGameResult(s)
    for (const side of [r.box!.home, r.box!.away]) {
      expect(side).toHaveLength(8)
      expect(side.reduce((a, l) => a + l.pts, 0)).toBe(side === r.box!.home ? s.score[0] : s.score[1])
      for (const l of side) expect(l.fgm).toBeLessThanOrEqual(l.fga)
    }
    expect(r.quarters.home.reduce((a, b) => a + b, 0)).toBe(s.score[0])
  })

  it('is deterministic for a seed', () => {
    const a = createGame({ home: club('cynthia'), away: club('elesa'), seed: 'same', difficulty: [0.5, 0.5], userTeam: null })
    const b = createGame({ home: club('cynthia'), away: club('elesa'), seed: 'same', difficulty: [0.5, 0.5], userTeam: null })
    play(a)
    play(b)
    expect(a.score).toEqual(b.score)
  })

  it('produces arcade-length games where stronger teams usually win', () => {
    let strongWins = 0
    const totals: number[] = []
    for (let i = 0; i < 12; i++) {
      const s = createGame({ home: club('leon'), away: club('morty'), seed: `w${i}`, difficulty: [0.5, 0.5], userTeam: null })
      play(s)
      totals.push(s.score[0] + s.score[1])
      if (s.score[0] > s.score[1]) strongWins++
    }
    const avg = totals.reduce((a, b) => a + b) / totals.length
    console.log(JSON.stringify({ strongWins, avgCombinedScore: avg }))
    expect(strongWins).toBeGreaterThanOrEqual(8)
    expect(avg).toBeGreaterThan(30)
    expect(avg).toBeLessThan(180)
  })

  it('handles a button-mashing human on the user team without getting stuck', () => {
    const roster = autoAssign(['Pikachu', 'Lucario', 'Garchomp', 'Snorlax', 'Gengar', 'Dragonite', 'Gardevoir', 'Tyranitar'].map(getPokemonByName))
    const rng = makeRng('mash')
    const s = createGame({ home: userTeam(roster), away: club('morty'), seed: 'm', difficulty: [0.5, 0.2], userTeam: 0 })
    let holdShoot = 0
    play(s, () => {
      if (holdShoot > 0) holdShoot--
      else if (rng() < 0.02) holdShoot = Math.floor(rng() * 70)
      return {
        move: { x: rng() * 2 - 1, y: rng() * 2 - 1 },
        shoot: holdShoot > 0,
        pass: rng() < 0.01,
        action: rng() < 0.03,
        turbo: rng() < 0.3,
      }
    })
    expect(s.phase).toBe('final')
    expect(s.score[0] + s.score[1]).toBeGreaterThan(10)
    expect(s.controlled?.team).toBe(0)
  })

  it('rewards releasing the shot meter near the top', () => {
    expect(timingBonus(0.85).label).toBe('PERFECT!')
    expect(timingBonus(0.85).bonus).toBeGreaterThan(timingBonus(0.75).bonus)
    expect(timingBonus(0.4).bonus).toBeLessThan(0)
    expect(timingBonus(1.2).bonus).toBeLessThan(0)
  })

  it('builds a 13-step gym ladder of real clubs with rising difficulty', () => {
    expect(LADDER).toHaveLength(13)
    for (const step of LADDER) expect(ai.some((t) => t.id === step.clubId)).toBe(true)
    expect(LADDER[0].difficulty).toBe(0)
    expect(LADDER[12]).toMatchObject({ stage: 'Champion', difficulty: 1 })
  })
})
