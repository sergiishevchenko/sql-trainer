import type { IpcChannel } from '@shared/ipc/channels'
import type { AppErrorCode, IpcInput, IpcOutput } from '@shared/ipc/contract'

export class ApiError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
  }
}

/**
 * Typed client for the main-process API exposed through the preload bridge.
 */
export async function call<C extends IpcChannel>(channel: C, ...args: IpcInput<C> extends undefined ? [] : [IpcInput<C>]): Promise<IpcOutput<C>> {
  const envelope = await window.sqlMastery.invoke(channel, args[0])
  if (!envelope.ok) {
    throw new ApiError(envelope.error.code, envelope.error.message, envelope.error.fields)
  }
  return envelope.data as IpcOutput<C>
}
