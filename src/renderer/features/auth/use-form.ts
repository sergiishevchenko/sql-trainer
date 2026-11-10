import { useState } from 'react'
import type { ZodType } from 'zod'
import { tMessage } from '@/i18n'
import { fieldErrors } from '@/lib/errors'

/**
 * Minimal form state with client-side validation through shared zod schemas.
 */
export function useForm<T extends Record<string, unknown>>(schema: ZodType, initial: T) {
  const [values, setValues] = useState<T>(initial)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = <K extends keyof T>(key: K, value: T[K]) => {
    setValues((v) => ({ ...v, [key]: value }))
    setErrors((e) => {
      if (!e[key as string]) return e
      const next = { ...e }
      delete next[key as string]
      return next
    })
  }

  const validate = (): boolean => {
    const parsed = schema.safeParse(values)
    if (parsed.success) {
      setErrors({})
      return true
    }
    const next: Record<string, string> = {}
    for (const issue of parsed.error.issues) {
      const key = issue.path.join('.') || '_'
      if (!next[key]) next[key] = tMessage(issue.message)
    }
    setErrors(next)
    return false
  }

  const applyServerError = (error: unknown) => setErrors(fieldErrors(error))

  return { values, errors, set, validate, applyServerError, setValues }
}
