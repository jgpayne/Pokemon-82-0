#!/usr/bin/env node
// Builds src/data/pokemon.json and public/sprites/*.webp for every species (#1–1025)
// from the PokeAPI data + sprites repos on GitHub. Output is committed, so the
// Docker build never needs network access. Requires ImageMagick (`convert`).
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync, existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
const ART = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/'
const MAX_ID = 1025

async function csv(name) {
  const res = await fetch(CSV + name + '.csv')
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`)
  const [header, ...rows] = (await res.text()).trim().split('\n')
  const cols = header.split(',')
  // None of the columns we read contain quoted commas.
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, i) => [cols[i], v])))
}

const STAT_KEYS = { 1: 'hp', 2: 'atk', 3: 'def', 4: 'spa', 5: 'spd', 6: 'spe' }

const [pokemon, stats, ptypes, types, names, species] = await Promise.all(
  ['pokemon', 'pokemon_stats', 'pokemon_types', 'types', 'pokemon_species_names', 'pokemon_species'].map(csv),
)

const typeName = Object.fromEntries(types.map((t) => [t.id, t.identifier]))
const speciesById = Object.fromEntries(species.map((s) => [s.id, s]))

function stage(id) {
  let n = 1
  let s = speciesById[id]
  while (s?.evolves_from_species_id) {
    n++
    s = speciesById[s.evolves_from_species_id]
  }
  return n
}

const out = []
for (let id = 1; id <= MAX_ID; id++) {
  const p = pokemon.find((r) => +r.id === id)
  const sp = speciesById[id]
  const base = {}
  for (const s of stats.filter((r) => +r.pokemon_id === id)) base[STAT_KEYS[s.stat_id]] = +s.base_stat
  out.push({
    id,
    name: names.find((n) => +n.pokemon_species_id === id && n.local_language_id === '9').name,
    types: ptypes
      .filter((r) => +r.pokemon_id === id)
      .sort((a, b) => a.slot - b.slot)
      .map((r) => typeName[r.type_id]),
    heightDm: +p.height,
    weightHg: +p.weight,
    stats: base,
    gen: +sp.generation_id,
    stage: stage(id),
    chain: +sp.evolution_chain_id,
    evolves: species.some((s) => s.evolves_from_species_id === String(id)),
    legendary: sp.is_legendary === '1' || sp.is_mythical === '1',
  })
}

writeFileSync(join(ROOT, 'src/data/pokemon.json'), JSON.stringify(out) + '\n')
console.log(`wrote ${out.length} pokemon`)

const spriteDir = join(ROOT, 'public/sprites')
mkdirSync(spriteDir, { recursive: true })
const tmp = mkdtempSync(join(tmpdir(), 'sprites-'))
for (const { id } of out) {
  const dest = join(spriteDir, `${id}.webp`)
  if (existsSync(dest)) continue
  const res = await fetch(`${ART}${id}.png`)
  if (!res.ok) throw new Error(`sprite ${id}: HTTP ${res.status}`)
  const src = join(tmp, `${id}.png`)
  writeFileSync(src, Buffer.from(await res.arrayBuffer()))
  execFileSync('convert', [src, '-resize', '256x256', '-quality', '82', dest])
  process.stdout.write('.')
}
console.log('\nsprites done')
