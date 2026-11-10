import type { IpcChannel } from '@shared/ipc/channels'
import type { AppInfo, IpcOutput, IpcParsedInput } from '@shared/ipc/contract'
import type { AppContext } from '../app-context'

export interface HandlerContext {
  userId: string | null
}

type Handler<C extends IpcChannel> = (
  input: IpcParsedInput<C>,
  ctx: HandlerContext & { userId: string }
) => IpcOutput<C> | Promise<IpcOutput<C>>

export type Handlers = { [C in IpcChannel]: Handler<C> }

export interface EnvironmentInfo {
  version: string
  platform: string
  userDataPath: string
}

/**
 * Maps every IPC channel to a service call. Authentication and input validation happen
 * in the dispatcher before these run.
 */
export function createHandlers(app: AppContext, env: EnvironmentInfo): Handlers {
  return {
    'app:info': (): AppInfo => ({
      ...env,
      exerciseCount: app.catalog.exercises.length,
      datasetCount: app.engine.datasets.ids().length,
      invalidExercises: app.catalog.issues.filter((i) => i.exerciseId).length
    }),
    'auth:accounts': () => app.users.accounts(),
    'auth:session': () => app.auth.restore(),
    'auth:register': (input) => app.auth.register(input),
    'auth:login': (input) => app.auth.login(input),
    'auth:logout': () => {
      app.auth.logout()
      return null
    },
    'auth:recover': (input) => app.auth.recover(input),
    'auth:changePassword': async (input, { userId }) => {
      await app.auth.changePassword(userId, input)
      return null
    },
    'auth:regenerateRecovery': async (input, { userId }) => ({
      recoveryCode: await app.auth.regenerateRecovery(userId, input.password)
    }),
    'auth:updateProfile': (input, { userId }) => app.auth.updateProfile(userId, input),
    'auth:deleteAccount': async (input, { userId }) => {
      await app.auth.deleteAccount(userId, input.password)
      return null
    },
    'settings:get': (_input, { userId }) => app.users.settings(userId),
    'settings:update': (input, { userId }) => app.users.updateSettings(userId, input),
    'dashboard:get': (_input, { userId }) => app.stats.dashboard(userId),
    'learning:levels': (_input, { userId }) => app.catalogService.levels(userId),
    'learning:module': (input, { userId }) => app.catalogService.moduleDetail(userId, input.moduleId),
    'learning:projects': (_input, { userId }) => app.catalogService.projects(userId),
    'exercises:list': (input, { userId }) => app.catalogService.list(userId, input),
    'exercises:facets': () => app.catalogService.facets(),
    'exercises:get': (input, { userId }) => {
      const exercise = app.catalogService.publicExercise(userId, input.exerciseId)
      app.users.setLastExercise(userId, input.exerciseId)
      return exercise
    },
    'exercises:run': (input, { userId }) => app.progress.run(userId, input.exerciseId, input.answer),
    'exercises:submit': (input, { userId }) =>
      input.assessmentId
        ? app.assessments.submit(userId, input.assessmentId, input.exerciseId, input.answer, input.durationMs)
        : app.progress.submit(userId, {
            exerciseId: input.exerciseId,
            answer: input.answer,
            durationMs: input.durationMs,
            context: 'practice'
          }),
    'exercises:saveDraft': (input, { userId }) => {
      app.progress.saveDraft(userId, input.exerciseId, input.draft)
      return null
    },
    'exercises:reveal': (input, { userId }) => app.progress.reveal(userId, input.exerciseId),
    'exercises:toggleFavorite': (input, { userId }) => ({
      isFavorite: app.progress.toggleFavorite(userId, input.exerciseId)
    }),
    'exercises:markReview': (input, { userId }) => {
      app.progress.markReview(userId, input.exerciseId, input.review)
      return null
    },
    'exercises:saveNote': (input, { userId }) => {
      app.progress.saveNote(userId, input.exerciseId, input.content)
      return null
    },
    'exercises:next': (_input, { userId }) => app.progress.next(userId),
    'datasets:list': () => app.playground.datasets(),
    'datasets:schema': (input) => app.playground.schema(input.dataset),
    'playground:run': async (input, { userId }) => {
      const result = await app.playground.run(userId, input.dataset, input.sql)
      app.achievements.evaluate(userId)
      return result
    },
    'playground:reset': async (input, { userId }) => {
      await app.playground.reset(userId, input.dataset)
      return null
    },
    'playground:history': (input, { userId }) => app.playground.history(userId, input.dataset, input.limit),
    'playground:clearHistory': (_input, { userId }) => {
      app.playground.clearHistory(userId)
      return null
    },
    'analytics:get': (_input, { userId }) => app.stats.analytics(userId),
    'achievements:list': (_input, { userId }) => app.achievements.list(userId),
    'assessments:start': (input, { userId }) => app.assessments.start(userId, input.kind, input.scopeId),
    'assessments:get': (input, { userId }) => app.assessments.get(userId, input.assessmentId),
    'assessments:finish': (input, { userId }) => app.assessments.finish(userId, input.assessmentId),
    'assessments:recent': (_input, { userId }) => app.assessments.recent(userId),
    'assessments:daily': (_input, { userId }) => app.assessments.daily(userId),
    'activity:heartbeat': (input, { userId }) => {
      app.progress.recordActivity(userId, input.seconds)
      return app.achievements.evaluate(userId)
    }
  }
}
