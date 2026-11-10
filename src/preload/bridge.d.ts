import type { IpcChannel } from '../shared/ipc/channels'
import type { IpcEnvelope } from '../shared/ipc/contract'

export interface SqlMasteryBridge {
  invoke(channel: IpcChannel, payload: unknown): Promise<IpcEnvelope<unknown>>
  platform: string
}

declare global {
  interface Window {
    sqlMastery: SqlMasteryBridge
  }
}
