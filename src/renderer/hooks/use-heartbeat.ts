import { useEffect, useRef } from 'react'
import { invalidateProgress, invoke } from '@/lib/query'
import { announceAchievements } from '@/lib/rewards'

const TICK_SECONDS = 60
const IDLE_LIMIT_MS = 3 * 60 * 1000

/**
 * Reports active learning time to the main process while the user interacts with the window.
 */
export function useHeartbeat(enabled: boolean): void {
  const lastInput = useRef(Date.now())

  useEffect(() => {
    if (!enabled) return
    const mark = () => {
      lastInput.current = Date.now()
    }
    const events = ['keydown', 'mousedown', 'mousemove', 'wheel'] as const
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }))
    const timer = window.setInterval(() => {
      const active = document.hasFocus() && Date.now() - lastInput.current < IDLE_LIMIT_MS
      if (!active) return
      invoke('activity:heartbeat', { seconds: TICK_SECONDS })
        .then((unlocked) => {
          if (unlocked.length > 0) {
            announceAchievements(unlocked)
            void invalidateProgress()
          }
        })
        .catch(() => undefined)
    }, TICK_SECONDS * 1000)
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark))
      window.clearInterval(timer)
    }
  }, [enabled])
}
