import { MotionConfig, motion } from 'framer-motion'
import { Home as HomeIcon } from 'lucide-react'
import { useEffect } from 'react'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Logo } from './components/ui'
import { Draft } from './screens/Draft'
import { Home } from './screens/Home'
import { Playoffs } from './screens/Playoffs'
import { Results } from './screens/Results'
import { Season } from './screens/Season'
import { useGame } from './store/game'

const STEPS = ['draft', 'season', 'playoffs', 'results'] as const

export default function App() {
  const screen = useGame((s) => s.screen)
  const mode = useGame((s) => s.mode)
  const reset = useGame((s) => s.reset)
  const start = useGame((s) => s.start)

  // Shared links (?seed=...) jump straight into a draft with the same spins.
  useEffect(() => {
    const seed = new URLSearchParams(location.search).get('seed')
    if (seed) {
      start(seed.startsWith('daily-') ? 'daily' : 'free', seed)
      history.replaceState(null, '', location.pathname)
    }
  }, [start])

  useEffect(() => window.scrollTo({ top: 0 }), [screen])

  return (
    <MotionConfig reducedMotion="user">
      <header className="sticky top-0 z-40 mb-4 border-b border-line bg-bg/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
          <button onClick={reset} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl" aria-label="Poké 82-0 home">
            <Logo className="h-9 w-9" />
            <span className="font-display text-xl">
              POKÉ <span className="text-primary">82-0</span>
            </span>
          </button>
          {screen !== 'home' && (
            <>
              <nav aria-label="Progress" className="ml-auto hidden items-center gap-1 text-xs sm:flex">
                {STEPS.map((s, i) => {
                  const active = s === screen
                  const past = STEPS.indexOf(screen as (typeof STEPS)[number]) > i
                  return (
                    <span
                      key={s}
                      aria-current={active ? 'step' : undefined}
                      className={`rounded-full px-3 py-1 font-display uppercase ${active ? 'bg-accent text-slate-950' : past ? 'bg-white/10 text-fg' : 'text-muted'}`}
                    >
                      {s}
                    </span>
                  )
                })}
              </nav>
              <span className="ml-auto rounded-full bg-white/5 px-3 py-1 text-xs text-muted ring-1 ring-line sm:ml-2">{mode === 'daily' ? 'Daily' : 'Free play'}</span>
              <button onClick={reset} className="grid h-11 w-11 cursor-pointer place-items-center rounded-xl hover:bg-white/10" aria-label="Quit to home">
                <HomeIcon className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </header>
      {/* Swap screens immediately (enter animation only) so navigation never waits on an exit animation. */}
      <motion.main key={screen} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
        <ErrorBoundary onReset={reset}>
          {screen === 'home' && <Home />}
          {screen === 'draft' && <Draft />}
          {screen === 'season' && <Season />}
          {screen === 'playoffs' && <Playoffs />}
          {screen === 'results' && <Results />}
        </ErrorBoundary>
      </motion.main>
      <footer className="px-4 pb-8 text-center text-xs text-muted">
        Fan project. Pokémon and Pokémon character names are trademarks of Nintendo / Game Freak / The Pokémon Company. Data & art via PokeAPI.
      </footer>
    </MotionConfig>
  )
}
