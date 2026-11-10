import { tMessage } from '@/i18n'
import { ApiError } from './api'

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return tMessage(error.message, error.fields)
  if (error instanceof Error && error.message.startsWith('errors.')) return tMessage(error.message)
  return tMessage('common.somethingWrong')
}

export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError) || !error.fields) return {}
  const out: Record<string, string> = {}
  for (const [field, key] of Object.entries(error.fields)) out[field] = tMessage(key)
  return out
}
