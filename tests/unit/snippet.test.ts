import { describe, expect, it } from 'vitest'
import { snippetOf } from '../../src/main/services/catalog.service'

describe('catalog snippets', () => {
  it('keeps identifiers and expressions inside inline code', () => {
    expect(snippetOf('Return `first_name` and the stock value (`price * stock`) in a `stock_value` column.')).toBe(
      'Return first_name and the stock value (price * stock) in a stock_value column.'
    )
  })

  it('strips emphasis, headings, quotes and fenced code', () => {
    expect(snippetOf('## Task\n> **Bold** and *italic* and _under_ text\n```sql\nSELECT 1;\n```\nafter')).toBe(
      'Task Bold and italic and under text after'
    )
  })

  it('keeps underscores inside plain words', () => {
    expect(snippetOf('Use snake_case names like order_items')).toBe('Use snake_case names like order_items')
  })

  it('truncates long text with an ellipsis', () => {
    const snippet = snippetOf('a'.repeat(200))
    expect(snippet).toHaveLength(158)
    expect(snippet.endsWith('…')).toBe(true)
  })
})
