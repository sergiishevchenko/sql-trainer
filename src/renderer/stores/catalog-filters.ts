import { create } from 'zustand'
import type { Difficulty, ExerciseType, LevelId, ProgressStatus } from '@shared/constants/domain'

export type CatalogSort = 'order' | 'xp_desc' | 'xp_asc' | 'difficulty' | 'title' | 'minutes'
export type XpRange = 'any' | 'low' | 'mid' | 'high' | 'top'

export interface CatalogFilters {
  search: string
  level?: LevelId
  moduleId?: string
  type?: ExerciseType
  difficulty?: Difficulty
  status?: ProgressStatus
  favoritesOnly: boolean
  xp: XpRange
  minutesMax?: number
  sort: CatalogSort
}

export const XP_RANGES: Record<XpRange, { min?: number; max?: number; label: string }> = {
  any: { label: 'Любая' },
  low: { max: 10, label: 'до 10 XP' },
  mid: { min: 11, max: 20, label: '11–20 XP' },
  high: { min: 21, max: 35, label: '21–35 XP' },
  top: { min: 36, label: 'от 36 XP' }
}

const DEFAULTS: CatalogFilters = { search: '', favoritesOnly: false, xp: 'any', sort: 'order' }

interface CatalogFilterState {
  filters: CatalogFilters
  set: (patch: Partial<CatalogFilters>) => void
  reset: () => void
}

export const useCatalogFilters = create<CatalogFilterState>((set) => ({
  filters: DEFAULTS,
  set: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  reset: () => set({ filters: DEFAULTS })
}))

export function isFiltered(f: CatalogFilters): boolean {
  return Boolean(f.search || f.level || f.moduleId || f.type || f.difficulty || f.status || f.favoritesOnly || f.xp !== 'any' || f.minutesMax)
}
