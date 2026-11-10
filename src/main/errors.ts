import type { AppErrorCode, AppErrorPayload } from '@shared/ipc/contract'

export class AppError extends Error {
  constructor(
    readonly code: AppErrorCode,
    message: string,
    readonly fields?: Record<string, string>
  ) {
    super(message)
  }

  toPayload(): AppErrorPayload {
    return { code: this.code, message: this.message, fields: this.fields }
  }
}

export const notFound = (what: string) => new AppError('not_found', `errors.notFound.${what}`)
