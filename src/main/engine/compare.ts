import type { ComparisonResult, ResultSet, SqlCell } from '@shared/types/engine'

export interface CompareOptions {
  orderMatters: boolean
  checkColumnNames: boolean
  precision?: number
}

export function normalizeForCompare(cell: SqlCell, precision: number): SqlCell {
  if (typeof cell === 'number') {
    if (Number.isInteger(cell)) return cell
    const factor = 10 ** precision
    const rounded = Math.round(cell * factor) / factor
    return Object.is(rounded, -0) ? 0 : rounded
  }
  return cell
}

function rowKey(row: SqlCell[], precision: number): string {
  return JSON.stringify(row.map((c) => normalizeForCompare(c, precision)))
}

/**
 * Compares two result sets by shape and values. Row order only matters when the task requires it;
 * integers and reals are considered equal when they round to the same value.
 */
export function compareResultSets(
  expected: ResultSet | null,
  actual: ResultSet | null,
  options: CompareOptions
): ComparisonResult {
  const precision = options.precision ?? 6
  if (!actual) return { equal: false, issue: { code: 'no_result' } }
  if (!expected) return { equal: false, issue: { code: 'no_result' } }

  if (expected.columns.length !== actual.columns.length) {
    return {
      equal: false,
      issue: { code: 'column_count', expected: expected.columns.length, actual: actual.columns.length }
    }
  }
  if (options.checkColumnNames) {
    const a = expected.columns.map((c) => c.toLowerCase())
    const b = actual.columns.map((c) => c.toLowerCase())
    if (a.some((name, i) => name !== b[i])) {
      return { equal: false, issue: { code: 'column_names', expected: expected.columns, actual: actual.columns } }
    }
  }
  if (expected.rows.length !== actual.rows.length) {
    return { equal: false, issue: { code: 'row_count', expected: expected.rows.length, actual: actual.rows.length } }
  }

  const expectedKeys = expected.rows.map((r) => rowKey(r, precision))
  const actualKeys = actual.rows.map((r) => rowKey(r, precision))

  if (options.orderMatters) {
    const mismatch = expectedKeys.findIndex((k, i) => k !== actualKeys[i])
    if (mismatch === -1) return { equal: true }
    const sameMultiset = multisetEqual(expectedKeys, actualKeys)
    return { equal: false, issue: sameMultiset ? { code: 'order' } : { code: 'values', row: mismatch } }
  }

  if (multisetEqual(expectedKeys, actualKeys)) return { equal: true }
  const counts = countKeys(actualKeys)
  const missing = expectedKeys.findIndex((k) => {
    const c = counts.get(k) ?? 0
    if (c === 0) return true
    counts.set(k, c - 1)
    return false
  })
  return { equal: false, issue: { code: 'values', row: Math.max(missing, 0) } }
}

function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1)
  return counts
}

function multisetEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const counts = countKeys(a)
  for (const k of b) {
    const c = counts.get(k)
    if (!c) return false
    counts.set(k, c - 1)
  }
  return true
}

export function formatCellForAnswer(cell: SqlCell): string {
  if (cell === null) return 'NULL'
  if (typeof cell === 'number') return String(normalizeForCompare(cell, 6))
  return cell
}

export function normalizeUserAnswer(value: string): string {
  const trimmed = value.trim().replace(/^['"]|['"]$/g, '').trim()
  if (/^null$/i.test(trimmed)) return 'NULL'
  const asNumber = Number(trimmed.replace(',', '.'))
  if (trimmed !== '' && Number.isFinite(asNumber)) return String(normalizeForCompare(asNumber, 6))
  return trimmed.toLowerCase()
}

export function answersMatch(expected: string, actual: string): boolean {
  return normalizeUserAnswer(expected) === normalizeUserAnswer(actual)
}
