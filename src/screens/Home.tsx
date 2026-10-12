import { motion } from 'framer-motion'
import { CalendarDays, Dices, Shuffle, Trophy, Zap } from 'lucide-react'
import { Button, Logo, Panel, Sprite } from '../components/ui'
import { loadBest, useGame } from '../store/game'

const FLOATERS = [
  { id: 25, x: '6%', y: '18%', s: 88, d: 0 },
  { id: 6, x: '82%', y: '8%', s: 120, d: 0.4 },
  { id: 143, x: '86%', y: '62%', s: 110, d: 0.8 },
  { id: 94, x: '2%', y: '64%', s: 96, d: 1.2 },
  { id: 150, x: '70%', y: '82%', s: 84, d: 1.6 },
  { id: 131, x: '18%', y: '86%', s: 78, d: 2 },
]

export function Home() {
  const start = useGame((s) => s.start)
  const best = loadBest()
  return (
    <div className="mx-auto max-w-6xl px-4 pb-16">
      <section className="court-bg relative overflow-hidden rounded-3xl bg-surface/60 px-4 py-14 text-center ring-1 ring-line sm:py-20">
        {FLOATERS.map((f) => (
          <motion.div
            key={f.id}
            className="pointer-events-none absolute hidden opacity-80 sm:block"
            style={{ left: f.x, top: f.y, width: f.s }}
            animate={{ y: [0, -14, 0], rotate: [-3, 3, -3] }}
            transition={{ duration: 4, repeat: Infinity, delay: f.d, ease: 'easeInOut' }}
          >
            <Sprite id={f.id} name="" className="h-auto w-full" />
          </motion.div>
        ))}
        <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 160, damping: 12 }}>
          <Logo className="mx-auto h-24 w-24 sm:h-28 sm:w-28" />
        </motion.div>
        <motion.h1
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="mt-4 font-display text-5xl leading-none tracking-tight sm:text-7xl md:text-8xl"
        >
          POKÉ <span className="bg-gradient-to-r from-primary via-ball to-accent bg-clip-text text-transparent">82-0</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mx-auto mt-4 max-w-xl text-lg text-muted sm:text-xl">
          Draft 8 Gen 1 Pokémon. Simulate an 82-game basketball season. <strong className="text-fg">Can your squad go undefeated?</strong>
        </motion.p>
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }} className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button size="lg" variant="accent" onClick={() => start('daily')}>
            <CalendarDays className="h-6 w-6" aria-hidden /> Daily Challenge
          </Button>
          <Button size="lg" variant="primary" onClick={() => start('free')}>
            <Shuffle className="h-6 w-6" aria-hidden /> Free Play
          </Button>
        </motion.div>
        <p className="mt-4 text-sm text-muted">Daily Challenge: everyone gets the same spins today.</p>
        {best && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-slate-950/70 px-4 py-2 text-sm ring-1 ring-line">
            <Trophy className="h-4 w-4 text-accent" aria-hidden />
            Your best: <span className="font-display text-accent">{best.wins}-{best.losses}</span> · {best.finish} · {best.team}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3" aria-label="How to play">
        {[
          { icon: Dices, title: '1. Spin & draft', body: 'Each spin lands on two types and deals 3 Pokémon of each. Pick 1 and slot it at PG, SG, SF, PF, C or the bench. 3 re-spins total.' },
          { icon: Zap, title: '2. Stats become skills', body: 'Sp. Atk = shooting, Attack = finishing, Speed = playmaking, Def/Sp. Def = defense, HP + size = rebounding. Type matchups matter!' },
          { icon: Trophy, title: '3. Chase perfection', body: 'Simulate 82 games against Gym Leaders, the Elite Four and more, then fight through a 16-team playoff for the Indigo League title.' },
        ].map((s, i) => (
          <motion.div key={s.title} initial={{ y: 24, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
            <Panel className="h-full p-5">
              <s.icon className="h-8 w-8 text-accent" aria-hidden />
              <h2 className="mt-3 font-display text-xl">{s.title}</h2>
              <p className="mt-2 text-muted">{s.body}</p>
            </Panel>
          </motion.div>
        ))}
      </section>
    </div>
  )
}
