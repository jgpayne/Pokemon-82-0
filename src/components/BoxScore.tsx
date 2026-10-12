import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { getPokemon } from '../data/pokedex'
import type { GameResult, PlayerLine, Team } from '../engine/sim'
import { Sprite, TeamLogo } from './ui'
import { cx } from '../lib/cx'

export function BoxScoreModal({ game, home, away, title, onClose }: { game: GameResult; home: Team; away: Team; title: string; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-3 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-surface ring-1 ring-line"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <h2 className="font-display text-lg">{title}</h2>
          <button ref={closeRef} onClick={onClose} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-white/10" aria-label="Close box score">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4">
          <LineScore game={game} home={home} away={away} />
          {game.box && (
            <>
              <TeamBox team={away} lines={game.box.away} />
              <TeamBox team={home} lines={game.box.home} />
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export function LineScore({ game, home, away }: { game: GameResult; home: Team; away: Team }) {
  const periods = game.quarters.home.map((_, i) => (i < 4 ? `Q${i + 1}` : `OT${i - 3 > 1 ? i - 3 : ''}`))
  const row = (t: Team, qs: number[], total: number, won: boolean) => (
    <tr className={cx(won && 'text-accent')}>
      <th scope="row" className="py-1.5 pr-3 text-left">
        <span className="flex items-center gap-2">
          <TeamLogo abbr={t.abbr} color={t.color} size={28} />
          <span className="font-display">{t.abbr}</span>
        </span>
      </th>
      {qs.map((q, i) => (
        <td key={i} className="px-2 text-center tabular-nums">
          {q}
        </td>
      ))}
      <td className="pl-3 text-right font-display text-xl tabular-nums">{total}</td>
    </tr>
  )
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th />
            {periods.map((p) => (
              <th key={p} className="px-2 font-medium">
                {p}
              </th>
            ))}
            <th className="pl-3 text-right font-medium">T</th>
          </tr>
        </thead>
        <tbody>
          {row(away, game.quarters.away, game.awayScore, game.awayScore > game.homeScore)}
          {row(home, game.quarters.home, game.homeScore, game.homeScore > game.awayScore)}
        </tbody>
      </table>
    </div>
  )
}

function TeamBox({ team, lines }: { team: Team; lines: PlayerLine[] }) {
  const top = Math.max(...lines.map((l) => l.pts))
  return (
    <div className="mt-5">
      <h3 className="mb-2 flex items-center gap-2 font-display">
        <span className="h-3 w-3 rounded-full" style={{ background: team.color }} />
        {team.city} {team.name}
      </h3>
      <div className="overflow-x-auto rounded-xl ring-1 ring-line">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-surface-2 text-xs text-muted">
            <tr>
              {['Player', 'MIN', 'PTS', 'REB', 'AST', 'STL', 'BLK', 'FG', '3PT', 'FT'].map((h) => (
                <th key={h} className={cx('px-2 py-2 font-medium', h === 'Player' ? 'text-left' : 'text-right')}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => {
              const mon = getPokemon(l.id)
              return (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-2 py-1">
                    <span className="flex items-center gap-2">
                      <Sprite id={mon.id} name="" className="h-8 w-8" />
                      <span className="w-8 font-display text-xs text-muted">{l.slot}</span>
                      <span className="font-semibold">{mon.name}</span>
                      {l.superEff > 1 && <span className="rounded bg-accent/15 px-1 text-[10px] font-bold text-accent">SUPER EFF ×{l.superEff}</span>}
                    </span>
                  </td>
                  <td className="px-2 text-right tabular-nums">{l.min}</td>
                  <td className={cx('px-2 text-right font-bold tabular-nums', l.pts === top && 'text-accent')}>{l.pts}</td>
                  <td className="px-2 text-right tabular-nums">{l.reb}</td>
                  <td className="px-2 text-right tabular-nums">{l.ast}</td>
                  <td className="px-2 text-right tabular-nums">{l.stl}</td>
                  <td className="px-2 text-right tabular-nums">{l.blk}</td>
                  <td className="px-2 text-right tabular-nums">
                    {l.fgm}-{l.fga}
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    {l.tpm}-{l.tpa}
                  </td>
                  <td className="px-2 text-right tabular-nums">
                    {l.ftm}-{l.fta}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
