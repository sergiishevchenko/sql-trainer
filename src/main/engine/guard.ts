import { ENGINE_LIMITS, type StatementKind } from '@shared/constants/domain'
import type { EngineError } from '@shared/types/engine'

type TokenType = 'word' | 'ident' | 'string' | 'number' | 'punct' | 'semicolon'

export interface Token {
  type: TokenType
  value: string
  upper: string
}

export interface ClassifiedStatement {
  kind: StatementKind | 'forbidden'
  tokens: Token[]
  reason?: string
}

export interface SqlPolicy {
  allowed: readonly StatementKind[]
  maxStatements?: number
}

export const SELECT_ONLY_POLICY: SqlPolicy = { allowed: ['select'] }

export const PLAYGROUND_POLICY: SqlPolicy = {
  allowed: ['select', 'insert', 'update', 'delete', 'create_table', 'create_index', 'create_view', 'drop', 'alter', 'transaction']
}

const ALWAYS_FORBIDDEN_WORDS = new Set(['ATTACH', 'DETACH', 'PRAGMA', 'VACUUM', 'REINDEX', 'ANALYZE', 'LOAD_EXTENSION'])
const WRITE_WORDS = new Set(['INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER'])
const TRANSACTION_WORDS = new Set(['BEGIN', 'COMMIT', 'END', 'ROLLBACK', 'SAVEPOINT', 'RELEASE'])

export class SqlTokenizeError extends Error {}

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const n = sql.length
  const push = (type: TokenType, value: string) => tokens.push({ type, value, upper: value.toUpperCase() })

  while (i < n) {
    const ch = sql[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '-' && sql[i + 1] === '-') {
      while (i < n && sql[i] !== '\n') i += 1
      continue
    }
    if (ch === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2)
      if (end === -1) throw new SqlTokenizeError('Незакрытый многострочный комментарий')
      i = end + 2
      continue
    }
    if (ch === "'") {
      let j = i + 1
      let value = ''
      for (;;) {
        if (j >= n) throw new SqlTokenizeError('Незакрытая строковая константа')
        if (sql[j] === "'") {
          if (sql[j + 1] === "'") {
            value += "'"
            j += 2
            continue
          }
          break
        }
        value += sql[j]
        j += 1
      }
      push('string', value)
      i = j + 1
      continue
    }
    if (ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch
      let j = i + 1
      let value = ''
      for (;;) {
        if (j >= n) throw new SqlTokenizeError('Незакрытый идентификатор в кавычках')
        if (sql[j] === close) {
          if (close !== ']' && sql[j + 1] === close) {
            value += close
            j += 2
            continue
          }
          break
        }
        value += sql[j]
        j += 1
      }
      push('ident', value)
      i = j + 1
      continue
    }
    if (/[A-Za-z_\u0080-\uffff]/.test(ch)) {
      let j = i + 1
      while (j < n && /[A-Za-z0-9_$\u0080-\uffff]/.test(sql[j])) j += 1
      push('word', sql.slice(i, j))
      i = j
      continue
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      let j = i + 1
      while (j < n && /[0-9.eExX_a-fA-F]/.test(sql[j])) j += 1
      push('number', sql.slice(i, j))
      i = j
      continue
    }
    if (ch === ';') {
      push('semicolon', ';')
      i += 1
      continue
    }
    push('punct', ch)
    i += 1
  }
  return tokens
}

export function splitStatements(tokens: Token[]): Token[][] {
  const statements: Token[][] = []
  let current: Token[] = []
  for (const token of tokens) {
    if (token.type === 'semicolon') {
      if (current.length > 0) statements.push(current)
      current = []
    } else {
      current.push(token)
    }
  }
  if (current.length > 0) statements.push(current)
  return statements
}

function mainVerbAfterWith(tokens: Token[]): string | null {
  let depth = 0
  for (let i = 1; i < tokens.length; i += 1) {
    const t = tokens[i]
    if (t.type === 'punct' && t.value === '(') depth += 1
    else if (t.type === 'punct' && t.value === ')') depth -= 1
    else if (depth === 0 && t.type === 'word' && ['SELECT', 'VALUES', 'INSERT', 'UPDATE', 'DELETE', 'REPLACE'].includes(t.upper)) {
      return t.upper
    }
  }
  return null
}

function verbToKind(verb: string): StatementKind | null {
  switch (verb) {
    case 'SELECT':
    case 'VALUES':
      return 'select'
    case 'INSERT':
    case 'REPLACE':
      return 'insert'
    case 'UPDATE':
      return 'update'
    case 'DELETE':
      return 'delete'
    default:
      return null
  }
}

export function classifyStatement(tokens: Token[]): ClassifiedStatement {
  const first = tokens[0]
  if (!first || first.type !== 'word') {
    return { kind: 'forbidden', tokens, reason: 'Запрос должен начинаться с ключевого слова SQL' }
  }
  const verb = first.upper
  if (verb === 'EXPLAIN') return { kind: 'select', tokens }
  if (verb === 'WITH') {
    const main = mainVerbAfterWith(tokens)
    const kind = main ? verbToKind(main) : null
    return kind ? { kind, tokens } : { kind: 'forbidden', tokens, reason: 'Не удалось определить основной оператор после WITH' }
  }
  const simple = verbToKind(verb)
  if (simple) return { kind: simple, tokens }
  if (verb === 'CREATE') {
    const words = tokens.slice(1, 4).map((t) => t.upper)
    const target = words.find((w) => !['TEMP', 'TEMPORARY', 'UNIQUE'].includes(w))
    if (target === 'TABLE') return { kind: 'create_table', tokens }
    if (target === 'INDEX') return { kind: 'create_index', tokens }
    if (target === 'VIEW') return { kind: 'create_view', tokens }
    return { kind: 'forbidden', tokens, reason: `CREATE ${target ?? ''} запрещён`.trim() }
  }
  if (verb === 'DROP') return { kind: 'drop', tokens }
  if (verb === 'ALTER') return { kind: 'alter', tokens }
  if (TRANSACTION_WORDS.has(verb)) return { kind: 'transaction', tokens }
  return { kind: 'forbidden', tokens, reason: `Оператор ${verb} запрещён` }
}

const KIND_LABELS: Record<StatementKind, string> = {
  select: 'SELECT',
  insert: 'INSERT',
  update: 'UPDATE',
  delete: 'DELETE',
  create_table: 'CREATE TABLE',
  create_index: 'CREATE INDEX',
  create_view: 'CREATE VIEW',
  drop: 'DROP',
  alter: 'ALTER',
  transaction: 'BEGIN/COMMIT/ROLLBACK'
}

export type GuardResult = { ok: true; statements: ClassifiedStatement[] } | { ok: false; error: EngineError }

/**
 * Static safety check performed before any SQL reaches the engine.
 * Comments and string literals are stripped by the tokenizer so keywords cannot be smuggled through them.
 */
export function guardSql(sql: string, policy: SqlPolicy): GuardResult {
  if (sql.length > ENGINE_LIMITS.maxSqlLength) {
    return { ok: false, error: { code: 'limit', message: `Запрос слишком длинный (максимум ${ENGINE_LIMITS.maxSqlLength} символов)` } }
  }
  let tokens: Token[]
  try {
    tokens = tokenize(sql)
  } catch (error) {
    return { ok: false, error: { code: 'syntax', message: (error as Error).message } }
  }
  const raw = splitStatements(tokens)
  if (raw.length === 0) {
    return { ok: false, error: { code: 'syntax', message: 'Пустой запрос: напишите хотя бы одну SQL-команду' } }
  }
  const maxStatements = policy.maxStatements ?? ENGINE_LIMITS.maxStatements
  if (raw.length > maxStatements) {
    return { ok: false, error: { code: 'limit', message: `Слишком много команд в одном запуске (максимум ${maxStatements})` } }
  }

  const allowed = new Set(policy.allowed)
  const statements: ClassifiedStatement[] = []
  for (const stmtTokens of raw) {
    for (let i = 0; i < stmtTokens.length; i += 1) {
      const t = stmtTokens[i]
      if (t.type === 'word' && ALWAYS_FORBIDDEN_WORDS.has(t.upper)) {
        return { ok: false, error: { code: 'forbidden', message: `Команда ${t.upper} запрещена в учебной среде` } }
      }
    }
    const classified = classifyStatement(stmtTokens)
    if (classified.kind === 'forbidden') {
      return { ok: false, error: { code: 'forbidden', message: classified.reason ?? 'Запрещённая команда' } }
    }
    if (!allowed.has(classified.kind)) {
      const allowedList = policy.allowed.map((k) => KIND_LABELS[k]).join(', ')
      return {
        ok: false,
        error: {
          code: 'forbidden',
          message: `Команда ${KIND_LABELS[classified.kind]} недоступна в этом задании. Разрешено: ${allowedList}`
        }
      }
    }
    if (classified.kind === 'select') {
      const write = stmtTokens.find(
        (t, idx) =>
          t.type === 'word' &&
          (WRITE_WORDS.has(t.upper) || (t.upper === 'REPLACE' && stmtTokens[idx + 1]?.value !== '('))
      )
      if (write) {
        return { ok: false, error: { code: 'forbidden', message: `Команда ${write.upper} недоступна в этом задании` } }
      }
    }
    if (classified.kind !== 'select' && classified.kind !== 'transaction') {
      const systemTable = stmtTokens.find((t) => (t.type === 'word' || t.type === 'ident') && t.value.toLowerCase().startsWith('sqlite_'))
      if (systemTable) {
        return { ok: false, error: { code: 'forbidden', message: 'Изменение системных таблиц SQLite запрещено' } }
      }
    }
    statements.push(classified)
  }
  return { ok: true, statements }
}

export function referencedIdentifiers(sql: string): Set<string> {
  try {
    return new Set(
      tokenize(sql)
        .filter((t) => t.type === 'word' || t.type === 'ident')
        .map((t) => t.value.toLowerCase())
    )
  } catch {
    return new Set()
  }
}

export function hasTopLevelOrderBy(sql: string): boolean {
  let tokens: Token[]
  try {
    tokens = tokenize(sql)
  } catch {
    return false
  }
  const statements = splitStatements(tokens)
  const last = statements[statements.length - 1] ?? []
  let depth = 0
  for (let i = 0; i < last.length - 1; i += 1) {
    const t = last[i]
    if (t.type === 'punct' && t.value === '(') depth += 1
    else if (t.type === 'punct' && t.value === ')') depth -= 1
    else if (depth === 0 && t.upper === 'ORDER' && last[i + 1].upper === 'BY') return true
  }
  return false
}
