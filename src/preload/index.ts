import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, IPC_INVOKE } from '@shared/ipc/channels'
import type { SqlMasteryBridge } from './bridge'

const allowed = new Set<string>(IPC_CHANNELS)

const bridge: SqlMasteryBridge = {
  invoke: (channel, payload) => {
    if (!allowed.has(channel)) {
      return Promise.resolve({ ok: false, error: { code: 'forbidden', message: 'errors.unknownChannel' } })
    }
    return ipcRenderer.invoke(IPC_INVOKE, channel, payload)
  },
  platform: process.platform
}

contextBridge.exposeInMainWorld('sqlMastery', bridge)
