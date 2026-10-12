import { AnimatePresence, motion } from 'framer-motion'
import { FastForward, Pause, Play, SkipForward, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { BoxScoreModal, LineScore } from '../components/BoxScore'
import { Button, Panel, TeamLogo } from '../components/ui'
import { cx } from '../lib/cx'
import type { ScheduledGame } from '../engine/league'
import type { Team } from '../engine/sim'
import { CONFERENCE_REGIONS, USER_CONFERENCE } from '../data/opponents'
import { useGame } from '../store/game'

const SPEEDS = [
  { label: '1×', ms: 650 },
  { label: '3×', ms: 220 },
  { label: '10×', ms: 60 },
]

export function Season() {
  const season = useGame((s) => s.season)!
  const revealed = useGame((s) => s.revealed)
  const setRevealed = useGame((s) => s.setRevealed)
  const goto = useGame((s) => s.goto)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [open, setOpen] = useState<ScheduledGame | null>(null)
  const teams = useMemo(() => new Map(season.teams.map((t) => [t.id, t])), [season])
  const user = teams.get('user')!
  const done = revealed >= season.games.length

  useEffect(() => {
    if (!playing || done) return
    const t = setTimeout(() => setRevealed(revealed + 1), SPEEDS[speed].ms)
    return () => clearTimeout(t)
  }, [playing, done, revealed, speed, setRevealed])

  const shown = season.games.slice(0, revealed)
  const last = shown[shown.length - 1]
  const wins = last?.wins ?? 0
  const losses = last?.losses ?? 0
  let streak = 0
  for (let i = shown.length - 1; i >= 0 && shown[i].userWon === shown[shown.length - 1].userWon; i--) streak++
  const firstLoss = season.games.findIndex((g) => !g.userWon)
  const justSnapped = firstLoss >= 0 && revealed === firstLoss + 1

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 pb-12">
      <Panel className="relative overflow-hidden p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-4 sm:gap-8">
          <div className="flex items-center gap-3">
            <TeamLogo abbr="YOU" color={user.color} size={56} />
            <div>
              <div className="text-xs tracking-widest text-muted uppercase">Regular season</div>
              <div className="font-display text-xl sm:text-2xl">{user.name}</div>
            </div>
          </div>
          <div className="flex items-baseline gap-2" aria-live="polite" aria-label={`Record ${wins} wins ${losses} losses`}>
            <motion.span key={`w${wins}`} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className="led text-6xl text-win sm:text-7xl">
              {wins}
            </motion.span>
            <span className="led text-4xl text-muted">-</span>
            <motion.span key={`l${losses}`} initial={{ scale: 1.3 }} animate={{ scale: 1 }} className={cx('led text-6xl sm:text-7xl', losses ? 'text-loss' : 'text-white/30')}>
              {losses}
            </motion.span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <span className="text-muted">Game</span>
            <span className="font-display tabular-nums">
              {revealed}/{season.games.length}
            </span>
            <span className="text-muted">Streak</span>
            <span className={cx('font-display tabular-nums', last?.userWon ? 'text-win' : 'text-loss')}>{last ? `${last.userWon ? 'W' : 'L'}${streak}` : '—'}</span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {!done && (
              <>
                <Button size="sm" variant="ghost" onClick={() => setPlaying(!playing)} aria-label={playing ? 'Pause' : 'Play'}>
                  {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <div className="flex rounded-xl bg-white/5 p-1 ring-1 ring-line" role="group" aria-label="Simulation speed">
                  {SPEEDS.map((s, i) => (
                    <button
                      key={s.label}
                      onClick={() => setSpeed(i)}
                      aria-pressed={speed === i}
                      className={cx('min-h-9 min-w-11 cursor-pointer rounded-lg px-2 font-display text-sm', speed === i ? 'bg-accent text-slate-950' : 'text-muted hover:text-fg')}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setRevealed(season.games.length)}>
                  <SkipForward className="h-4 w-4" aria-hidden /> Skip
                </Button>
              </>
            )}
            {done && (
              <Button variant="accent" onClick={() => goto('playoffs')}>
                <Trophy className="h-5 w-5" aria-hidden /> {season.finish === 'Missed Playoffs' ? 'See the playoffs' : 'To the playoffs'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
          <div className="h-full bg-gradient-to-r from-win to-accent transition-[width] duration-200" style={{ width: `${(revealed / season.games.length) * 100}%` }} />
        </div>
        <AnimatePresence>
          {justSnapped && (
            <motion.div
              initial={{ y: -40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-4 rounded-xl bg-loss/15 px-4 py-2 text-center font-display text-loss ring-1 ring-loss/40"
            >
              Perfect season over! {teams.get(season.games[firstLoss].opponentId)!.coach}'s {teams.get(season.games[firstLoss].opponentId)!.name} snapped it at {firstLoss}-0.
            </motion.div>
          )}
          {done && season.wins === 82 && (
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-4 rounded-xl bg-accent/15 px-4 py-3 text-center font-display text-2xl text-accent ring-1 ring-accent/50">
              82-0! A PERFECT SEASON!
            </motion.div>
          )}
        </AnimatePresence>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Panel className="p-4">
          <h2 className="mb-3 font-display text-lg">Schedule</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(64px,1fr))] gap-1.5">
            {season.games.map((g, i) => (
              <GameTile key={i} game={g} opp={teams.get(g.opponentId)!} shown={i < revealed} onOpen={() => setOpen(g)} />
            ))}
          </div>
        </Panel>
        <div className="space-y-4">
          {last && <Featured game={last} user={user} opp={teams.get(last.opponentId)!} onOpen={() => setOpen(last)} />}
          <LiveStandings />
        </div>
      </div>

      {open && (
        <BoxScoreModal
          game={open.result}
          home={open.home ? user : teams.get(open.opponentId)!}
          away={open.home ? teams.get(open.opponentId)! : user}
          title={`Game ${open.index + 1} · ${open.userWon ? 'W' : 'L'} ${open.userScore}-${open.oppScore}`}
          onClose={() => setOpen(null)}
        />
      )}
    </div>
  )
}

function GameTile({ game, opp, shown, onOpen }: { game: ScheduledGame; opp: Team; shown: boolean; onOpen: () => void }) {
  if (!shown) {
    return (
      <div className="grid h-14 place-items-center rounded-lg bg-white/[0.03] font-display text-xs text-white/25 ring-1 ring-line" aria-hidden>
        {game.index + 1}
      </div>
    )
  }
  return (
    <motion.button
      initial={{ scale: 0.4, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      onClick={onOpen}
      aria-label={`Game ${game.index + 1}: ${game.userWon ? 'win' : 'loss'} ${game.userScore} to ${game.oppScore} ${game.home ? 'vs' : 'at'} ${opp.city} ${opp.name}`}
      className={cx(
        'flex h-14 cursor-pointer flex-col items-center justify-center rounded-lg text-[11px] leading-tight ring-1 transition-transform hover:scale-105',
        game.userWon ? 'bg-win/15 text-win ring-win/40' : 'bg-loss/20 text-loss ring-loss/50',
      )}
    >
      <span className="font-display text-xs">
        {game.userWon ? 'W' : 'L'} {game.home ? 'v' : '@'}
        {opp.abbr}
      </span>
      <span className="text-fg/80 tabular-nums">
        {game.userScore}-{game.oppScore}
      </span>
    </motion.button>
  )
}

function Featured({ game, user, opp, onOpen }: { game: ScheduledGame; user: Team; opp: Team; onOpen: () => void }) {
  const [home, away] = game.home ? [user, opp] : [opp, user]
  return (
    <Panel className="p-4">
      <div className="mb-2 flex items-center justify-between text-xs tracking-widest text-muted uppercase">
        <span>Final · Game {game.index + 1}</span>
        <span>
          vs {opp.coach}
          {game.result.overtimes ? ` · ${game.result.overtimes}OT` : ''}
        </span>
      </div>
      <LineScore game={game.result} home={home} away={away} />
      <Button size="sm" variant="ghost" className="mt-3 w-full" onClick={onOpen}>
        <FastForward className="h-4 w-4" aria-hidden /> Box score
      </Button>
    </Panel>
  )
}

function LiveStandings() {
  const season = useGame((s) => s.season)!
  const revealed = useGame((s) => s.revealed)
  const done = revealed >= season.games.length
  const teams = new Map(season.teams.map((t) => [t.id, t]))
  const rows = season.standings.filter((s) => teams.get(s.teamId)!.conference === USER_CONFERENCE)
  return (
    <Panel className="p-4">
      <h2 className="font-display text-lg">{USER_CONFERENCE} Conference</h2>
      <p className="mb-2 text-xs text-muted">{CONFERENCE_REGIONS[USER_CONFERENCE]}</p>
      {!done ? (
        <p className="text-sm text-muted">Final standings post when the regular season ends.</p>
      ) : (
        <ol className="space-y-1 text-sm">
          {rows.map((r, i) => {
            const t = teams.get(r.teamId)!
            return (
              <li key={r.teamId} className={cx('flex items-center gap-2 rounded-lg px-2 py-1', t.isUser && 'bg-accent/15 text-accent', i === 8 && 'mt-2 border-t border-dashed border-line pt-2')}>
                <span className="w-5 text-right text-muted tabular-nums">{i + 1}</span>
                <TeamLogo abbr={t.abbr} color={t.color} size={22} />
                <span className="flex-1 truncate">{t.isUser ? t.name : `${t.city} ${t.name}`}</span>
                <span className="font-display tabular-nums">
                  {r.wins}-{r.losses}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </Panel>
  )
}
