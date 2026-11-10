import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, KeyRound, Link2, Table2 } from 'lucide-react'
import { useState } from 'react'
import type { DatasetSchema, TableInfo } from '@shared/types/engine'
import { useT } from '@/i18n'
import { cn } from '@/lib/utils'
import { ResultTable } from './result-table'

function TableCard({ table, defaultOpen, onInsert }: { table: TableInfo; defaultOpen: boolean; onInsert?: (text: string) => void }) {
  const t = useT()
  const [open, setOpen] = useState(defaultOpen)
  const [showSample, setShowSample] = useState(false)
  return (
    <div className="rounded-lg border bg-card/60">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 px-3 py-2 text-left">
        <ChevronRight className={cn('size-3.5 text-muted-foreground transition-transform', open && 'rotate-90')} />
        <Table2 className="size-3.5 text-primary" />
        <span
          className="font-mono text-[13px] font-medium"
          onDoubleClick={(e) => {
            e.stopPropagation()
            onInsert?.(table.name)
          }}
        >
          {table.name}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">{table.rowCount}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {table.description && <p className="px-3 pb-2 text-xs text-muted-foreground">{table.description}</p>}
            <ul className="border-t px-1 py-1">
              {table.columns.map((column) => (
                <li
                  key={column.name}
                  className={cn('flex items-center gap-2 rounded px-2 py-1 font-mono text-xs', onInsert && 'cursor-pointer hover:bg-accent/60')}
                  onClick={() => onInsert?.(column.name)}
                >
                  {column.primaryKey ? (
                    <KeyRound className="size-3 shrink-0 text-amber-400" />
                  ) : column.references ? (
                    <Link2 className="size-3 shrink-0 text-info" />
                  ) : (
                    <span className="size-3 shrink-0" />
                  )}
                  <span className="flex-1 truncate">{column.name}</span>
                  {column.references && <span className="truncate text-[10px] text-info/80">→ {column.references}</span>}
                  <span className="text-[10px] text-muted-foreground uppercase">{column.type || 'any'}</span>
                </li>
              ))}
            </ul>
            <div className="border-t px-3 py-1.5">
              <button type="button" onClick={() => setShowSample((s) => !s)} className="text-[11px] text-muted-foreground hover:text-primary">
                {t('solver.sample')} {showSample ? '▾' : '▸'}
              </button>
            </div>
            {showSample && (
              <div className="max-h-56 border-t">
                <ResultTable result={table.sample} className="max-h-56" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SchemaBrowser({ schema, related = [], onInsert }: { schema: DatasetSchema; related?: string[]; onInsert?: (text: string) => void }) {
  const t = useT()
  const relatedSet = new Set(related)
  const primary = schema.tables.filter((tbl) => relatedSet.has(tbl.name))
  const rest = schema.tables.filter((tbl) => !relatedSet.has(tbl.name))
  return (
    <div className="space-y-4">
      {primary.length > 0 && (
        <section className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('solver.relatedTables')}</p>
          {primary.map((table) => (
            <TableCard key={table.name} table={table} defaultOpen onInsert={onInsert} />
          ))}
        </section>
      )}
      {rest.length > 0 && (
        <section className="space-y-2">
          {primary.length > 0 && <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{t('solver.otherTables')}</p>}
          {rest.map((table) => (
            <TableCard key={table.name} table={table} defaultOpen={primary.length === 0 && schema.tables.length <= 3} onInsert={onInsert} />
          ))}
        </section>
      )}
    </div>
  )
}
