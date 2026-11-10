import type { ResultSet } from '@shared/types/engine'
import { useT } from '@/i18n'
import { formatCell } from '@/lib/format'
import { cn } from '@/lib/utils'

export function ResultTable({ result, className, highlightRow }: { result: ResultSet; className?: string; highlightRow?: number }) {
  const t = useT()
  if (result.columns.length === 0) {
    return <p className="p-4 text-xs text-muted-foreground">{t('solver.noRows')}</p>
  }
  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full border-separate border-spacing-0 font-mono text-xs" data-testid="result-table">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              <th className="w-10 border-b px-2 py-1.5 text-right font-normal text-muted-foreground/60">#</th>
              {result.columns.map((column, i) => (
                <th key={`${column}-${i}`} className="border-b px-3 py-1.5 text-left font-medium whitespace-nowrap text-muted-foreground">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row, r) => (
              <tr key={r} className={cn('hover:bg-accent/40', highlightRow === r && 'bg-destructive/10')}>
                <td className="border-b border-border/50 px-2 py-1 text-right text-muted-foreground/50">{r + 1}</td>
                {row.map((cell, c) => (
                  <td
                    key={c}
                    className={cn(
                      'max-w-[360px] truncate border-b border-border/50 px-3 py-1 whitespace-nowrap',
                      cell === null && 'text-muted-foreground/60 italic',
                      typeof cell === 'number' && 'text-amber-300/90 tabular-nums'
                    )}
                    title={formatCell(cell)}
                  >
                    {formatCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {result.rows.length === 0 && <p className="p-4 text-xs text-muted-foreground">{t('solver.noRows')}</p>}
      </div>
      <div className="flex shrink-0 items-center justify-between border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{t('solver.rows', { n: result.rows.length })}</span>
        {result.truncated && <span className="text-warning">{t('solver.truncated', { n: result.rows.length })}</span>}
      </div>
    </div>
  )
}
