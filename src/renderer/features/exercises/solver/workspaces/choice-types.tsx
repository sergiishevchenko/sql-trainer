import { useEffect, useState } from 'react'
import { SqlCode } from '@/components/common/sql-code'
import { Input } from '@/components/ui/input'
import { useT } from '@/i18n'
import type { WorkspaceProps } from '../types'
import { OptionList } from './option-list'

function WorkspaceScroll({ children }: { children: React.ReactNode }) {
  return <div className="h-full overflow-y-auto p-5">{children}</div>
}

export function ChooseQueryWorkspace({ content, onAnswer, disabled }: WorkspaceProps<'choose_query'>) {
  const t = useT()
  const [selected, setSelected] = useState<number | null>(null)
  useEffect(() => {
    onAnswer(selected === null ? null : { kind: 'option', option: selected })
  }, [selected, onAnswer])
  return (
    <WorkspaceScroll>
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.chooseOption')}</p>
      <OptionList
        options={content.options}
        selected={selected}
        onSelect={setSelected}
        disabled={disabled}
        render={(option) => <SqlCode code={option} className="border-0 bg-transparent p-0" />}
      />
    </WorkspaceScroll>
  )
}

export function ExplainQueryWorkspace({ content, onAnswer, disabled }: WorkspaceProps<'explain_query'>) {
  const t = useT()
  const [selected, setSelected] = useState<number | null>(null)
  useEffect(() => {
    onAnswer(selected === null ? null : { kind: 'option', option: selected })
  }, [selected, onAnswer])
  return (
    <WorkspaceScroll>
      <SqlCode code={content.sql} className="mb-5" />
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.explainQuestion')}</p>
      <OptionList options={content.options} selected={selected} onSelect={setSelected} disabled={disabled} />
    </WorkspaceScroll>
  )
}

export function PredictResultWorkspace({ content, onAnswer, onSubmit, disabled }: WorkspaceProps<'predict_result'>) {
  const t = useT()
  const [value, setValue] = useState('')
  const [selected, setSelected] = useState<number | null>(null)
  const options = content.options

  useEffect(() => {
    if (options) onAnswer(selected === null ? null : { kind: 'value', value: options[selected] })
    else onAnswer(value.trim() ? { kind: 'value', value } : null)
  }, [value, selected, options, onAnswer])

  return (
    <WorkspaceScroll>
      <SqlCode code={content.sql} className="mb-5" />
      <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {content.ask === 'rowCount' ? t('solver.predictRows') : t('solver.predictValue')}
      </p>
      {options ? (
        <OptionList
          options={options}
          selected={selected}
          onSelect={setSelected}
          disabled={disabled}
          render={(option) => <span className="font-mono">{option}</span>}
        />
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit()
          }}
        >
          <Input
            autoFocus
            disabled={disabled}
            className="h-11 max-w-sm font-mono text-base"
            placeholder={t('solver.answerPlaceholder')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            data-testid="predict-input"
          />
        </form>
      )}
    </WorkspaceScroll>
  )
}
