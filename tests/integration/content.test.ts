import { beforeAll, describe, expect, it } from 'vitest'
import { EXERCISE_TYPES, LEVEL_IDS } from '@shared/constants/domain'
import type { ExerciseAnswer } from '@shared/types/exercise'
import { answersMatch } from '../../src/main/engine/compare'
import { orderPieces } from '../../src/main/content/programs'
import type { ResolvedExercise } from '../../src/main/content/loader'
import { loadContentFixture, type ContentFixture } from '../helpers/content'

let fx: ContentFixture

beforeAll(async () => {
  fx = await loadContentFixture()
})

function correctAnswer(ex: ResolvedExercise): ExerciseAnswer {
  switch (ex.type) {
    case 'write_query':
    case 'fix_bug':
    case 'business_case':
    case 'challenge':
      return { kind: 'sql', sql: ex.solution }
    case 'choose_query':
    case 'explain_query':
      return { kind: 'option', option: ex.correct }
    case 'fill_blank':
      return { kind: 'blanks', blanks: ex.answers }
    case 'order_parts': {
      const pieces = orderPieces(ex)
      return { kind: 'parts', parts: ex.parts.map((p) => pieces.indexOf(p)) }
    }
    case 'join_builder':
      return { kind: 'join', ...ex.answer }
    case 'predict_result':
      return { kind: 'value', value: '' }
  }
}

describe('content catalog', () => {
  it('loads without validation issues', () => {
    const problems = fx.catalog.issues.map((i) => `${i.file}${i.exerciseId ? ` [${i.exerciseId}]` : ''}: ${i.message}`)
    expect(problems).toEqual([])
  })

  it('covers every level and uses all exercise types', () => {
    const levels = new Set(fx.catalog.exercises.map((e) => e.level))
    for (const level of LEVEL_IDS) expect(levels.has(level), level).toBe(true)
    const types = new Set(fx.catalog.exercises.map((e) => e.type))
    for (const type of EXERCISE_TYPES) expect(types.has(type), type).toBe(true)
  })

  it('has unique titles within each module', () => {
    const seen = new Map<string, string>()
    const duplicates: string[] = []
    for (const ex of fx.catalog.exercises) {
      const key = `${ex.module}::${ex.title}`
      if (seen.has(key)) duplicates.push(`${ex.id} duplicates ${seen.get(key)}`)
      seen.set(key, ex.id)
    }
    expect(duplicates).toEqual([])
  })

  it('every reference answer is accepted and every distractor rejected by the real grader', async () => {
    const failures: string[] = []
    for (const ex of fx.catalog.exercises) {
      try {
        if (ex.type === 'predict_result') {
          const expected = await fx.grading.predictionAnswer(ex)
          if ('error' in expected) {
            failures.push(`${ex.id}: prediction query failed: ${expected.error.message}`)
            continue
          }
          if (ex.options && !ex.options.some((o) => answersMatch(expected.answer, o))) {
            failures.push(`${ex.id}: options ${JSON.stringify(ex.options)} miss computed answer ${expected.answer}`)
          }
          if (ex.options && ex.options.filter((o) => answersMatch(expected.answer, o)).length > 1) {
            failures.push(`${ex.id}: several options match ${expected.answer}`)
          }
          const graded = await fx.grading.grade(ex, { kind: 'value', value: expected.answer })
          if (!graded.correct) failures.push(`${ex.id}: computed answer rejected`)
          continue
        }

        const grade = await fx.grading.grade(ex, correctAnswer(ex))
        if (!grade.correct) {
          failures.push(
            `${ex.id}: reference rejected (${grade.error?.message ?? JSON.stringify(grade.issue)}; scenarios ${JSON.stringify(grade.scenarios)})`
          )
          continue
        }

        if (ex.type === 'explain_query') continue

        const isMutation = 'mode' in ex && ex.mode === 'mutation'
        const allowEmpty = 'allowEmpty' in ex && ex.allowEmpty
        if (!isMutation && !allowEmpty && (grade.expectedResult?.rows.length ?? 0) === 0) {
          failures.push(`${ex.id}: reference returns no rows (set allowEmpty if intended)`)
        }
        if (isMutation) {
          const noop = await fx.grading.grade(ex, { kind: 'sql', sql: 'SELECT 1' })
          if (noop.correct) failures.push(`${ex.id}: a no-op answer passes the mutation check`)
        }

        if ((ex.type === 'write_query' || ex.type === 'fix_bug' || ex.type === 'business_case' || ex.type === 'challenge') && ex.alt) {
          for (const alt of ex.alt) {
            const g = await fx.grading.grade(ex, { kind: 'sql', sql: alt })
            if (!g.correct) failures.push(`${ex.id}: alternative solution rejected: ${alt}`)
          }
        }
        if (ex.type === 'fix_bug') {
          const g = await fx.grading.grade(ex, { kind: 'sql', sql: ex.starter })
          if (g.correct) failures.push(`${ex.id}: buggy starter is accepted as correct`)
        }
        if (ex.type === 'choose_query') {
          for (let i = 0; i < ex.options.length; i += 1) {
            if (i === ex.correct) continue
            const g = await fx.grading.grade(ex, { kind: 'option', option: i })
            if (g.correct) failures.push(`${ex.id}: distractor option ${i} is accepted`)
          }
        }
        if (ex.type === 'fill_blank' && ex.choices) {
          for (let b = 0; b < ex.answers.length; b += 1) {
            for (const choice of ex.choices[b] ?? []) {
              if (choice === ex.answers[b]) continue
              const blanks = [...ex.answers]
              blanks[b] = choice
              const g = await fx.grading.grade(ex, { kind: 'blanks', blanks })
              if (g.correct) failures.push(`${ex.id}: wrong choice "${choice}" for blank ${b + 1} is accepted`)
            }
          }
        }
      } catch (error) {
        failures.push(`${ex.id}: threw ${(error as Error).message}`)
      }
    }
    expect(failures).toEqual([])
  })
})
