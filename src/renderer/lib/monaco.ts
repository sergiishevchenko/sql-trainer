import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/editor/editor.all.js'
import 'monaco-editor/esm/vs/basic-languages/sql/sql.contribution'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import { format } from 'sql-formatter'

export const EDITOR_THEME = 'sql-mastery-dark'

const SQL_KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'BETWEEN', 'LIKE', 'IS', 'NULL', 'AS', 'DISTINCT',
  'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'ASC', 'DESC', 'JOIN', 'INNER JOIN', 'LEFT JOIN',
  'RIGHT JOIN', 'FULL OUTER JOIN', 'CROSS JOIN', 'ON', 'USING', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT',
  'WITH', 'RECURSIVE', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'EXISTS', 'INSERT INTO', 'VALUES', 'UPDATE',
  'SET', 'DELETE FROM', 'CREATE TABLE', 'CREATE INDEX', 'CREATE VIEW', 'BEGIN', 'COMMIT', 'ROLLBACK',
  'SAVEPOINT', 'RELEASE', 'OVER', 'PARTITION BY', 'ROWS BETWEEN', 'RANGE BETWEEN', 'UNBOUNDED PRECEDING',
  'CURRENT ROW', 'UNBOUNDED FOLLOWING', 'EXPLAIN QUERY PLAN', 'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES',
  'DEFAULT', 'UNIQUE', 'CHECK', 'NULLS FIRST', 'NULLS LAST', 'FILTER'
]

const SQL_FUNCTIONS = [
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'ROUND', 'ABS', 'LENGTH', 'UPPER', 'LOWER', 'TRIM', 'LTRIM', 'RTRIM',
  'SUBSTR', 'REPLACE', 'INSTR', 'COALESCE', 'IFNULL', 'NULLIF', 'CAST', 'DATE', 'TIME', 'DATETIME',
  'JULIANDAY', 'STRFTIME', 'GROUP_CONCAT', 'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'NTILE', 'LAG', 'LEAD',
  'FIRST_VALUE', 'LAST_VALUE', 'NTH_VALUE', 'PERCENT_RANK', 'CUME_DIST', 'IIF', 'PRINTF', 'TOTAL', 'TYPEOF'
]

export interface CompletionTable {
  name: string
  columns: string[]
}

let completionTables: CompletionTable[] = []
let initialised = false

export function setCompletionSchema(tables: CompletionTable[]): void {
  completionTables = tables
}

function registerCompletion(): void {
  monaco.languages.registerCompletionItemProvider('sql', {
    triggerCharacters: ['.', ' '],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position)
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      }
      const before = model.getValueInRange({
        startLineNumber: position.lineNumber,
        startColumn: Math.max(1, word.startColumn - 64),
        endLineNumber: position.lineNumber,
        endColumn: word.startColumn
      })
      const qualifier = /([A-Za-z_][\w]*)\.$/.exec(before)?.[1]
      const { CompletionItemKind } = monaco.languages
      if (qualifier) {
        const text = model.getValue()
        const aliasMatch = new RegExp(`\\b([A-Za-z_]\\w*)\\s+(?:AS\\s+)?${qualifier}\\b`, 'i').exec(text)
        const target = completionTables.find(
          (t) => t.name.toLowerCase() === qualifier.toLowerCase() || t.name.toLowerCase() === aliasMatch?.[1]?.toLowerCase()
        )
        if (target) {
          return {
            suggestions: target.columns.map((column) => ({
              label: column,
              kind: CompletionItemKind.Field,
              insertText: column,
              detail: target.name,
              range
            }))
          }
        }
      }
      const suggestions: monaco.languages.CompletionItem[] = [
        ...SQL_KEYWORDS.map((k) => ({ label: k, kind: CompletionItemKind.Keyword, insertText: k, range, sortText: `3${k}` })),
        ...SQL_FUNCTIONS.map((f) => ({
          label: f,
          kind: CompletionItemKind.Function,
          insertText: `${f}($0)`,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
          sortText: `2${f}`
        })),
        ...completionTables.map((t) => ({
          label: t.name,
          kind: CompletionItemKind.Class,
          insertText: t.name,
          detail: 'table',
          range,
          sortText: `0${t.name}`
        })),
        ...completionTables.flatMap((t) =>
          t.columns.map((c) => ({
            label: c,
            kind: CompletionItemKind.Field,
            insertText: c,
            detail: t.name,
            range,
            sortText: `1${c}`
          }))
        )
      ]
      return { suggestions }
    }
  })
}

/**
 * Configures the bundled Monaco instance once: local workers (no CDN), theme and SQL completion.
 */
export function setupMonaco(): void {
  if (initialised) return
  initialised = true
  self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
  loader.config({ monaco })
  monaco.editor.defineTheme(EDITOR_THEME, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'keyword', foreground: 'a78bfa', fontStyle: 'bold' },
      { token: 'operator', foreground: 'c4b5fd' },
      { token: 'string', foreground: '86efac' },
      { token: 'number', foreground: 'fbbf24' },
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'predefined', foreground: '67e8f9' },
      { token: 'identifier', foreground: 'e5e7eb' }
    ],
    colors: {
      'editor.background': '#0d0d12',
      'editor.lineHighlightBackground': '#ffffff08',
      'editorLineNumber.foreground': '#4b4b5c',
      'editorLineNumber.activeForeground': '#a78bfa',
      'editorCursor.foreground': '#a78bfa',
      'editor.selectionBackground': '#7c5cff40',
      'editorIndentGuide.background1': '#ffffff0a',
      'editorWidget.background': '#16161d',
      'editorSuggestWidget.background': '#16161d',
      'editorSuggestWidget.border': '#ffffff14',
      'editorSuggestWidget.selectedBackground': '#7c5cff33',
      'scrollbarSlider.background': '#ffffff12',
      'scrollbarSlider.hoverBackground': '#ffffff20'
    }
  })
  registerCompletion()
}

export function formatSql(sql: string): string {
  try {
    return format(sql, { language: 'sqlite', keywordCase: 'upper', tabWidth: 2 })
  } catch {
    return sql
  }
}

export { monaco }
