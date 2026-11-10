import { BookOpen, Database, FileText, Lightbulb, NotebookPen } from 'lucide-react'
import { useState } from 'react'
import type { DatasetSchema } from '@shared/types/engine'
import type { PublicExercise } from '@shared/types/exercise'
import { Markdown } from '@/components/common/markdown'
import { SchemaBrowser } from '@/components/common/schema-browser'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDebouncedCallback } from '@/hooks/use-debounced-callback'
import { useT } from '@/i18n'
import { invoke } from '@/lib/query'
import { SQL_TYPES } from './types'

export function LeftPanel({ exercise, schema, testMode }: { exercise: PublicExercise; schema: DatasetSchema | undefined; testMode: boolean }) {
  const t = useT()
  const [tab, setTab] = useState('task')
  const [hintsShown, setHintsShown] = useState(0)
  const [note, setNote] = useState(exercise.note)
  const saveNote = useDebouncedCallback((content: string) => {
    void invoke('exercises:saveNote', { exerciseId: exercise.id, content }).catch(() => undefined)
  }, 600)
  const content = exercise.content
  const isSql = SQL_TYPES.includes(exercise.type)

  return (
    <Tabs value={tab} onValueChange={setTab} className="flex h-full flex-col">
      <div className="shrink-0 border-b px-3 py-2">
        <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none]">
          <TabsTrigger value="task">
            <FileText />
            {t('solver.task')}
          </TabsTrigger>
          {!testMode && exercise.theory && (
            <TabsTrigger value="theory">
              <BookOpen />
              {t('solver.theory')}
            </TabsTrigger>
          )}
          {!testMode && (
            <TabsTrigger value="hints" data-testid="hints-tab">
              <Lightbulb />
              {t('solver.hints')}
            </TabsTrigger>
          )}
          <TabsTrigger value="schema">
            <Database />
            {t('solver.schema')}
          </TabsTrigger>
          {!testMode && (
            <TabsTrigger value="notes">
              <NotebookPen />
              {t('solver.notes')}
            </TabsTrigger>
          )}
        </TabsList>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TabsContent value="task" className="space-y-4 p-5">
          <Markdown>{exercise.description}</Markdown>
          <div className="flex flex-wrap gap-1.5 border-t pt-4">
            <Badge variant="outline">
              <Database />
              {schema?.title ?? exercise.dataset}
            </Badge>
            {exercise.hiddenTestCount > 0 && <Badge variant="outline">{t('solver.hiddenTests', { n: exercise.hiddenTestCount })}</Badge>}
            {content.type !== 'predict_result' && content.type !== 'explain_query' && 'orderMatters' in content && (
              <Badge variant="outline">{content.orderMatters ? t('solver.orderMatters') : t('solver.orderFree')}</Badge>
            )}
            {isSql && 'allow' in content && content.allow.length > 1 && (
              <Badge variant="info">{t('solver.allowedStatements', { list: content.allow.map((k) => k.toUpperCase()).join(', ') })}</Badge>
            )}
          </div>
        </TabsContent>
        <TabsContent value="theory" className="p-5">
          <Markdown>{exercise.theory}</Markdown>
        </TabsContent>
        <TabsContent value="hints" className="space-y-3 p-5">
          {exercise.hints.slice(0, hintsShown).map((hint, i) => (
            <div key={i} className="rounded-lg border border-amber-400/20 bg-amber-400/5 p-3" data-testid={`hint-${i}`}>
              <p className="mb-1 text-[11px] font-medium text-amber-300">{t('solver.hint', { n: i + 1 })}</p>
              <Markdown className="text-[13px]">{hint}</Markdown>
            </div>
          ))}
          {hintsShown < exercise.hints.length ? (
            <Button variant="outline" size="sm" onClick={() => setHintsShown((n) => n + 1)} data-testid="show-hint">
              <Lightbulb />
              {t('solver.showHint')} ({hintsShown + 1}/{exercise.hints.length})
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">{t('solver.noMoreHints')}</p>
          )}
        </TabsContent>
        <TabsContent value="schema" className="p-4">
          {schema ? <SchemaBrowser schema={schema} related={exercise.relatedTables} /> : <Skeleton className="h-40" />}
        </TabsContent>
        <TabsContent value="notes" className="p-5">
          <Textarea
            value={note}
            onChange={(e) => {
              setNote(e.target.value)
              saveNote(e.target.value)
            }}
            placeholder={t('solver.notePlaceholder')}
            className="min-h-64 font-mono text-[13px]"
            maxLength={10000}
          />
        </TabsContent>
      </div>
    </Tabs>
  )
}
