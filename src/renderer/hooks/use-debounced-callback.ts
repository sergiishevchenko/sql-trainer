import { useEffect, useMemo, useRef } from 'react'

/**
 * Returns a debounced function that always calls the latest callback and flushes on unmount.
 */
export function useDebouncedCallback<A extends unknown[]>(callback: (...args: A) => void, delay: number) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback
  const pending = useRef<{ timer: number; args: A } | null>(null)

  const debounced = useMemo(() => {
    const fn = (...args: A) => {
      if (pending.current) window.clearTimeout(pending.current.timer)
      const timer = window.setTimeout(() => {
        pending.current = null
        callbackRef.current(...args)
      }, delay)
      pending.current = { timer, args }
    }
    fn.flush = () => {
      if (!pending.current) return
      window.clearTimeout(pending.current.timer)
      const { args } = pending.current
      pending.current = null
      callbackRef.current(...args)
    }
    return fn
  }, [delay])

  useEffect(() => () => debounced.flush(), [debounced])
  return debounced
}
