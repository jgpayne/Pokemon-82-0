import { describe, expect, it } from 'vitest'
import { getPokemonByName, POKEDEX } from '../data/pokedex'
import { OPPONENTS } from '../data/opponents'
import { choicesFor, spin, WHEEL } from './draft'
import { autoAssign, getAiTeams, runSeason } from './league'
import { bestPosition, ratingsFor, teamOverall, type Roster } from './ratings'
import { makeRng } from './rng'
import { simGame } from './sim'

const names = (ns: string[]) => ns.map(getPokemonByName)

describe('ratings', () => {
  it('keeps every rating in 25–99', () => {
    for (const p of POKEDEX) {
      for (const v of Object.values(ratingsFor(p))) {
        expect(v).toBeGreaterThanOrEqual(25)
        expect(v).toBeLessThanOrEqual(99)
      }
    }
  })

  it('makes sense for archetypes', () => {
    expect(ratingsFor(getPokemonByName('Alakazam')).shooting).toBeGreaterThan(ratingsFor(getPokemonByName('Snorlax')).shooting)
    expect(ratingsFor(getPokemonByName('Snorlax')).rebounding).toBeGreaterThan(ratingsFor(getPokemonByName('Pikachu')).rebounding)
    expect(['PF', 'C']).toContain(bestPosition(getPokemonByName('Onix')).pos)
    expect(['PG', 'SG']).toContain(bestPosition(getPokemonByName('Jolteon')).pos)
  })
})

describe('data', () => {
  it('resolves every opponent roster to 8 unique Pokémon', () => {
    for (const o of OPPONENTS) {
      expect(new Set(names(o.roster).map((p) => p.id)).size).toBe(8)
    }
    expect(OPPONENTS).toHaveLength(29)
  })
})

describe('draft', () => {
  it('offers up to five matching, undrafted choices', () => {
    const rng = makeRng('draft')
    for (let i = 0; i < 50; i++) {
      const res = spin(rng)
      expect(WHEEL).toContain(res)
      const taken = new Set([25, 6])
      const choices = choicesFor(rng, res, taken)
      expect(choices.length).toBeGreaterThanOrEqual(3)
      expect(choices.length).toBeLessThanOrEqual(5)
      for (const c of choices) {
        expect(taken.has(c.id)).toBe(false)
        if (res !== 'wild') expect(c.types).toContain(res)
      }
    }
  })
})

describe('sim', () => {
  const ai = getAiTeams()
  it('is deterministic for a seed', () => {
    const a = simGame(makeRng('x'), ai[0], ai[1], true)
    const b = simGame(makeRng('x'), ai[0], ai[1], true)
    expect(a).toEqual(b)
  })

  it('produces realistic scores', () => {
    const rng = makeRng('scores')
    let total = 0
    for (let i = 0; i < 200; i++) {
      const g = simGame(rng, ai[i % 29], ai[(i + 7) % 29])
      total += g.homeScore + g.awayScore
      expect(g.homeScore).not.toBe(g.awayScore)
    }
    const avg = total / 400
    expect(avg).toBeGreaterThan(85)
    expect(avg).toBeLessThan(125)
  })

  it('runs a full season with a valid playoff bracket', () => {
    const roster = autoAssign(names(['Mewtwo', 'Dragonite', 'Snorlax', 'Gengar', 'Alakazam', 'Arcanine', 'Gyarados', 'Starmie']))
    const s = runSeason('test', roster)
    expect(s.games).toHaveLength(82)
    expect(s.wins + s.losses).toBe(82)
    expect(s.playoffs).toHaveLength(15)
    for (const st of s.standings) expect(st.wins + st.losses).toBe(82)
  })
})

describe('balance', () => {
  const ai = getAiTeams()
  const seasonWins = (roster: Roster, seasons: number) => {
    const team = { ...ai[0], id: 'u', isUser: true, roster: roster as Required<Roster> }
    const out: number[] = []
    for (let s = 0; s < seasons; s++) {
      const rng = makeRng(`bal${s}`)
      let w = 0
      for (let g = 0; g < 82; g++) {
        const opp = ai[g % 29]
        const r = simGame(rng, team, opp)
        if (r.homeScore > r.awayScore) w++
      }
      out.push(w)
    }
    return out
  }

  it('rewards a stacked draft and punishes a weak one', () => {
    const dream = autoAssign(names(['Mewtwo', 'Dragonite', 'Snorlax', 'Gengar', 'Alakazam', 'Zapdos', 'Gyarados', 'Starmie']))
    const weak = autoAssign(names(['Magikarp', 'Caterpie', 'Weedle', 'Metapod', 'Kakuna', 'Pidgey', 'Rattata', 'Diglett']))
    const dreamWins = seasonWins(dream, 20)
    const weakWins = seasonWins(weak, 5)
    const report = {
      dreamOvr: teamOverall(dream),
      weakOvr: teamOverall(weak),
      dream: dreamWins,
      weak: weakWins,
      aiOvr: ai.map((t) => `${t.abbr}:${teamOverall(t.roster)}`).join(' '),
    }
    console.log(JSON.stringify(report))
    expect(Math.max(...weakWins)).toBeLessThan(15)
    expect(dreamWins.reduce((a, b) => a + b) / dreamWins.length).toBeGreaterThan(74)
  })
})
