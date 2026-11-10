import { Fragment, useEffect, useMemo, useState } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { WorkspaceProps } from '../types'

type Segment = { kind: 'text'; text: string } | { kind: 'blank'; index: number }

function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = []
  const pattern = /\{\{(\d+)\}\}/g
  let last = 0
  for (let match = pattern.exec(template); match; match = pattern.exec(template)) {
    if (match.index > last) segments.push({ kind: 'text', text: template.slice(last, match.index) })
    segments.push({ kind: 'blank', index: Number(match[1]) - 1 })
    last = match.index + match[0].length
  }
  if (last < template.length) segments.push({ kind: 'text', text: template.slice(last) })
  return segments
}

const fieldClass =
  'mx-0.5 inline-block h-7 rounded-md border border-primary/40 bg-primary/8 px-2 align-middle font-mono text-[13px] text-primary outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60'

export function FillBlankWorkspace({ content, onAnswer, onRun, onSubmit, disabled }: WorkspaceProps<'fill_blank'>) {
  const t = useT()
  const segments = useMemo(() => parseTemplate(content.template), [content.template])
  const [values, setValues] = useState<string[]>(() => content.blanks.map(() => ''))

  useEffect(() => {
    onAnswer(values.every((v) => v.trim()) ? { kind: 'blanks', blanks: values } : null)
  }, [values, onAnswer])

  const update = (index: number, value: string) => setValues((v) => v.map((old, i) => (i === index ? value : old)))

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      if (e.shiftKey) onSubmit()
      else onRun()
    }
  }

  return (
    <div className="h-full overflow-y-auto p-5" onKeyDown={onKeyDown}>
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.fillBlanks')}</p>
      <pre className="rounded-lg border bg-[#0d0d12] p-4 font-mono text-[13px] leading-9 whitespace-pre-wrap text-foreground/90">
        {segments.map((segment, i) => {
          if (segment.kind === 'text') return <Fragment key={i}>{segment.text}</Fragment>
          const choices = content.blanks[segment.index]?.choices
          const value = values[segment.index] ?? ''
          if (choices) {
            return (
              <select
                key={i}
                disabled={disabled}
                value={value}
                onChange={(e) => update(segment.index, e.target.value)}
                className={cn(fieldClass, 'pr-1', !value && 'text-muted-foreground')}
                aria-label={t('solver.blank', { n: segment.index + 1 })}
                data-testid={`blank-${segment.index}`}
              >
                <option value="">{t('solver.selectPlaceholder')}</option>
                {choices.map((choice) => (
                  <option key={choice} value={choice}>
                    {choice}
                  </option>
                ))}
              </select>
            )
          }
          return (
            <input
              key={i}
              disabled={disabled}
              value={value}
              onChange={(e) => update(segment.index, e.target.value)}
              placeholder={`${segment.index + 1}`}
              style={{ width: `${Math.max(4, value.length + 2)}ch` }}
              className={fieldClass}
              aria-label={t('solver.blank', { n: segment.index + 1 })}
              data-testid={`blank-${segment.index}`}
              spellCheck={false}
              autoFocus={segment.index === 0}
            />
          )
        })}
      </pre>
    </div>
  )
}
