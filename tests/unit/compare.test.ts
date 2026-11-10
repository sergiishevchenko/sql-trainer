import { describe, expect, it } from 'vitest'
import type { ResultSet } from '@shared/types/engine'
import { answersMatch, compareResultSets } from '../../src/main/engine/compare'

const rs = (columns: string[], rows: (string | number | null)[][]): ResultSet => ({ columns, rows, truncated: false })
const unordered = { orderMatters: false, checkColumnNames: false }
const ordered = { orderMatters: true, checkColumnNames: false }

describe('compareResultSets', () => {
  it('treats unordered results as multisets', () => {
    const a = rs(['x'], [[1], [2], [2]])
    expect(compareResultSets(a, rs(['y'], [[2], [1], [2]]), unordered).equal).toBe(true)
    expect(compareResultSets(a, rs(['x'], [[2], [1], [1]]), unordered).issue).toEqual({ code: 'values', row: 2 })
  })

  it('distinguishes wrong order from wrong values when order matters', () => {
    const expected = rs(['x'], [[1], [2]])
    expect(compareResultSets(expected, rs(['x'], [[2], [1]]), ordered).issue).toEqual({ code: 'order' })
    expect(compareResultSets(expected, rs(['x'], [[1], [3]]), ordered).issue).toEqual({ code: 'values', row: 1 })
  })

  it('reports column and row count mismatches', () => {
    expect(compareResultSets(rs(['a', 'b'], [[1, 2]]), rs(['a'], [[1]]), unordered).issue?.code).toBe('column_count')
    expect(compareResultSets(rs(['a'], [[1]]), rs(['a'], [[1], [1]]), unordered).issue?.code).toBe('row_count')
  })

  it('checks column names case-insensitively only when required', () => {
    const options = { orderMatters: false, checkColumnNames: true }
    expect(compareResultSets(rs(['Total'], [[1]]), rs(['total'], [[1]]), options).equal).toBe(true)
    expect(compareResultSets(rs(['total'], [[1]]), rs(['sum'], [[1]]), options).issue?.code).toBe('column_names')
  })

  it('compares reals with rounding and treats NULL as a distinct value', () => {
    expect(compareResultSets(rs(['v'], [[0.1 + 0.2]]), rs(['v'], [[0.3]]), unordered).equal).toBe(true)
    expect(compareResultSets(rs(['v'], [[null]]), rs(['v'], [['NULL']]), unordered).equal).toBe(false)
  })

  it('fails when the user query returned no result set', () => {
    expect(compareResultSets(rs(['a'], [[1]]), null, unordered).issue).toEqual({ code: 'no_result' })
  })
})

describe('answersMatch', () => {
  it('normalises numbers, quotes, case and NULL', () => {
    expect(answersMatch('42', ' 42 ')).toBe(true)
    expect(answersMatch('2.5', '2,5')).toBe(true)
    expect(answersMatch('London', "'london'")).toBe(true)
    expect(answersMatch('NULL', 'null')).toBe(true)
    expect(answersMatch('3', '4')).toBe(false)
  })
})
