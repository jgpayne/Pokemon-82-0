/** Gym Challenge: 8 gym leaders, then the Elite Four, then the Champion. Club ids from data/opponents. */
export interface LadderStep {
  clubId: string
  stage: 'Gym' | 'Elite Four' | 'Champion'
  /** 0 (first gym) … 1 (Champion): scales AI reactions, steals and shooting. */
  difficulty: number
}

// Ordered so each step is at least as strong as the last.
const GYMS = ['morty', 'clair', 'elesa', 'volkner', 'piers', 'sabrina', 'giovanni', 'raihan']
const ELITE_FOUR = ['lance', 'cynthia', 'blue', 'red']
const CHAMPION = 'leon'

export const LADDER: LadderStep[] = [
  ...GYMS.map((clubId) => ({ clubId, stage: 'Gym' as const })),
  ...ELITE_FOUR.map((clubId) => ({ clubId, stage: 'Elite Four' as const })),
  { clubId: CHAMPION, stage: 'Champion' as const },
].map((s, i, all) => ({ ...s, difficulty: +(i / (all.length - 1)).toFixed(2) }))

/** Exhibition difficulty from a club's overall rating (61 → 0, 81 → 1). */
export function exhibitionDifficulty(clubOverall: number): number {
  return Math.min(1, Math.max(0, (clubOverall - 61) / 20))
}

const PROGRESS_KEY = 'poke82-challenge'

/** Ladder progress is tracked per drafted roster (by Pokémon ids). */
export function rosterKey(ids: number[]): string {
  return [...ids].sort((a, b) => a - b).join('-')
}

export function loadProgress(key: string): number {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, number>
    return Number.isInteger(all[key]) ? all[key] : 0
  } catch {
    return 0
  }
}

export function saveProgress(key: string, beaten: number): void {
  try {
    const all = JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Record<string, number>
    all[key] = Math.max(all[key] ?? 0, beaten)
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(all))
  } catch {
    // Storage unavailable: progress just isn't remembered between visits.
  }
}
