import confetti from 'canvas-confetti'
import { motion, useReducedMotion } from 'framer-motion'
import { Check, Copy, Gamepad2, RotateCcw, Shuffle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button, OvrChip, Panel, Sprite } from '../components/ui'
import { cx } from '../lib/cx'
import { getPokemon } from '../data/pokedex'
import type { PlayerSeason } from '../engine/league'
import { SLOTS, slotOverall, teamOverall } from '../engine/ratings'
import { useGame } from '../store/game'

const per = (ps: PlayerSeason, k: keyof PlayerSeason['totals']) => ps.totals[k] / Math.max(1, ps.gp)
const fmt = (n: number) => n.toFixed(1)
const mvpScore = (ps: PlayerSeason) => per(ps, 'pts') + 1.2 * per(ps, 'reb') + 1.5 * per(ps, 'ast') + 3 * (per(ps, 'stl') + per(ps, 'blk'))

export function Results() {
  const g = useGame()
  const season = g.season!
  const reduced = useReducedMotion()
  const [copied, setCopied] = useState(false)
  const perfect = season.wins === 82
  const champ = season.finish === 'Champion'
  const players = [...season.playerSeasons].sort((a, b) => SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot))
  const mvp = [...players].sort((a, b) => mvpScore(b) - mvpScore(a))[0]

  useEffect(() => {
    if (reduced || !(perfect || champ)) return
    const colors = ['#ef4444', '#facc15', '#3b82f6', '#22c55e', '#ffffff']
    const end = Date.now() + (perfect ? 3500 : 1800)
    const frame = () => {
      confetti({ particleCount: 6, angle: 60, spread: 70, origin: { x: 0 }, colors })
      confetti({ particleCount: 6, angle: 120, spread: 70, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [perfect, champ, reduced])

  const headline = perfect && champ ? 'PERFECTION. 82-0 + TITLE!' : perfect ? '82-0! PERFECT SEASON' : champ ? 'INDIGO LEAGUE CHAMPIONS!' : season.finish === 'Missed Playoffs' ? 'Back to the lab…' : 'Season over'

  const share = async () => {
    const lineup = SLOTS.map((s) => `${s} ${g.roster[s]!.name}`).join(' · ')
    const url = `${location.origin}${location.pathname}?seed=${encodeURIComponent(season.seed)}`
    const text = `🏀 Poké 82-0 — ${g.teamName}\n${season.wins}-${season.losses} · ${season.finish} (playoffs ${season.playoffWins}-${season.playoffLosses})\n${lineup}\nCan you beat it? ${url}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt('Copy your result:', text)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-16">
      <Panel className={cx('court-bg relative overflow-hidden px-4 py-10 text-center', (perfect || champ) && 'ring-2 ring-accent/60')}>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 14 }}>
          <div className="text-sm tracking-[0.3em] text-muted uppercase">{g.teamName}</div>
          <div className="mt-2 flex items-baseline justify-center gap-3">
            <span className="led text-7xl text-win sm:text-9xl">{season.wins}</span>
            <span className="led text-5xl text-muted">-</span>
            <span className={cx('led text-7xl sm:text-9xl', season.losses ? 'text-loss' : 'text-white/30')}>{season.losses}</span>
          </div>
          <h1 className={cx('mt-3 font-display text-3xl sm:text-5xl', perfect || champ ? 'text-accent' : 'text-fg')}>{headline}</h1>
          <p className="mt-2 text-muted">
            {season.finish}
            {season.finish !== 'Missed Playoffs' && ` · Playoffs ${season.playoffWins}-${season.playoffLosses}`} · Longest win streak {season.longestStreak} · Team OVR {teamOverall(g.roster)}
          </p>
        </motion.div>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button variant="accent" onClick={share}>
            {copied ? <Check className="h-5 w-5" aria-hidden /> : <Copy className="h-5 w-5" aria-hidden />} {copied ? 'Copied!' : 'Share result'}
          </Button>
          <Button variant="primary" onClick={() => g.openArena()}>
            <Gamepad2 className="h-5 w-5" aria-hidden /> Play the Gym Challenge
          </Button>
          <Button variant="ghost" onClick={() => g.start('free')}>
            <Shuffle className="h-5 w-5" aria-hidden /> New draft
          </Button>
          <Button variant="ghost" onClick={() => g.start(g.mode, season.seed)}>
            <RotateCcw className="h-5 w-5" aria-hidden /> Redraft same spins
          </Button>
        </div>
      </Panel>

      {mvp && (
        <Panel className="flex flex-col items-center gap-4 p-5 sm:flex-row">
          <Sprite id={mvp.id} name={getPokemon(mvp.id).name} className="h-32 w-32" />
          <div className="text-center sm:text-left">
            <div className="text-xs tracking-widest text-accent uppercase">Team MVP</div>
            <div className="font-display text-3xl">{getPokemon(mvp.id).name}</div>
            <div className="mt-1 flex flex-wrap justify-center gap-4 text-lg sm:justify-start">
              <Stat label="PPG" v={per(mvp, 'pts')} />
              <Stat label="RPG" v={per(mvp, 'reb')} />
              <Stat label="APG" v={per(mvp, 'ast')} />
            </div>
          </div>
        </Panel>
      )}

      <Panel className="p-4">
        <h2 className="mb-3 font-display text-lg">Season averages</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-xs text-muted">
              <tr>
                {['Player', 'OVR', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG%', '3P%'].map((h) => (
                  <th key={h} className={cx('px-2 py-2 font-medium', h === 'Player' ? 'text-left' : 'text-right')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const mon = getPokemon(p.id)
                const t = p.totals
                return (
                  <tr key={p.id} className="border-t border-line">
                    <td className="px-2 py-1">
                      <span className="flex items-center gap-2">
                        <Sprite id={p.id} name="" className="h-9 w-9" />
                        <span className="w-8 font-display text-xs text-muted">{p.slot}</span>
                        <span className="font-semibold">{mon.name}</span>
                      </span>
                    </td>
                    <td className="px-2 text-right">
                      <OvrChip ovr={slotOverall(mon, p.slot)} />
                    </td>
                    <td className="px-2 text-right tabular-nums">{fmt(per(p, 'min'))}</td>
                    <td className="px-2 text-right font-bold tabular-nums">{fmt(per(p, 'pts'))}</td>
                    <td className="px-2 text-right tabular-nums">{fmt(per(p, 'reb'))}</td>
                    <td className="px-2 text-right tabular-nums">{fmt(per(p, 'ast'))}</td>
                    <td className="px-2 text-right tabular-nums">{fmt(per(p, 'stl'))}</td>
                    <td className="px-2 text-right tabular-nums">{fmt(per(p, 'blk'))}</td>
                    <td className="px-2 text-right tabular-nums">{t.fga ? ((t.fgm / t.fga) * 100).toFixed(1) : '—'}</td>
                    <td className="px-2 text-right tabular-nums">{t.tpa ? ((t.tpm / t.tpa) * 100).toFixed(1) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}

function Stat({ label, v }: { label: string; v: number }) {
  return (
    <span>
      <span className="font-display text-accent">{fmt(v)}</span> <span className="text-sm text-muted">{label}</span>
    </span>
  )
}
