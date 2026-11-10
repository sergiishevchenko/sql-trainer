import { ZodError } from 'zod'
import { IPC_CHANNELS, type IpcChannel } from '@shared/ipc/channels'
import { ipcContract, type IpcEnvelope } from '@shared/ipc/contract'
import { AppError } from '../errors'
import type { SessionManager } from '../services/session'
import type { Handlers } from './handlers'

const channelSet = new Set<string>(IPC_CHANNELS)

function zodFields(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_'
    if (!fields[key]) fields[key] = issue.message
  }
  return fields
}

export type Dispatch = (channel: string, payload: unknown) => Promise<IpcEnvelope<unknown>>

/**
 * Validates channel, authentication and payload, then invokes the handler.
 * All failures are converted into serialisable error envelopes.
 */
export function createDispatcher(handlers: Handlers, session: SessionManager, log: (error: unknown) => void = console.error): Dispatch {
  return async (channel, payload) => {
    try {
      if (typeof channel !== 'string' || !channelSet.has(channel)) {
        throw new AppError('forbidden', 'errors.unknownChannel')
      }
      const name = channel as IpcChannel
      const contract = ipcContract[name]
      const userId = session.currentUserId
      if (contract.auth && !userId) throw new AppError('unauthorized', 'errors.unauthorized')
      const parsed = contract.input.safeParse(payload)
      if (!parsed.success) {
        throw new AppError('validation', 'errors.validation', zodFields(parsed.error))
      }
      const handler = handlers[name] as (input: unknown, ctx: { userId: string }) => unknown
      const data = await handler(parsed.data, { userId: userId ?? '' })
      return { ok: true, data: data ?? null }
    } catch (error) {
      if (error instanceof AppError) return { ok: false, error: error.toPayload() }
      if (error instanceof ZodError) {
        return { ok: false, error: { code: 'validation', message: 'errors.validation', fields: zodFields(error) } }
      }
      log(error)
      return { ok: false, error: { code: 'internal', message: 'errors.internal' } }
    }
  }
}
