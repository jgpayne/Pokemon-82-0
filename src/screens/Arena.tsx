import { motion } from 'framer-motion'
import { ArrowLeft, Check, Gamepad2, Lock, Play, Swords, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button, OvrChip, Panel, Sprite, TeamLogo } from '../components/ui'
import { getAiTeams } from '../engine/league'
import { SLOTS, teamOverall } from '../engine/ratings'
import { randomSeed } from '../engine/rng'
import type { Team } from '../engine/sim'
import { cx } from '../lib/cx'
import { exhibitionDifficulty, LADDER, loadProgress, rosterKey } from '../play/ladder'
import { useGame } from '../store/game'

export function Arena() {
  const roster = useGame((s) => s.roster)
  const teamName = useGame((s) => s.teamName)
  const startMatch = useGame((s) => s.startMatch)
  const goto = useGame((s) => s.goto)
  const arenaFrom = useGame((s) => s.arenaFrom)
  const [tab, setTab] = useState<'challenge' | 'exhibition'>('challenge')
  const clubs = useMemo(() => new Map(getAiTeams().map((t) => [t.id, t])), [])
  const ids = SLOTS.map((s) => roster[s]!.id)
  const beaten = loadProgress(rosterKey(ids))
  const exhibition = useMemo(
    () => [...getAiTeams()].map((t) => ({ t, ovr: teamOverall(t.roster) })).sort((a, b) => a.ovr - b.ovr),
    [],
  )

  return (
    <div className="mx-auto max-w-5xl space-y-4 px-4 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button onClick={() => goto(arenaFrom)} className="mb-1 inline-flex min-h-11 cursor-pointer items-center gap-1 text-sm text-muted hover:text-fg">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back
          </button>
          <div className="text-xs tracking-widest text-muted uppercase">{teamName} · Team OVR {teamOverall(roster)}</div>
          <h1 className="font-display text-3xl sm:text-4xl">Play a game</h1>
        </div>
        <div className="flex -space-x-3">
          {SLOTS.slice(0, 5).map((s) => (
            <Sprite key={s} id={roster[s]!.id} name={roster[s]!.name} className="h-14 w-14 rounded-full bg-surface-2 ring-2 ring-bg" />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-1 ring-1 ring-line sm:w-fit" role="tablist">
        {(
          [
            ['challenge', 'Gym Challenge', Trophy],
            ['exhibition', 'Exhibition', Swords],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              'flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 font-display text-sm uppercase',
              tab === id ? 'bg-accent text-slate-950' : 'text-muted hover:text-fg',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden /> {label}
          </button>
        ))}
      </div>

      <Panel className="p-4 text-sm text-muted">
        <span className="font-display text-fg">Controls · </span>
        Move: arrows / WASD or the stick · <b className="text-fg">A</b> (J / Space): hold &amp; release to shoot at the top of the meter, tap on
        defense to steal or block · <b className="text-fg">B</b> (K): pass, or switch defender · Turbo: Shift. Hit 3 in a row to catch fire.
      </Panel>

      {tab === 'challenge' ? (
        <ol className="space-y-2">
          {LADDER.map((step, i) => {
            const club = clubs.get(step.clubId)!
            const done = i < beaten
            const next = i === beaten
            const locked = i > beaten
            return (
              <motion.li key={step.clubId} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <ClubRow
                  club={club}
                  label={`${step.stage === 'Gym' ? `Gym ${i + 1}` : step.stage}`}
                  state={done ? 'done' : next ? 'next' : locked ? 'locked' : 'open'}
                  onPlay={() => startMatch({ clubId: club.id, difficulty: step.difficulty, mode: 'challenge', ladderIndex: i, seed: randomSeed() })}
                />
              </motion.li>
            )
          })}
        </ol>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {exhibition.map(({ t, ovr }) => (
            <ClubRow
              key={t.id}
              club={t}
              label={`Difficulty ${Math.round(exhibitionDifficulty(ovr) * 9) + 1}/10`}
              state="open"
              onPlay={() => startMatch({ clubId: t.id, difficulty: exhibitionDifficulty(ovr), mode: 'exhibition', seed: randomSeed() })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ClubRow({ club, label, state, onPlay }: { club: Team; label: string; state: 'done' | 'next' | 'locked' | 'open'; onPlay: () => void }) {
  const ovr = teamOverall(club.roster)
  return (
    <Panel className={cx('flex items-center gap-3 p-3', state === 'next' && 'ring-2 ring-accent/70', state === 'locked' && 'opacity-55')}>
      <TeamLogo abbr={club.abbr} color={club.color} size={44} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] tracking-widest text-muted uppercase">{label}</div>
        <div className="truncate font-display text-lg leading-tight">
          {club.city} {club.name}
        </div>
        <div className="text-xs text-muted">Coach {club.coach}</div>
      </div>
      <Sprite id={club.roster.PG.id} name="" className="hidden h-10 w-10 sm:block" />
      <OvrChip ovr={ovr} label="OVR" />
      {state === 'done' ? (
        <Button size="sm" variant="ghost" onClick={onPlay} aria-label={`Rematch ${club.coach}`}>
          <Check className="h-4 w-4 text-win" aria-hidden /> Rematch
        </Button>
      ) : state === 'locked' ? (
        <span className="inline-flex min-h-11 items-center gap-1 px-3 text-sm text-muted">
          <Lock className="h-4 w-4" aria-hidden /> Locked
        </span>
      ) : (
        <Button size="sm" variant={state === 'next' ? 'accent' : 'primary'} onClick={onPlay} aria-label={`Play ${club.coach}`}>
          {state === 'next' ? <Play className="h-4 w-4" aria-hidden /> : <Gamepad2 className="h-4 w-4" aria-hidden />} Play
        </Button>
      )}
    </Panel>
  )
}
