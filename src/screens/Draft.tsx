import { AnimatePresence, motion } from 'framer-motion'
import { Dices, Gamepad2, Play, RefreshCw, Sparkles } from 'lucide-react'
import { useRef, useState } from 'react'
import { CourtBoard } from '../components/CourtBoard'
import { PokemonCard } from '../components/PokemonCard'
import { SpinReel } from '../components/SpinReel'
import { Button, Panel } from '../components/ui'
import { chemistry, SLOTS, teamOverall } from '../engine/ratings'
import { useGame } from '../store/game'

export function Draft() {
  const g = useGame()
  const [revealedSpin, setRevealedSpin] = useState(0)
  const courtRef = useRef<HTMLDivElement>(null)
  const filled = SLOTS.filter((s) => g.roster[s]).length
  const openSlots = SLOTS.filter((s) => !g.roster[s])
  const complete = filled === SLOTS.length
  const ovr = teamOverall(g.roster)
  const chem = chemistry(g.roster)
  const showChoices = g.current && revealedSpin === g.spinCount
  const pending = g.selected?.kind === 'choice' ? g.selected.mon : null
  const moving = g.selected?.kind === 'slot' ? g.selected.slot : null

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 pb-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:gap-6">
      <div ref={courtRef} className="order-2 scroll-mt-20 space-y-4 lg:order-1 lg:sticky lg:top-20 lg:self-start">
        <Panel className="flex items-center gap-4 p-4">
          <div className="flex-1">
            <div className="text-xs tracking-widest text-muted uppercase">Team overall</div>
            <div className="flex items-baseline gap-3">
              <span className="led text-5xl text-accent">{ovr || '--'}</span>
              <span className="text-sm text-muted">{filled}/8 drafted</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full rounded-full bg-gradient-to-r from-primary via-ball to-accent" animate={{ width: `${(filled / 8) * 100}%` }} />
            </div>
          </div>
          <div className="max-w-[45%] text-right text-xs">
            <div className="tracking-widest text-muted uppercase">Chemistry</div>
            <div className={`font-display text-2xl ${chem.score >= 0 ? 'text-win' : 'text-loss'}`}>
              {chem.score >= 0 ? '+' : ''}
              {chem.score}
            </div>
            {chem.notes.map((n) => (
              <div key={n} className="text-muted">
                {n}
              </div>
            ))}
          </div>
        </Panel>
        <CourtBoard roster={g.roster} pending={pending} movingSlot={moving} onSlot={g.placeAt} />
        <p className="text-center text-xs text-muted">
          {pending
            ? `Tap a glowing spot to place ${pending.name}.`
            : moving
              ? 'Tap another spot to move or swap.'
              : 'Tip: tap a drafted Pokémon to move it to a different position.'}
        </p>
      </div>

      <div className="order-1 space-y-4 lg:order-2">
        {complete ? (
          <Ready />
        ) : (
          <Panel className="space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs tracking-widest text-muted uppercase">Pick {filled + 1} of 8</div>
                <h2 className="font-display text-2xl">Roll a generation &amp; type</h2>
              </div>
              {!g.current && (
                <Button onClick={g.doSpin} variant="primary">
                  <Dices className="h-5 w-5" aria-hidden /> Spin
                </Button>
              )}
            </div>
            <SpinReel
              key={g.spinCount}
              result={g.current?.result ?? null}
              rolled={g.current?.rolled ?? 'both'}
              spinKey={g.spinCount}
              onDone={() => setRevealedSpin(g.spinCount)}
            />
            {g.current && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={g.rerollGen}
                  variant="ghost"
                  size="sm"
                  disabled={g.genRerolls <= 0 || !showChoices}
                  aria-label={`Re-roll generation, ${g.genRerolls} left`}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Re-roll</span> Gen ({g.genRerolls})
                </Button>
                <Button
                  onClick={g.rerollType}
                  variant="ghost"
                  size="sm"
                  disabled={g.typeRerolls <= 0 || !showChoices}
                  aria-label={`Re-roll type, ${g.typeRerolls} left`}
                >
                  <RefreshCw className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">Re-roll</span> Type ({g.typeRerolls})
                </Button>
              </div>
            )}
            <AnimatePresence mode="wait">
              {showChoices ? (
                <motion.div key={g.spinCount} className="grid grid-cols-2 gap-3 sm:grid-cols-3" exit={{ opacity: 0 }}>
                  {g.current!.choices.map((mon, i) => (
                    <PokemonCard
                      key={mon.id}
                      mon={mon}
                      index={i}
                      openSlots={openSlots}
                      selected={pending?.id === mon.id}
                      onSelect={() => {
                        if (pending?.id === mon.id) return g.select(null)
                        g.select({ kind: 'choice', mon })
                        // On stacked (mobile) layouts the court is below the cards.
                        if (window.matchMedia('(max-width: 1023px)').matches) courtRef.current?.scrollIntoView({ behavior: 'smooth' })
                      }}
                    />
                  ))}
                </motion.div>
              ) : (
                !g.current && (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl border-2 border-dashed border-line p-8 text-center text-muted">
                    <Sparkles className="mx-auto mb-2 h-8 w-8 text-accent" aria-hidden />
                    Each spin rolls a generation and a type, then deals up to 6 Pokémon that match both. Pick one and place it on the
                    court. Don't like the roll? You get {g.genRerolls} generation and {g.typeRerolls} type re-rolls for the whole draft.
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </Panel>
        )}
      </div>
    </div>
  )
}

function Ready() {
  const { teamName, setTeamName, simulate, openArena } = useGame()
  return (
    <Panel className="relative overflow-hidden p-6">
      <div className="stripes pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative space-y-4">
        <div className="text-xs tracking-widest text-accent uppercase">Roster locked</div>
        <h2 className="font-display text-3xl sm:text-4xl">Name your squad, then tip off.</h2>
        <label className="block">
          <span className="mb-1 block text-sm text-muted">Team name</span>
          <input
            value={teamName}
            maxLength={32}
            onChange={(e) => setTeamName(e.target.value)}
            className="min-h-12 w-full rounded-xl bg-slate-950 px-4 text-lg ring-2 ring-line outline-none focus:ring-accent"
          />
        </label>
        <p className="text-sm text-muted">
          You can still rearrange positions on the court. Simulate the 82-game season, or take the court yourself in the Gym Challenge.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button size="lg" variant="accent" className="w-full" onClick={simulate} disabled={!teamName.trim()}>
            <Play className="h-6 w-6" aria-hidden /> Simulate 82
          </Button>
          <Button size="lg" variant="primary" className="w-full" onClick={openArena} disabled={!teamName.trim()}>
            <Gamepad2 className="h-6 w-6" aria-hidden /> Play games
          </Button>
        </div>
      </div>
    </Panel>
  )
}
