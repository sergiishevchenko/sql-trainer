import { useEffect, useState, type ReactNode } from 'react'
import { SqlEditor } from '@/components/common/sql-editor'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { invoke, useApi } from '@/lib/query'
import type { WorkspaceProps } from '../types'

type QueryType = 'write_query' | 'fix_bug' | 'business_case' | 'challenge'

/**
 * Shared SQL editor workspace used by all free-form query exercise types.
 */
export function QueryEditorWorkspace({
  exercise,
  content,
  onAnswer,
  onRun,
  onSubmit,
  disabled,
  editorRef,
  initialSql,
  banner
}: WorkspaceProps<QueryType> & { banner?: ReactNode }) {
  const settings = useApi('settings:get')
  const [sql, setSql] = useState(() => initialSql ?? exercise.progress.draft ?? content.starter)
  const saveDraft = useDebouncedCallback((draft: string) => {
    if (settings.data?.autoSaveDrafts === false) return
    void invoke('exercises:saveDraft', { exerciseId: exercise.id, draft }).catch(() => undefined)
  }, 700)

  useEffect(() => {
    onAnswer(sql.trim() ? { kind: 'sql', sql } : null)
  }, [sql, onAnswer])

  return (
    <div className="flex h-full flex-col">
      {banner}
      <div className="min-h-0 flex-1">
        <SqlEditor
          value={sql}
          readOnly={disabled}
          onChange={(value) => {
            setSql(value)
            saveDraft(value)
          }}
          onRun={onRun}
          onSubmit={onSubmit}
          handleRef={editorRef}
        />
      </div>
    </div>
  )
}

export function resetQueryWorkspaceDraft(exerciseId: string, starter: string): Promise<null> {
  return invoke('exercises:saveDraft', { exerciseId, draft: starter })
}
