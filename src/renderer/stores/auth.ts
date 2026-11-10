import { create } from 'zustand'
import type { UserProfile } from '@shared/types/user'

type AuthStatus = 'loading' | 'guest' | 'authenticated'

interface AuthState {
  status: AuthStatus
  user: UserProfile | null
  pendingRecoveryCode: string | null
  setUser: (user: UserProfile | null) => void
  setRecoveryCode: (code: string | null) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  user: null,
  pendingRecoveryCode: null,
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'guest' }),
  setRecoveryCode: (pendingRecoveryCode) => set({ pendingRecoveryCode })
}))
