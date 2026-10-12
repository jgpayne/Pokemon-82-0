import { motion } from 'framer-motion'
import { ChevronRight, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BoxScoreModal } from '../components/BoxScore'
import { Button, Panel, TeamLogo } from '../components/ui'
import { cx } from '../lib/cx'
import type { Series } from '../engine/league'
import type { GameResult } from '../engine/sim'
import { useGame } from '../store/game'

const ROUND_NAMES = ['First Round', 'Conference Semifinals', 'Conference Finals', 'Indigo League Finals']

export function Playoffs() {
  const season = useGame((s) => s.season)!
  const goto = useGame((s) => s.goto)
  const [round, setRound] = useState(1)
  const [open, setOpen] = useState<{ result: GameResult; title: string } | null>(null)
  const teams = useMemo(() => new Map(season.teams.map((t) => [t.id, t])), [season])

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs tracking-widest text-muted uppercase">Postseason</div>
          <h1 className="font-display text-3xl sm:text-4xl">Indigo League Playoffs</h1>
        </div>
        {round < 4 ? (
          <Button variant="primary" onClick={() => setRound(round + 1)}>
            Reveal {ROUND_NAMES[round]} <ChevronRight className="h-5 w-5" aria-hidden />
          </Button>
        ) : (
          <Button variant="accent" onClick={() => goto('results')}>
            <Trophy className="h-5 w-5" aria-hidden /> Season recap
          </Button>
        )}
      </div>
      {season.finish === 'Missed Playoffs' && (
        <Panel className="p-4 text-center text-loss">Your squad finished outside the top 8 in the Indigo Conference and missed the playoffs.</Panel>
      )}

      {[1, 2, 3, 4].filter((r) => r <= round).map((r) => (
        <motion.section key={r} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
          <h2 className="font-display text-xl text-accent">{ROUND_NAMES[r - 1]}</h2>
          <div className={cx('grid gap-3', r === 4 ? 'md:grid-cols-1' : 'md:grid-cols-2')}>
            {season.playoffs
              .filter((s) => s.round === r)
              .map((s, i) => (
                <SeriesCard
                  key={`${s.conference}-${i}`}
                  series={s}
                  index={i}
                  teams={teams}
                  onGame={(result, n) => setOpen({ result, title: `${ROUND_NAMES[r - 1]} · Game ${n}` })}
                />
              ))}
          </div>
        </motion.section>
      ))}

      {open && (
        <BoxScoreModal
          game={open.result}
          home={teams.get(open.result.homeId)!}
          away={teams.get(open.result.awayId)!}
          title={open.title}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function SeriesCard({
  series,
  index,
  teams,
  onGame,
}: {
  series: Series
  index: number
  teams: Map<string, import('../engine/sim').Team>
  onGame: (g: GameResult, n: number) => void
}) {
  const isUser = series.highSeed.teamId === 'user' || series.lowSeed.teamId === 'user'
  const row = (side: { teamId: string; seed: number }, wins: number) => {
    const t = teams.get(side.teamId)!
    const won = series.winnerId === side.teamId
    return (
      <div className={cx('flex items-center gap-3 rounded-lg px-2 py-1.5', won ? 'text-fg' : 'text-muted', t.isUser && 'bg-accent/10')}>
        {series.conference !== 'Finals' && <span className="w-4 text-right text-xs tabular-nums">{side.seed}</span>}
        <TeamLogo abbr={t.abbr} color={t.color} size={32} />
        <span className="flex-1 truncate">
          <span className={cx('font-semibold', t.isUser && 'text-accent')}>{t.isUser ? t.name : `${t.city} ${t.name}`}</span>
          <span className="block text-xs text-muted">Coach {t.coach}</span>
        </span>
        <span className={cx('led text-3xl', won ? 'text-win' : 'text-white/40')}>{wins}</span>
      </div>
    )
  }
  return (
    <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08 }}>
      <Panel className={cx('p-3', isUser && 'ring-2 ring-accent/60')}>
        <div className="mb-1 flex justify-between text-[11px] tracking-widest text-muted uppercase">
          <span>{series.conference === 'Finals' ? 'Finals' : `${series.conference} Conference`}</span>
          <span>{series.games.length} games</span>
        </div>
        {row(series.highSeed, series.highWins)}
        {row(series.lowSeed, series.lowWins)}
        {isUser && (
          <div className="mt-2 flex flex-wrap gap-1 border-t border-line pt-2">
            {series.games.map((g, i) => {
              const userHome = g.home === 'user'
              const us = userHome ? g.result.homeScore : g.result.awayScore
              const them = userHome ? g.result.awayScore : g.result.homeScore
              return (
                <button
                  key={i}
                  onClick={() => onGame(g.result, i + 1)}
                  className={cx('min-h-11 cursor-pointer rounded-lg px-2 text-xs ring-1 tabular-nums', us > them ? 'bg-win/15 text-win ring-win/40' : 'bg-loss/15 text-loss ring-loss/40')}
                >
                  G{i + 1} {us}-{them}
                </button>
              )
            })}
          </div>
        )}
      </Panel>
    </motion.div>
  )
}
