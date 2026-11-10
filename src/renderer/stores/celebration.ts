import { create } from 'zustand'

interface CelebrationState {
  levelUp: { from: number; to: number } | null
  showLevelUp: (levelUp: { from: number; to: number }) => void
  dismiss: () => void
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  levelUp: null,
  showLevelUp: (levelUp) => set({ levelUp }),
  dismiss: () => set({ levelUp: null })
}))
