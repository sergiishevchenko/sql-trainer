import { parentPort, workerData } from 'node:worker_threads'
import initSqlJs from 'sql.js'
import { DatasetStore } from './datasets'
import { JobProcessor, type EngineJob } from './jobs'

interface WorkerInit {
  datasetsDir: string
  wasmPath?: string
}

const init = workerData as WorkerInit

const ready = initSqlJs(init.wasmPath ? { locateFile: () => init.wasmPath! } : undefined).then(
  (SQL) => new JobProcessor(new DatasetStore(SQL, init.datasetsDir))
)

parentPort?.on('message', async (message: { id: number; job: EngineJob }) => {
  try {
    const processor = await ready
    const result = processor.process(message.job)
    parentPort?.postMessage({ id: message.id, ok: true, result })
  } catch (error) {
    parentPort?.postMessage({
      id: message.id,
      ok: false,
      error: { code: 'internal', message: error instanceof Error ? error.message : String(error) }
    })
  }
})
