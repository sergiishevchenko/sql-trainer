import type { UserProfile } from '@shared/types/user'
import { useApi } from '@/lib/query'
import { useAuthStore } from '@/stores/auth'

/**
 * Returns the freshest profile of the signed-in user, refreshed whenever progress queries are invalidated.
 */
export function useCurrentUser(): UserProfile | null {
  const stored = useAuthStore((s) => s.user)
  const session = useApi('auth:session', undefined, { enabled: !!stored, staleTime: 5_000 })
  return session.data ?? stored
}
