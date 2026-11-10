import { describe, expect, it } from 'vitest'
import { guardSql, hasTopLevelOrderBy, PLAYGROUND_POLICY, referencedIdentifiers, SELECT_ONLY_POLICY, splitStatements, tokenize } from '../../src/main/engine/guard'

function blocked(sql: string, policy = SELECT_ONLY_POLICY): string {
  const result = guardSql(sql, policy)
  if (result.ok) throw new Error(`expected "${sql}" to be blocked`)
  return result.error.code
}

describe('guardSql', () => {
  it('accepts plain SELECT, WITH and VALUES queries', () => {
    expect(guardSql('SELECT * FROM products', SELECT_ONLY_POLICY).ok).toBe(true)
    expect(guardSql('WITH t AS (SELECT 1 AS x) SELECT x FROM t', SELECT_ONLY_POLICY).ok).toBe(true)
    expect(guardSql('SELECT 1; SELECT 2;', SELECT_ONLY_POLICY).ok).toBe(true)
  })

  it('rejects data modification when only SELECT is allowed', () => {
    expect(blocked('DELETE FROM products')).toBe('forbidden')
    expect(blocked('UPDATE products SET price = 0')).toBe('forbidden')
    expect(blocked('INSERT INTO products (name) VALUES (1)')).toBe('forbidden')
    expect(blocked('SELECT 1; DROP TABLE products')).toBe('forbidden')
  })

  it('always rejects ATTACH, DETACH, PRAGMA and extension loading, even in the playground', () => {
    for (const sql of [
      "ATTACH DATABASE 'x.db' AS x",
      'DETACH DATABASE x',
      'PRAGMA writable_schema = 1',
      'VACUUM',
      "SELECT load_extension('evil')",
      'SELECT 1; pragma table_info(products)'
    ]) {
      expect(blocked(sql, PLAYGROUND_POLICY)).toBe('forbidden')
    }
  })

  it('blocks writes to sqlite system tables in the playground', () => {
    expect(blocked("UPDATE sqlite_schema SET sql = ''", PLAYGROUND_POLICY)).toBe('forbidden')
    expect(blocked('DELETE FROM sqlite_master', PLAYGROUND_POLICY)).toBe('forbidden')
  })

  it('allows DDL and DML in the playground', () => {
    expect(guardSql('CREATE TABLE t (id INTEGER); INSERT INTO t VALUES (1); DROP TABLE t', PLAYGROUND_POLICY).ok).toBe(true)
    expect(guardSql('BEGIN; UPDATE products SET price = price * 2; ROLLBACK;', PLAYGROUND_POLICY).ok).toBe(true)
  })

  it('ignores forbidden words inside strings and comments', () => {
    expect(guardSql("SELECT 'DROP TABLE x; ATTACH' AS s -- DELETE FROM y\n FROM products", SELECT_ONLY_POLICY).ok).toBe(true)
    expect(guardSql('SELECT /* PRAGMA */ 1', SELECT_ONLY_POLICY).ok).toBe(true)
  })

  it('reports syntax errors for unterminated strings and empty input', () => {
    expect(blocked("SELECT 'abc")).toBe('syntax')
    expect(blocked('   ')).toBe('syntax')
  })

  it('limits SQL length and statement count', () => {
    expect(blocked(`SELECT ${'1,'.repeat(15000)}1`)).toBe('limit')
    expect(blocked('SELECT 1;'.repeat(40))).toBe('limit')
  })
})

describe('tokenizer helpers', () => {
  it('splits statements on top-level semicolons only', () => {
    const statements = splitStatements(tokenize("SELECT ';'; SELECT 2"))
    expect(statements).toHaveLength(2)
  })

  it('detects top-level ORDER BY but not ORDER BY inside subqueries or windows', () => {
    expect(hasTopLevelOrderBy('SELECT * FROM t ORDER BY a')).toBe(true)
    expect(hasTopLevelOrderBy('SELECT * FROM (SELECT * FROM t ORDER BY a) x')).toBe(false)
    expect(hasTopLevelOrderBy('SELECT ROW_NUMBER() OVER (ORDER BY a) FROM t')).toBe(false)
  })

  it('collects referenced identifiers', () => {
    const ids = referencedIdentifiers('SELECT c.name FROM customers c JOIN orders o ON o.customer_id = c.id')
    expect(ids.has('customers')).toBe(true)
    expect(ids.has('orders')).toBe(true)
  })
})
