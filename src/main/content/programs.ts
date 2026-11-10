import type { StatementKind } from '@shared/constants/domain'
import type { ExerciseAnswer, PublicExerciseContent } from '@shared/types/exercise'
import type { ExerciseDefinition } from '@shared/schemas/content'
import { tr } from '../i18n'
import { fillTemplate, type ResolvedExercise } from './loader'

type JoinBuilderExercise = Extract<ExerciseDefinition, { type: 'join_builder' }>
type OrderPartsExercise = Extract<ExerciseDefinition, { type: 'order_parts' }>

export class AnswerError extends Error {}

function hashSeed(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function seededRandom(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function deterministicShuffle<T>(items: T[], seedText: string): T[] {
  const random = seededRandom(hashSeed(seedText))
  const out = [...items]
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function orderPieces(ex: OrderPartsExercise): string[] {
  const all = [...ex.parts, ...(ex.distractors ?? [])]
  let shuffled = deterministicShuffle(all, ex.id)
  if (shuffled.slice(0, ex.parts.length).every((p, i) => p === ex.parts[i])) {
    shuffled = [...shuffled.slice(1), shuffled[0]]
  }
  return shuffled
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

export function buildJoinSql(
  ex: JoinBuilderExercise,
  choice: { left: string; right: string; join: string; leftColumn?: string; rightColumn?: string }
): string {
  const left = quoteIdent(choice.left)
  const right = quoteIdent(choice.right)
  let sql = `SELECT ${ex.select}\nFROM ${left}\n${choice.join} JOIN ${right}`
  if (choice.join !== 'CROSS') {
    if (!choice.leftColumn || !choice.rightColumn) throw new AnswerError(tr('answer.joinColumns'))
    sql += ` ON ${left}.${quoteIdent(choice.leftColumn)} = ${right}.${quoteIdent(choice.rightColumn)}`
  }
  if (ex.suffix) sql += `\n${ex.suffix}`
  return sql
}

export function isQueryExercise(
  ex: ExerciseDefinition
): ex is Extract<ExerciseDefinition, { type: 'write_query' | 'fix_bug' | 'business_case' | 'challenge' }> {
  return ex.type === 'write_query' || ex.type === 'fix_bug' || ex.type === 'business_case' || ex.type === 'challenge'
}

export function allowedStatements(ex: ExerciseDefinition): StatementKind[] {
  if (isQueryExercise(ex)) {
    const allow = ex.allow ?? []
    return [...new Set<StatementKind>(['select', ...allow])].filter((k) => k !== 'drop' && k !== 'alter')
  }
  return ['select']
}

/**
 * Reference programs whose results define a correct answer. Several entries mean
 * several accepted result shapes.
 */
export function referencePrograms(ex: ResolvedExercise): string[] {
  switch (ex.type) {
    case 'write_query':
    case 'fix_bug':
    case 'business_case':
    case 'challenge':
      return [ex.solution, ...(ex.alt ?? [])]
    case 'choose_query':
      return [ex.options[ex.correct]]
    case 'fill_blank':
      return [fillTemplate(ex.template, ex.answers)]
    case 'order_parts':
      return [ex.parts.join('\n')]
    case 'join_builder':
      return [buildJoinSql(ex, ex.answer)]
    default:
      return []
  }
}

export function solutionText(ex: ResolvedExercise): string {
  switch (ex.type) {
    case 'predict_result':
    case 'explain_query':
      return ex.sql
    default:
      return referencePrograms(ex)[0]
  }
}

/**
 * Converts a user answer into the SQL program to execute, validating that it only uses
 * the building blocks offered by the exercise.
 */
export function answerToSql(ex: ResolvedExercise, answer: ExerciseAnswer, knownColumns: (table: string) => string[]): string {
  switch (ex.type) {
    case 'write_query':
    case 'fix_bug':
    case 'business_case':
    case 'challenge':
      if (answer.kind !== 'sql') throw new AnswerError(tr('answer.sqlExpected'))
      return answer.sql
    case 'choose_query':
      if (answer.kind !== 'option' || answer.option >= ex.options.length) throw new AnswerError(tr('answer.chooseOption'))
      return ex.options[answer.option]
    case 'fill_blank': {
      if (answer.kind !== 'blanks' || answer.blanks.length !== ex.answers.length) throw new AnswerError(tr('answer.fillAllBlanks'))
      const values = answer.blanks.map((b, i) => {
        const value = b.trim()
        if (!value) throw new AnswerError(tr('answer.blankEmpty', { n: i + 1 }))
        if (value.includes(';')) throw new AnswerError(tr('answer.blankSemicolon'))
        const choices = ex.choices?.[i]
        if (choices && !choices.includes(value)) throw new AnswerError(tr('answer.blankInvalid', { n: i + 1 }))
        return value
      })
      return fillTemplate(ex.template, values)
    }
    case 'order_parts': {
      if (answer.kind !== 'parts' || answer.parts.length === 0) throw new AnswerError(tr('answer.assemble'))
      const pieces = orderPieces(ex)
      if (new Set(answer.parts).size !== answer.parts.length) throw new AnswerError(tr('answer.pieceOnce'))
      return answer.parts
        .map((index) => {
          const piece = pieces[index]
          if (piece === undefined) throw new AnswerError(tr('answer.unknownPiece'))
          return piece
        })
        .join('\n')
    }
    case 'join_builder': {
      if (answer.kind !== 'join') throw new AnswerError(tr('answer.configureJoin'))
      if (!ex.tables.includes(answer.left) || !ex.tables.includes(answer.right)) throw new AnswerError(tr('answer.chooseTables'))
      if (answer.join !== 'CROSS') {
        if (!answer.leftColumn || !knownColumns(answer.left).includes(answer.leftColumn)) {
          throw new AnswerError(tr('answer.chooseLeftColumn'))
        }
        if (!answer.rightColumn || !knownColumns(answer.right).includes(answer.rightColumn)) {
          throw new AnswerError(tr('answer.chooseRightColumn'))
        }
      }
      return buildJoinSql(ex, answer)
    }
    default:
      throw new AnswerError(tr('answer.noSql'))
  }
}

export function toPublicContent(ex: ResolvedExercise): PublicExerciseContent {
  switch (ex.type) {
    case 'write_query':
    case 'fix_bug':
    case 'business_case':
    case 'challenge':
      return {
        type: ex.type,
        starter: ex.starter ?? '',
        mode: ex.mode ?? 'query',
        allow: allowedStatements(ex),
        orderMatters: Boolean(ex.orderMatters),
        columnNames: Boolean(ex.columnNames)
      }
    case 'predict_result':
      return { type: ex.type, sql: ex.sql, ask: ex.ask, options: ex.options ?? null }
    case 'choose_query':
      return { type: ex.type, options: ex.options }
    case 'fill_blank':
      return { type: ex.type, template: ex.template, blanks: ex.answers.map((_, i) => ({ choices: ex.choices?.[i] ?? null })) }
    case 'join_builder':
      return { type: ex.type, tables: ex.tables, select: ex.select, suffix: ex.suffix ?? '' }
    case 'order_parts':
      return { type: ex.type, pieces: orderPieces(ex) }
    case 'explain_query':
      return { type: ex.type, sql: ex.sql, options: ex.options }
  }
}
