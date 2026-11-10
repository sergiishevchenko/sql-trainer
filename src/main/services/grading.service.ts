import type { EngineError, ResultSet } from '@shared/types/engine'
import type { ExerciseAnswer, GradeResult, RunResult, ScenarioOutcome } from '@shared/types/exercise'
import { answersMatch, compareResultSets, formatCellForAnswer } from '../engine/compare'
import { guardSql, SELECT_ONLY_POLICY } from '../engine/guard'
import type { ProgramOutcome } from '../engine/jobs'
import type { SqlEngine } from '../engine/sql-engine'
import { allowedStatements, AnswerError, answerToSql, isQueryExercise, referencePrograms } from '../content/programs'
import type { ResolvedExercise } from '../content/loader'

interface Scenario {
  name: string
  hidden: boolean
  setup: string[]
}

/**
 * Grades answers by executing them against isolated datasets and comparing results
 * with reference solutions across visible and hidden scenarios.
 */
export class GradingService {
  constructor(private readonly engine: SqlEngine) {}

  scenarios(ex: ResolvedExercise): Scenario[] {
    const list: Scenario[] = [{ name: 'Основной тест', hidden: false, setup: [] }]
    const datasetHidden = this.engine.datasets.hiddenSetup(ex.dataset)
    if (datasetHidden) list.push({ name: 'Скрытый тест 1', hidden: true, setup: [datasetHidden] })
    if (isQueryExercise(ex)) {
      for (const test of ex.hidden ?? []) {
        list.push({ name: test.name ?? `Скрытый тест ${list.length}`, hidden: true, setup: [test.setup] })
      }
    }
    return list
  }

  hiddenTestCount(ex: ResolvedExercise): number {
    if (ex.type === 'predict_result' || ex.type === 'explain_query') return 0
    return this.scenarios(ex).filter((s) => s.hidden).length
  }

  private compareOptions(ex: ResolvedExercise) {
    const orderMatters = 'orderMatters' in ex ? Boolean(ex.orderMatters) : false
    const checkColumnNames = isQueryExercise(ex) ? Boolean(ex.columnNames) : false
    return { orderMatters, checkColumnNames }
  }

  private checkSql(ex: ResolvedExercise): string | undefined {
    return isQueryExercise(ex) && ex.mode === 'mutation' ? ex.check : undefined
  }

  private knownColumns = (dataset: string) => (table: string) =>
    this.engine.datasets
      .describe(dataset)
      .tables.find((t) => t.name === table)
      ?.columns.map((c) => c.name) ?? []

  private prepareUserSql(ex: ResolvedExercise, answer: ExerciseAnswer): { sql: string } | { error: EngineError; sql?: string } {
    let sql: string
    try {
      sql = answerToSql(ex, answer, this.knownColumns(ex.dataset))
    } catch (error) {
      if (error instanceof AnswerError) return { error: { code: 'runtime', message: error.message } }
      throw error
    }
    const guard = guardSql(sql, { allowed: allowedStatements(ex) })
    if (!guard.ok) return { error: guard.error, sql }
    return { sql }
  }

  async run(ex: ResolvedExercise, answer: ExerciseAnswer): Promise<RunResult> {
    const prepared = this.prepareUserSql(ex, answer)
    if ('error' in prepared) {
      return { executedSql: prepared.sql ?? '', error: prepared.error, result: null, rowsAffected: 0, durationMs: 0, expectedResult: null }
    }
    const reference = referencePrograms(ex)[0]
    const check = this.checkSql(ex)
    const response = await this.engine.evaluate(ex.dataset, [[]], [
      { sql: reference, check },
      { sql: prepared.sql, check }
    ])
    if (!response.ok) {
      return { executedSql: prepared.sql, error: response.error, result: null, rowsAffected: 0, durationMs: 0, expectedResult: null }
    }
    const [expected, user] = response.result[0]
    const showExpected = ex.type !== 'choose_query'
    return {
      executedSql: prepared.sql,
      error: user.execution.ok ? undefined : user.execution.error,
      result: user.result,
      rowsAffected: user.rowsAffected,
      durationMs: user.execution.durationMs,
      expectedResult: showExpected && expected.execution.ok ? expected.result : null
    }
  }

  async grade(ex: ResolvedExercise, answer: ExerciseAnswer): Promise<GradeResult> {
    if (ex.type === 'explain_query') {
      if (answer.kind !== 'option') return this.answerError('Выберите один из вариантов')
      const correct = answer.option === ex.correct
      return { correct, scenarios: [{ name: 'Ответ', hidden: false, passed: correct }] }
    }
    if (ex.type === 'predict_result') return this.gradePrediction(ex, answer)
    return this.gradeProgram(ex, answer)
  }

  private answerError(message: string): GradeResult {
    return { correct: false, error: { code: 'runtime', message }, scenarios: [] }
  }

  async predictionAnswer(ex: Extract<ResolvedExercise, { type: 'predict_result' }>): Promise<{ answer: string; result: ResultSet | null } | { error: EngineError }> {
    const response = await this.engine.execute(ex.dataset, ex.sql, SELECT_ONLY_POLICY)
    if (!response.ok) return { error: response.error }
    if (!response.result.execution.ok) return { error: response.result.execution.error }
    const result = response.result.result
    if (!result) return { error: { code: 'internal', message: 'Запрос задания не вернул результат' } }
    const answer = ex.ask === 'rowCount' ? String(result.rows.length) : formatCellForAnswer(result.rows[0]?.[0] ?? null)
    return { answer, result }
  }

  private async gradePrediction(ex: Extract<ResolvedExercise, { type: 'predict_result' }>, answer: ExerciseAnswer): Promise<GradeResult> {
    if (answer.kind !== 'value' || !answer.value.trim()) return this.answerError('Введите ответ')
    const expected = await this.predictionAnswer(ex)
    if ('error' in expected) return { correct: false, error: expected.error, scenarios: [] }
    const correct = answersMatch(expected.answer, answer.value)
    return {
      correct,
      scenarios: [{ name: 'Ответ', hidden: false, passed: correct }],
      expectedResult: correct ? expected.result : null,
      executedSql: ex.sql
    }
  }

  private async gradeProgram(ex: ResolvedExercise, answer: ExerciseAnswer): Promise<GradeResult> {
    const prepared = this.prepareUserSql(ex, answer)
    if ('error' in prepared) return { correct: false, error: prepared.error, scenarios: [], executedSql: prepared.sql }

    const scenarios = this.scenarios(ex)
    const references = referencePrograms(ex)
    const check = this.checkSql(ex)
    const programs = [...references, prepared.sql].map((sql) => ({ sql, check }))
    const response = await this.engine.evaluate(
      ex.dataset,
      scenarios.map((s) => s.setup),
      programs
    )
    if (!response.ok) return { correct: false, error: response.error, scenarios: [], executedSql: prepared.sql }

    const matrix = response.result
    const userIndex = references.length
    const userBase = matrix[0][userIndex]
    if (!userBase.execution.ok) {
      return { correct: false, error: userBase.execution.error, scenarios: [], executedSql: prepared.sql }
    }

    const referenceBroken = matrix.some((row) => !row[0].execution.ok)
    if (referenceBroken) {
      const failed = matrix.find((row) => !row[0].execution.ok)![0].execution
      const message = failed.ok ? '' : failed.error.message
      return {
        correct: false,
        error: { code: 'internal', message: `Эталонное решение задания не выполнилось: ${message}` },
        scenarios: [],
        executedSql: prepared.sql
      }
    }

    const options = this.compareOptions(ex)
    const evaluateReference = (refIndex: number) =>
      matrix.map((row) => {
        const ref: ProgramOutcome = row[refIndex]
        const user: ProgramOutcome = row[userIndex]
        if (!user.execution.ok) return { equal: false as const, issue: undefined, error: user.execution.error }
        if (!ref.execution.ok) return { equal: false as const, issue: undefined, error: undefined }
        const comparison = compareResultSets(ref.result, user.result, options)
        return { equal: comparison.equal, issue: comparison.issue, error: undefined }
      })

    let best = evaluateReference(0)
    for (let r = 1; r < references.length && !best.every((s) => s.equal); r += 1) {
      const candidate = evaluateReference(r)
      if (candidate.every((s) => s.equal)) best = candidate
    }

    const correct = best.every((s) => s.equal)
    const scenarioOutcomes: ScenarioOutcome[] = scenarios.map((s, i) => ({ name: s.name, hidden: s.hidden, passed: best[i].equal }))
    const firstFailure = best.find((s) => !s.equal)
    const baseFailed = !best[0].equal
    const showExpected = ex.type !== 'choose_query' || correct

    return {
      correct,
      issue: firstFailure ? (baseFailed ? firstFailure.issue : (firstFailure.issue ?? { code: 'state_mismatch' })) : undefined,
      error: firstFailure?.error,
      scenarios: scenarioOutcomes,
      userResult: userBase.result,
      expectedResult: showExpected ? matrix[0][0].result : null,
      executedSql: prepared.sql
    }
  }
}
