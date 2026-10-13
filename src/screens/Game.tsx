import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ChevronRight, ListOrdered, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { BoxScoreModal } from '../components/BoxScore'
import { Button, TeamLogo } from '../components/ui'
import { spriteUrl } from '../data/pokedex'
import { getAiTeams, userTeam } from '../engine/league'
import { SLOTS } from '../engine/ratings'
import { randomSeed } from '../engine/rng'
import type { Team } from '../engine/sim'
import { cx } from '../lib/cx'
import { createGame, periodLabel, step, toGameResult, type PlayState } from '../play/engine'
import { InputController } from '../play/input'
import { LADDER, loadProgress, rosterKey, saveProgress } from '../play/ladder'
import { makeView, render, type View } from '../play/render'
import { useGame, type Match } from '../store/game'

const DT = 1 / 60

interface Hud {
  score: [number, number]
  quarter: number
  clock: number
  shotClock: number
  phase: PlayState['phase']
  offense: boolean
}

export function Game() {
  const match = useGame((s) => s.match)!
  const roster = useGame((s) => s.roster)
  const teamName = useGame((s) => s.teamName)
  const startMatch = useGame((s) => s.startMatch)
  const openArena = useGame((s) => s.openArena)
  const home = useMemo(() => userTeam(roster as Required<typeof roster>, teamName), [roster, teamName])
  const away = useMemo(() => getAiTeams().find((t) => t.id === match.clubId)!, [match.clubId])
  // Remount the court for every new match (rematch / next opponent).
  return <Court key={match.seed} match={match} home={home} away={away} onArena={openArena} onStart={startMatch} rosterIds={SLOTS.map((s) => roster[s]!.id)} />
}

function Court({
  match,
  home,
  away,
  onArena,
  onStart,
  rosterIds,
}: {
  match: Match
  home: Team
  away: Team
  onArena: () => void
  onStart: (m: Match) => void
  rosterIds: number[]
}) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The live game is a mutable object stepped by the loop; it's created once per mount.
  const [game] = useState(() => createGame({ home, away, seed: match.seed, difficulty: [0.5, match.difficulty], userTeam: 0 }))
  const [input] = useState(() => new InputController())
  const viewRef = useRef<View | null>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [hud, setHud] = useState<Hud | null>(null)
  const [showBox, setShowBox] = useState(false)
  const touch = useMemo(() => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches, [])
  const portrait = usePortrait()

  const sprites = useMemo(() => {
    const map = new Map<number, HTMLImageElement>()
    for (const a of game.actors) {
      const img = new Image()
      img.src = spriteUrl(a.mon.id)
      map.set(a.mon.id, img)
    }
    return map
  }, [game])

  // Keyboard + pause handling
  useEffect(() => {
    input.attach()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key.toLowerCase() === 'p') setPaused((p) => !p)
    }
    const onHide = () => document.hidden && setPaused(true)
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      input.detach()
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [input])

  // Size the canvas to its container.
  useEffect(() => {
    const wrap = wrapRef.current!
    const canvas = canvasRef.current!
    const resize = () => {
      const { width, height } = wrap.getBoundingClientRect()
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      viewRef.current = makeView(width, height, dpr)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  // Game loop: fixed 60 Hz simulation, render every frame, HUD at ~10 Hz.
  useEffect(() => {
    const g = canvasRef.current!.getContext('2d')!
    let raf = 0
    let last = performance.now()
    let acc = 0
    let hudTimer = 0
    let saved = false
    const frame = (now: number) => {
      const s = game
      const v = viewRef.current
      const elapsed = Math.min(0.1, (now - last) / 1000)
      last = now
      if (started && !paused && s.phase !== 'final') {
        acc += elapsed
        while (acc >= DT) {
          step(s, DT, input.read(v?.rotated ?? false))
          acc -= DT
        }
      } else {
        // Keep floating text fading even when stopped.
        acc = 0
      }
      if (v) render(g, v, s, sprites)
      hudTimer -= elapsed
      if (hudTimer <= 0 || s.phase === 'final') {
        hudTimer = 0.1
        setHud({ score: [...s.score], quarter: s.quarter, clock: s.clock, shotClock: s.shotClock, phase: s.phase, offense: s.possession === 0 })
      }
      if (s.phase === 'final' && !saved) {
        saved = true
        if (match.mode === 'challenge' && match.ladderIndex !== undefined && s.score[0] > s.score[1]) {
          saveProgress(rosterKey(rosterIds), match.ladderIndex + 1)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [started, paused, sprites, match, rosterIds, game, input])

  const won = hud?.phase === 'final' && hud.score[0] > hud.score[1]
  const nextIndex = match.ladderIndex !== undefined ? match.ladderIndex + 1 : null
  const hasNext = won && nextIndex !== null && nextIndex < LADDER.length && loadProgress(rosterKey(rosterIds)) >= nextIndex
  const playNext = () => {
    const step = LADDER[nextIndex!]
    onStart({ clubId: step.clubId, difficulty: step.difficulty, mode: 'challenge', ladderIndex: nextIndex!, seed: randomSeed() })
  }
  const rematch = () => onStart({ ...match, seed: randomSeed() })
  const stageLabel = match.ladderIndex !== undefined ? `${LADDER[match.ladderIndex].stage}${LADDER[match.ladderIndex].stage === 'Gym' ? ` ${match.ladderIndex + 1}` : ''}` : 'Exhibition'

  return (
    <div className="mx-auto flex h-[calc(100dvh-5rem)] max-w-7xl flex-col px-2 pb-2 sm:px-4">
      {/* Scoreboard */}
      <div className="mb-2 flex items-center gap-2 rounded-2xl bg-surface px-3 py-2 ring-1 ring-line">
        <button onClick={onArena} className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl hover:bg-white/10" aria-label="Back to opponent select">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-1 items-center justify-center gap-2 sm:gap-4" aria-live="off">
          <TeamLogo abbr="YOU" color="#ef4444" size={32} />
          <span className="led text-3xl text-fg tabular-nums sm:text-4xl">{hud?.score[0] ?? 0}</span>
          <div className="text-center leading-tight">
            <div className="font-display text-xs text-accent">{hud && hud.phase !== 'final' ? periodLabel(hud.quarter) : 'FINAL'}</div>
            <div className="led text-lg tabular-nums">{fmtClock(hud?.clock ?? game.quarterSeconds)}</div>
            <div className={cx('text-[11px] tabular-nums', (hud?.shotClock ?? 14) < 4 ? 'text-loss' : 'text-muted')}>
              SC {Math.max(0, Math.ceil(hud?.shotClock ?? 14))}
            </div>
          </div>
          <span className="led text-3xl text-fg tabular-nums sm:text-4xl">{hud?.score[1] ?? 0}</span>
          <TeamLogo abbr={away.abbr} color={away.color} size={32} />
        </div>
        <button
          onClick={() => setPaused((p) => !p)}
          disabled={!started || hud?.phase === 'final'}
          className="grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl hover:bg-white/10 disabled:opacity-30"
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
        </button>
      </div>

      {/* Court */}
      <div ref={wrapRef} className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-bg ring-1 ring-line">
        <canvas ref={canvasRef} className="block touch-none select-none" aria-label={`Live game: ${home.name} vs ${away.city} ${away.name}`} />

        <AnimatePresence>
          {!started && (
            <Overlay key="intro">
              <div className="text-xs tracking-widest text-muted uppercase">{stageLabel}</div>
              <div className="my-3 flex items-center justify-center gap-4">
                <TeamLogo abbr="YOU" color="#ef4444" size={56} />
                <span className="font-display text-2xl text-muted">VS</span>
                <TeamLogo abbr={away.abbr} color={away.color} size={56} />
              </div>
              <h2 className="font-display text-2xl sm:text-3xl">
                {away.city} {away.name}
              </h2>
              <p className="text-muted">Coach {away.coach}</p>
              <ul className="mx-auto mt-4 max-w-sm space-y-1 text-left text-sm text-muted">
                <li>
                  <b className="text-fg">Move</b> — {touch ? 'left stick' : 'arrows / WASD'}
                </li>
                <li>
                  <b className="text-fg">A</b> {touch ? '' : '(J / Space)'} — hold, release in the green zone to shoot · tap on defense to steal / block
                </li>
                <li>
                  <b className="text-fg">B</b> {touch ? '' : '(K)'} — pass · switch defender
                </li>
                <li>
                  <b className="text-fg">Turbo</b> {touch ? '' : '(Shift)'} — sprint, drains stamina
                </li>
              </ul>
              <Button size="lg" variant="accent" className="mt-5" onClick={() => setStarted(true)} autoFocus>
                <Play className="h-6 w-6" aria-hidden /> Tip off
              </Button>
            </Overlay>
          )}
          {started && paused && hud?.phase !== 'final' && (
            <Overlay key="pause">
              <h2 className="font-display text-3xl">Timeout</h2>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button variant="accent" onClick={() => setPaused(false)} autoFocus>
                  <Play className="h-5 w-5" aria-hidden /> Resume
                </Button>
                <Button variant="ghost" onClick={onArena}>
                  <ArrowLeft className="h-5 w-5" aria-hidden /> Quit game
                </Button>
              </div>
            </Overlay>
          )}
          {hud?.phase === 'break' && !paused && (
            <motion.div
              key="break"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute inset-x-0 top-1/3 text-center font-display text-3xl text-accent drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
            >
              End of {periodLabel(hud.quarter - 1)}
            </motion.div>
          )}
          {hud?.phase === 'final' && (
            <Overlay key="final">
              <div className="text-xs tracking-widest text-muted uppercase">{stageLabel} · Final</div>
              <div className="my-2 flex items-baseline justify-center gap-3">
                <span className={cx('led text-6xl', won ? 'text-win' : 'text-fg')}>{hud.score[0]}</span>
                <span className="led text-3xl text-muted">-</span>
                <span className={cx('led text-6xl', won ? 'text-fg' : 'text-loss')}>{hud.score[1]}</span>
              </div>
              <h2 className={cx('font-display text-3xl', won ? 'text-accent' : 'text-loss')}>
                {won ? (match.ladderIndex === LADDER.length - 1 ? 'CHAMPION!' : match.mode === 'challenge' ? 'Badge earned!' : 'Victory!') : 'Defeated'}
              </h2>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
                {hasNext && (
                  <Button variant="accent" onClick={playNext} autoFocus>
                    Next: {getAiTeams().find((t) => t.id === LADDER[nextIndex!].clubId)!.coach} <ChevronRight className="h-5 w-5" aria-hidden />
                  </Button>
                )}
                <Button variant={hasNext ? 'ghost' : 'primary'} onClick={rematch} autoFocus={!hasNext}>
                  <RotateCcw className="h-5 w-5" aria-hidden /> {won ? 'Play again' : 'Rematch'}
                </Button>
                <Button variant="ghost" onClick={() => setShowBox(true)}>
                  <ListOrdered className="h-5 w-5" aria-hidden /> Box score
                </Button>
                <Button variant="ghost" onClick={onArena}>
                  <ArrowLeft className="h-5 w-5" aria-hidden /> Opponents
                </Button>
              </div>
            </Overlay>
          )}
        </AnimatePresence>

        {touch && !portrait && started && !paused && hud?.phase !== 'final' && <TouchControls input={input} offense={hud?.offense ?? true} overlay />}
      </div>
      {touch && portrait && (
        <div className={cx('relative mt-2 h-36 shrink-0 rounded-2xl bg-surface ring-1 ring-line', (!started || paused || hud?.phase === 'final') && 'pointer-events-none opacity-40')}>
          <TouchControls input={input} offense={hud?.offense ?? true} />
        </div>
      )}
      {!touch && <p className="mt-1 text-center text-xs text-muted">Arrows/WASD move · J/Space shoot (hold) or steal · K pass/switch · Shift turbo · Esc pause</p>}

      {showBox && (
        <BoxScoreModal game={toGameResult(game)} home={home} away={away} title={`${stageLabel} · ${home.name} vs ${away.coach}`} onClose={() => setShowBox(false)} />
      )}
    </div>
  )
}

function fmtClock(sec: number) {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 grid place-items-center overflow-y-auto bg-slate-950/75 p-4 backdrop-blur-sm"
    >
      <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} className="w-full max-w-lg rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Left: floating joystick. Right: A (shoot / steal), B (pass / switch), Turbo. */
function usePortrait() {
  const query = '(orientation: portrait)'
  const [portrait, setPortrait] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setPortrait(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return portrait
}

function TouchControls({ input, offense, overlay = false }: { input: InputController; offense: boolean; overlay?: boolean }) {
  const [knob, setKnob] = useState<{ x: number; y: number } | null>(null)
  const origin = useRef<{ x: number; y: number; id: number } | null>(null)
  const R = 48

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    capture(e)
    origin.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    setKnob({ x: 0, y: 0 })
  }
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const o = origin.current
    if (!o || o.id !== e.pointerId) return
    let dx = e.clientX - o.x
    let dy = e.clientY - o.y
    const d = Math.hypot(dx, dy)
    if (d > R) {
      dx = (dx / d) * R
      dy = (dy / d) * R
    }
    input.setStick({ x: dx / R, y: dy / R })
    setKnob({ x: dx, y: dy })
  }
  const onUp = () => {
    origin.current = null
    input.setStick({ x: 0, y: 0 })
    setKnob(null)
  }

  return (
    <>
      <div
        className={cx('absolute bottom-0 left-0 z-[5] w-1/2 touch-none', overlay ? 'h-1/2' : 'h-full')}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        aria-label="Movement stick"
      >
        <div className={cx('absolute left-6 grid h-28 w-28 place-items-center rounded-full bg-white/10 ring-2 ring-white/25', overlay ? 'bottom-6' : 'bottom-4')}>
          <div className="h-12 w-12 rounded-full bg-white/40 ring-2 ring-white/70" style={{ transform: `translate(${knob?.x ?? 0}px, ${knob?.y ?? 0}px)` }} />
        </div>
      </div>
      <div className={cx('absolute right-4 z-[5] flex items-end gap-3 touch-none', overlay ? 'bottom-4' : 'bottom-3')}>
        <PadButton
          label="TURBO"
          className="h-14 w-14 bg-secondary/80 text-xs"
          onDown={() => input.setTurbo(true)}
          onUp={() => input.setTurbo(false)}
        />
        <PadButton label={offense ? 'PASS' : 'SWITCH'} className="h-16 w-16 bg-white/25 text-xs" onDown={() => input.pressB()} />
        <PadButton
          label={offense ? 'SHOOT' : 'STEAL'}
          className={cx('h-20 w-20 bg-primary/90 text-sm', overlay && 'mb-6')}
          onDown={() => input.pressA()}
          onUp={() => input.releaseA()}
        />
      </div>
    </>
  )
}

/** Keep receiving a finger's events after it slides off; harmless if the browser refuses. */
function capture(e: React.PointerEvent<HTMLElement>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId)
  } catch {
    // Pointer already released or synthetic.
  }
}

function PadButton({ label, className, onDown, onUp }: { label: string; className: string; onDown: () => void; onUp?: () => void }) {
  return (
    <button
      type="button"
      className={cx('grid touch-none place-items-center rounded-full font-display text-white ring-2 ring-white/40 select-none active:scale-95', className)}
      onPointerDown={(e) => {
        e.preventDefault()
        capture(e)
        onDown()
      }}
      onPointerUp={() => onUp?.()}
      onPointerCancel={() => onUp?.()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
}
