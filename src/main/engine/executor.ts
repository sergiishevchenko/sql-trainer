import { Worker } from 'node:worker_threads'
import type { EngineJob, EngineJobResults, JobProcessor, JobResponse } from './jobs'

export type JobResult<J extends EngineJob> = EngineJobResults[J['type']]

export interface SqlExecutor {
  readonly generation: number
  run<J extends EngineJob>(job: J, timeoutMs: number): Promise<JobResponse<JobResult<J>>>
  dispose(): Promise<void>
}

/**
 * Runs jobs synchronously in the current thread. No timeout enforcement; used for tests and tooling.
 */
export class InProcessExecutor implements SqlExecutor {
  readonly generation = 0

  constructor(private readonly processor: JobProcessor) {}

  async run<J extends EngineJob>(job: J): Promise<JobResponse<JobResult<J>>> {
    try {
      return { ok: true, result: this.processor.process(job) as JobResult<J> }
    } catch (error) {
      return { ok: false, error: { code: 'internal', message: (error as Error).message } }
    }
  }

  async dispose(): Promise<void> {}
}

interface WorkerOptions {
  scriptPath: string
  datasetsDir: string
  wasmPath?: string
}

interface PendingJob {
  id: number
  resolve: (value: JobResponse<unknown>) => void
  timer: NodeJS.Timeout
}

/**
 * Runs jobs in a dedicated worker thread. A job exceeding its time budget terminates
 * the worker (interrupting runaway queries) and a fresh worker is spawned for the next job.
 */
export class WorkerExecutor implements SqlExecutor {
  private worker: Worker | null = null
  private nextId = 1
  private pending: PendingJob | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private _generation = 0

  constructor(private readonly options: WorkerOptions) {}

  get generation(): number {
    return this._generation
  }

  private ensureWorker(): Worker {
    if (this.worker) return this.worker
    const worker = new Worker(this.options.scriptPath, {
      workerData: { datasetsDir: this.options.datasetsDir, wasmPath: this.options.wasmPath },
      resourceLimits: { maxOldGenerationSizeMb: 512 }
    })
    worker.on('message', (message: { id: number } & JobResponse<unknown>) => {
      const pending = this.pending
      if (!pending || pending.id !== message.id) return
      clearTimeout(pending.timer)
      this.pending = null
      pending.resolve(message.ok ? { ok: true, result: message.result } : { ok: false, error: message.error })
    })
    worker.on('error', (error) => {
      const pending = this.pending
      this.pending = null
      this.worker = null
      this._generation += 1
      if (pending) {
        clearTimeout(pending.timer)
        pending.resolve({ ok: false, error: { code: 'internal', message: error.message } })
      }
    })
    worker.on('exit', () => {
      if (this.worker === worker) {
        this.worker = null
        this._generation += 1
      }
    })
    this.worker = worker
    return worker
  }

  run<J extends EngineJob>(job: J, timeoutMs: number): Promise<JobResponse<JobResult<J>>> {
    const task = this.queue.then(
      () =>
        new Promise<JobResponse<JobResult<J>>>((resolve) => {
          const worker = this.ensureWorker()
          const id = this.nextId++
          const timer = setTimeout(() => {
            if (this.pending?.id !== id) return
            this.pending = null
            const current = this.worker
            this.worker = null
            this._generation += 1
            void current?.terminate()
            resolve({
              ok: false,
              error: {
                code: 'timeout',
                message: `Превышено время выполнения (${Math.round(timeoutMs / 1000)} с). Проверьте, нет ли бесконечной рекурсии или слишком тяжёлого соединения.`
              }
            })
          }, timeoutMs)
          this.pending = { id, timer, resolve: resolve as (value: JobResponse<unknown>) => void }
          worker.postMessage({ id, job })
        })
    )
    this.queue = task.catch(() => undefined)
    return task
  }

  async dispose(): Promise<void> {
    const worker = this.worker
    this.worker = null
    if (worker) await worker.terminate()
  }
}
