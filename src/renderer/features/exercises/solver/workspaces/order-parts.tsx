import { Reorder } from 'framer-motion'
import { GripVertical, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import type { WorkspaceProps } from '../types'

export function OrderPartsWorkspace({ content, onAnswer, disabled }: WorkspaceProps<'order_parts'>) {
  const t = useT()
  const [assembled, setAssembled] = useState<number[]>([])

  useEffect(() => {
    onAnswer(assembled.length > 0 ? { kind: 'parts', parts: assembled } : null)
  }, [assembled, onAnswer])

  const available = content.pieces.map((piece, index) => ({ piece, index })).filter(({ index }) => !assembled.includes(index))

  return (
    <div className="h-full space-y-5 overflow-y-auto p-5">
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.assembled')}</p>
        <div className={cn('min-h-24 rounded-lg border border-dashed p-2', assembled.length > 0 && 'border-solid bg-[#0d0d12]')}>
          {assembled.length === 0 && <p className="p-4 text-center text-xs text-muted-foreground">{t('solver.assembleHint')}</p>}
          <Reorder.Group axis="y" values={assembled} onReorder={disabled ? () => undefined : setAssembled} className="space-y-1.5">
            {assembled.map((index, position) => (
              <Reorder.Item
                key={index}
                value={index}
                dragListener={!disabled}
                className="flex cursor-grab items-center gap-2 rounded-md border bg-card px-2 py-1.5 active:cursor-grabbing"
                data-testid={`assembled-${position}`}
              >
                <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="w-5 text-right text-[11px] text-muted-foreground tabular-nums">{position + 1}</span>
                <code className="flex-1 font-mono text-[13px] whitespace-pre-wrap">{content.pieces[index]}</code>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setAssembled((a) => a.filter((i) => i !== index))}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={t('common.delete')}
                >
                  <X className="size-3.5" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{t('solver.available')}</p>
        <div className="flex flex-wrap gap-2">
          {available.map(({ piece, index }) => (
            <button
              key={index}
              type="button"
              disabled={disabled}
              onClick={() => setAssembled((a) => [...a, index])}
              className="flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 font-mono text-[13px] transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-60"
              data-testid={`piece-${index}`}
            >
              <Plus className="size-3 text-primary" />
              {piece}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
