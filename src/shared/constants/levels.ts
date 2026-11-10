/**
 * Player level progression. Cumulative XP needed to reach level L is 50 * L * (L - 1).
 */
export function xpForLevel(level: number): number {
  return 50 * level * (level - 1)
}

export function levelFromXp(xp: number): number {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level += 1
  return level
}

export interface LevelProgress {
  level: number
  currentLevelXp: number
  nextLevelXp: number
  progress: number
}

export function levelProgress(xp: number): LevelProgress {
  const level = levelFromXp(xp)
  const currentLevelXp = xpForLevel(level)
  const nextLevelXp = xpForLevel(level + 1)
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    progress: (xp - currentLevelXp) / (nextLevelXp - currentLevelXp)
  }
}

export const RANK_TITLES = [
  { minLevel: 1, key: 'novice' },
  { minLevel: 4, key: 'apprentice' },
  { minLevel: 8, key: 'practitioner' },
  { minLevel: 13, key: 'analyst' },
  { minLevel: 19, key: 'architect' },
  { minLevel: 26, key: 'grandmaster' }
] as const

export type RankKey = (typeof RANK_TITLES)[number]['key']

export function rankForLevel(level: number): RankKey {
  let rank: RankKey = 'novice'
  for (const r of RANK_TITLES) if (level >= r.minLevel) rank = r.key
  return rank
}
