import { useEffect, useMemo, useState } from 'react'
import { JOIN_TYPES, type JoinType } from '@shared/constants/domain'
import { SqlCode } from '@/components/common/sql-code'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useT } from '@/i18n'
import type { WorkspaceProps } from '../types'

interface JoinState {
  left: string
  right: string
  join: JoinType | ''
  leftColumn: string
  rightColumn: string
}

function quote(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function preview(select: string, suffix: string, s: JoinState): string {
  const left = s.left ? quote(s.left) : '…'
  const right = s.right ? quote(s.right) : '…'
  let sql = `SELECT ${select}\nFROM ${left}\n${s.join || '…'} JOIN ${right}`
  if (s.join !== 'CROSS') sql += ` ON ${left}.${s.leftColumn ? quote(s.leftColumn) : '…'} = ${right}.${s.rightColumn ? quote(s.rightColumn) : '…'}`
  if (suffix) sql += `\n${suffix}`
  return sql
}

function Field({ label, value, onChange, options, disabled, testId }: { label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean; testId: string }) {
  const t = useT()
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled || options.length === 0}>
        <SelectTrigger className="font-mono text-[13px]" data-testid={testId}>
          <SelectValue placeholder={t('solver.selectPlaceholder')} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="font-mono text-[13px]">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function JoinBuilderWorkspace({ content, onAnswer, disabled, schema }: WorkspaceProps<'join_builder'>) {
  const t = useT()
  const [state, setState] = useState<JoinState>({ left: '', right: '', join: '', leftColumn: '', rightColumn: '' })
  const columns = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const table of schema?.tables ?? []) map.set(table.name, table.columns.map((c) => c.name))
    return map
  }, [schema])

  useEffect(() => {
    const { left, right, join, leftColumn, rightColumn } = state
    const complete = left && right && join && (join === 'CROSS' || (leftColumn && rightColumn))
    onAnswer(
      complete
        ? { kind: 'join', left, right, join: join as JoinType, ...(join === 'CROSS' ? {} : { leftColumn, rightColumn }) }
        : null
    )
  }, [state, onAnswer])

  const set = (patch: Partial<JoinState>) => setState((s) => ({ ...s, ...patch }))

  return (
    <div className="h-full space-y-5 overflow-y-auto p-5">
      <div className="grid grid-cols-3 gap-3">
        <Field label={t('solver.leftTable')} value={state.left} onChange={(left) => set({ left, leftColumn: '' })} options={content.tables} disabled={disabled} testId="join-left" />
        <Field label={t('solver.joinType')} value={state.join} onChange={(join) => set({ join: join as JoinType })} options={[...JOIN_TYPES]} disabled={disabled} testId="join-type" />
        <Field label={t('solver.rightTable')} value={state.right} onChange={(right) => set({ right, rightColumn: '' })} options={content.tables} disabled={disabled} testId="join-right" />
      </div>
      {state.join !== 'CROSS' && (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label={t('solver.leftColumn')}
            value={state.leftColumn}
            onChange={(leftColumn) => set({ leftColumn })}
            options={columns.get(state.left) ?? []}
            disabled={disabled}
            testId="join-left-column"
          />
          <Field
            label={t('solver.rightColumn')}
            value={state.rightColumn}
            onChange={(rightColumn) => set({ rightColumn })}
            options={columns.get(state.right) ?? []}
            disabled={disabled}
            testId="join-right-column"
          />
        </div>
      )}
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.preview')}</p>
        <SqlCode code={preview(content.select, content.suffix, state)} />
      </div>
    </div>
  )
}
