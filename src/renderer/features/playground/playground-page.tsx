import { AlertCircle, CheckCircle2, History, Play, RotateCcw, Trash2, WandSparkles, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import type { ExecutionResult } from '@shared/types/engine'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { NamedIcon } from '@/components/common/icon'
import { ResultTable } from '@/components/common/result-table'
import { SchemaBrowser } from '@/components/common/schema-browser'
import { SqlEditor, type SqlEditorHandle } from '@/components/common/sql-editor'
import { EmptyState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { useT } from '@/i18n'
import { formatDateTime, formatMs } from '@/lib/format'
import { setCompletionSchema } from '@/lib/monaco'
import { queryClient, useApi, useApiMutation } from '@/lib/query'
import { announceAchievements } from '@/lib/rewards'
import { modKey } from '@/lib/utils'

const DRAFT_KEY = 'sql-mastery:playground:'

const DEFAULT_TABLES: Record<string, string> = {
  ecommerce: 'products',
  employees: 'employees',
  university: 'students',
  banking: 'accounts',
  movies: 'movies',
  sales: 'sales'
}

function readDraft(dataset: string): string {
  return window.localStorage.getItem(DRAFT_KEY + dataset) ?? `SELECT *\nFROM ${DEFAULT_TABLES[dataset] ?? 'products'}\nLIMIT 10;`
}

function ExecutionView({ execution, databaseReset }: { execution: ExecutionResult; databaseReset: boolean }) {
  const t = useT()
  const statements = execution.statements ?? []
  const last = [...statements].reverse().find((s) => s.result)
  const affected = statements.reduce((sum, s) => sum + s.rowsAffected, 0)
  return (
    <div className="flex h-full flex-col">
      {databaseReset && <p className="border-b bg-warning/10 px-3 py-2 text-xs text-warning">{t('playground.dbWasReset')}</p>}
      {!execution.ok && (
        <div className="m-3 flex gap-2.5 rounded-lg border border-destructive/30 bg-destructive/8 p-3" data-testid="playground-error">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-destructive uppercase">{execution.error.code}</p>
            <p className="font-mono text-xs whitespace-pre-wrap">{execution.error.message}</p>
          </div>
        </div>
      )}
      {last?.result ? (
        <ResultTable result={last.result} className="min-h-0 flex-1" />
      ) : (
        execution.ok && (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <CheckCircle2 className="size-5 text-success" />
            {t('playground.statements', { n: statements.length })}
            {affected > 0 && <span>{t('solver.rowsAffected', { n: affected })}</span>}
          </div>
        )
      )}
      <div className="flex shrink-0 items-center gap-3 border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        <span>{t('playground.statements', { n: statements.length })}</span>
        {affected > 0 && <span>{t('solver.rowsAffected', { n: affected })}</span>}
        <span className="ml-auto tabular-nums">{formatMs(execution.durationMs)}</span>
      </div>
    </div>
  )
}

export function PlaygroundPage() {
  const t = useT()
  const datasets = useApi('datasets:list', undefined, { staleTime: Infinity })
  const [dataset, setDataset] = useState('ecommerce')
  const [sql, setSql] = useState(() => readDraft('ecommerce'))
  const [confirmReset, setConfirmReset] = useState(false)
  const editorRef = useRef<SqlEditorHandle | null>(null)
  const schema = useApi('datasets:schema', { dataset }, { staleTime: Infinity })
  const history = useApi('playground:history', { dataset, limit: 50 })
  const sqlRef = useRef(sql)
  sqlRef.current = sql

  useEffect(() => {
    if (schema.data) setCompletionSchema(schema.data.tables.map((tbl) => ({ name: tbl.name, columns: tbl.columns.map((c) => c.name) })))
  }, [schema.data])

  const run = useApiMutation('playground:run', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['playground:history'] })
  })
  const achievementsBefore = useRef<Set<string> | null>(null)
  const achievements = useApi('achievements:list')
  useEffect(() => {
    if (!achievements.data) return
    const unlocked = new Set(achievements.data.filter((a) => a.unlockedAt).map((a) => a.id))
    if (achievementsBefore.current) {
      const fresh = achievements.data.filter((a) => a.unlockedAt && !achievementsBefore.current!.has(a.id))
      if (fresh.length > 0) announceAchievements(fresh)
    }
    achievementsBefore.current = unlocked
  }, [achievements.data])

  const reset = useApiMutation('playground:reset', {
    onSuccess: () => {
      toast.success(t('playground.resetDone'))
      run.reset()
    }
  })
  const clearHistory = useApiMutation('playground:clearHistory', {
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['playground:history'] })
  })

  const execute = () => {
    const text = sqlRef.current.trim()
    if (!text || run.isPending) return
    run.mutate(
      { dataset, sql: text },
      { onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['achievements:list'] }) }
    )
  }

  const switchDataset = (id: string) => {
    window.localStorage.setItem(DRAFT_KEY + dataset, sqlRef.current)
    setDataset(id)
    setSql(readDraft(id))
    run.reset()
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b px-5 py-3">
        <div className="min-w-0">
          <h1 className="text-sm font-semibold">{t('playground.title')}</h1>
          <p className="truncate text-xs text-muted-foreground">{t('playground.sandboxNote')}</p>
        </div>
        <div className="ml-auto w-60">
          <Select value={dataset} onValueChange={switchDataset}>
            <SelectTrigger className="h-8 text-xs" data-testid="dataset-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {datasets.data?.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  <span className="flex items-center gap-2">
                    <NamedIcon name={d.icon} className="size-3.5 text-primary" />
                    {d.title}
                    <span className="text-muted-foreground">· {d.tableCount}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <ResizablePanelGroup direction="horizontal" autoSaveId="playground-horizontal">
          <ResizablePanel defaultSize={24} minSize={16}>
            <Tabs defaultValue="schema" className="flex h-full flex-col">
              <div className="border-b px-3 py-2">
                <TabsList className="w-full">
                  <TabsTrigger value="schema" className="flex-1">
                    {t('playground.tables')}
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1">
                    <History />
                    {t('playground.history')}
                  </TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="schema" className="min-h-0 flex-1 overflow-y-auto p-3">
                {schema.data ? <SchemaBrowser schema={schema.data} onInsert={(text) => editorRef.current?.insert(text)} /> : <Skeleton className="h-64" />}
              </TabsContent>
              <TabsContent value="history" className="min-h-0 flex-1 overflow-y-auto p-2">
                {history.data?.length === 0 && <EmptyState icon={History} title={t('playground.noHistory')} className="m-2" />}
                {history.data && history.data.length > 0 && (
                  <div className="space-y-1">
                    {history.data.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSql(item.sql)}
                        className="w-full rounded-md border bg-card/50 p-2 text-left transition-colors hover:border-primary/40"
                        title={t('playground.insert')}
                      >
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          {item.success ? <CheckCircle2 className="size-3 text-success" /> : <XCircle className="size-3 text-destructive" />}
                          {formatDateTime(item.executedAt)}
                          <span className="ml-auto tabular-nums">{item.success ? `${item.rowCount} · ${formatMs(item.durationMs)}` : ''}</span>
                        </div>
                        <code className="line-clamp-3 font-mono text-[11px] whitespace-pre-wrap text-foreground/85">{item.sql}</code>
                      </button>
                    ))}
                    <Button variant="ghost" size="xs" className="w-full" onClick={() => clearHistory.mutate(undefined)}>
                      <Trash2 />
                      {t('playground.clearHistory')}
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={76} minSize={40}>
            <ResizablePanelGroup direction="vertical" autoSaveId="playground-vertical">
              <ResizablePanel defaultSize={55} minSize={20}>
                <div className="flex h-full flex-col">
                  <div className="flex shrink-0 items-center gap-1 border-b px-2 py-1.5">
                    <Button variant="ghost" size="xs" onClick={() => editorRef.current?.format()}>
                      <WandSparkles />
                      {t('solver.format')}
                    </Button>
                    <Button variant="ghost" size="xs" onClick={() => setConfirmReset(true)} loading={reset.isPending}>
                      <RotateCcw />
                      {t('playground.resetDb')}
                    </Button>
                    <div className="flex-1" />
                    <Tooltip content={`${modKey}+Enter`}>
                      <Button size="sm" onClick={execute} loading={run.isPending} disabled={!sql.trim()} data-testid="playground-run">
                        {!run.isPending && <Play />}
                        {t('solver.run')}
                      </Button>
                    </Tooltip>
                  </div>
                  <div className="min-h-0 flex-1">
                    <SqlEditor
                      key={dataset}
                      value={sql}
                      onChange={(value) => {
                        setSql(value)
                        window.localStorage.setItem(DRAFT_KEY + dataset, value)
                      }}
                      onRun={execute}
                      handleRef={editorRef}
                    />
                  </div>
                </div>
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={45} minSize={15}>
                <div className="h-full bg-surface">
                  {run.data ? (
                    <ExecutionView execution={run.data.execution} databaseReset={run.data.databaseReset} />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Play className="size-5 opacity-50" />
                      {t('solver.runHint')}
                    </div>
                  )}
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title={t('playground.resetConfirmTitle')}
        description={t('playground.resetConfirmText')}
        destructive
        onConfirm={() => reset.mutate({ dataset })}
      />
    </div>
  )
}
