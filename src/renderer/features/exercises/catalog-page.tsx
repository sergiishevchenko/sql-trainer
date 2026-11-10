import { keepPreviousData } from '@tanstack/react-query'
import { FilterX, Search, SearchX, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { DIFFICULTIES, EXERCISE_TYPES, LEVEL_IDS, PROGRESS_STATUSES } from '@shared/constants/domain'
import { ExerciseRow } from '@/components/common/exercise-row'
import { Page, PageHeader } from '@/components/common/page'
import { EmptyState, ErrorState } from '@/components/common/states'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { useT } from '@/i18n'
import { useApi } from '@/lib/query'
import { isFiltered, useCatalogFilters, XP_RANGES, type CatalogSort, type XpRange } from '@/stores/catalog-filters'

const ALL = '__all'
const PAGE_SIZE = 50

function FilterSelect({ label, value, onChange, options, testId }: { label: string; value: string | undefined; onChange: (v: string | undefined) => void; options: { value: string; label: string }[]; testId?: string }) {
  const t = useT()
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
        <SelectTrigger className="h-8 text-xs" data-testid={testId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('common.all')}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function CatalogPage() {
  const t = useT()
  const { filters, set, reset } = useCatalogFilters()
  const [search, setSearch] = useState(filters.search)
  const [limit, setLimit] = useState(PAGE_SIZE)
  const facets = useApi('exercises:facets', undefined, { staleTime: 60_000 })

  useEffect(() => {
    const timer = window.setTimeout(() => set({ search }), 250)
    return () => window.clearTimeout(timer)
  }, [search, set])

  useEffect(() => setLimit(PAGE_SIZE), [filters])

  const xp = XP_RANGES[filters.xp]
  const list = useApi(
    'exercises:list',
    {
      search: filters.search || undefined,
      level: filters.level,
      moduleId: filters.moduleId,
      type: filters.type,
      difficulty: filters.difficulty,
      status: filters.status,
      favoritesOnly: filters.favoritesOnly || undefined,
      xpMin: xp.min,
      xpMax: xp.max,
      minutesMax: filters.minutesMax,
      sort: filters.sort,
      limit
    },
    { placeholderData: keepPreviousData }
  )

  const modules = (facets.data?.modules ?? []).filter((m) => !filters.level || m.level === filters.level)

  return (
    <Page wide>
      <PageHeader title={t('exercises.title')} subtitle={facets.data ? t('exercises.subtitle', { n: facets.data.total }) : ' '} />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <Card className="h-fit space-y-4 p-4">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('exercises.searchPlaceholder')}
              className="h-8 pl-8 text-xs"
              data-testid="catalog-search"
            />
          </div>
          <FilterSelect
            label={t('exercises.level')}
            value={filters.level}
            onChange={(v) => set({ level: v as typeof filters.level, moduleId: undefined })}
            options={LEVEL_IDS.map((id) => ({ value: id, label: `${t(`levels.${id}`)} (${facets.data?.byLevel[id] ?? 0})` }))}
          />
          <FilterSelect label={t('exercises.module')} value={filters.moduleId} onChange={(v) => set({ moduleId: v })} options={modules.map((m) => ({ value: m.id, label: `${m.title} (${m.count})` }))} />
          <FilterSelect
            label={t('exercises.type')}
            value={filters.type}
            onChange={(v) => set({ type: v as typeof filters.type })}
            options={EXERCISE_TYPES.map((type) => ({ value: type, label: `${t(`exercises.types.${type}`)} (${facets.data?.byType[type] ?? 0})` }))}
            testId="filter-type"
          />
          <FilterSelect
            label={t('exercises.difficulty')}
            value={filters.difficulty}
            onChange={(v) => set({ difficulty: v as typeof filters.difficulty })}
            options={DIFFICULTIES.map((d) => ({ value: d, label: `${t(`exercises.difficulties.${d}`)} (${facets.data?.byDifficulty[d] ?? 0})` }))}
          />
          <FilterSelect
            label={t('exercises.status')}
            value={filters.status}
            onChange={(v) => set({ status: v as typeof filters.status })}
            options={PROGRESS_STATUSES.map((s) => ({ value: s, label: t(`exercises.statuses.${s}`) }))}
          />
          <FilterSelect
            label={t('exercises.xp')}
            value={filters.xp === 'any' ? undefined : filters.xp}
            onChange={(v) => set({ xp: (v ?? 'any') as XpRange })}
            options={(Object.keys(XP_RANGES) as XpRange[]).filter((k) => k !== 'any').map((k) => ({ value: k, label: XP_RANGES[k].label }))}
          />
          <FilterSelect
            label={t('exercises.minutes')}
            value={filters.minutesMax ? String(filters.minutesMax) : undefined}
            onChange={(v) => set({ minutesMax: v ? Number(v) : undefined })}
            options={[2, 5, 10, 15].map((n) => ({ value: String(n), label: t('exercises.upTo', { n }) }))}
          />
          <label className="flex cursor-pointer items-center justify-between gap-2 text-xs">
            <span className="flex items-center gap-1.5">
              <Star className="size-3.5 text-amber-400" />
              {t('exercises.favoritesOnly')}
            </span>
            <Switch checked={filters.favoritesOnly} onCheckedChange={(v) => set({ favoritesOnly: v })} />
          </label>
          {isFiltered(filters) && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => {
                reset()
                setSearch('')
              }}
            >
              <FilterX />
              {t('exercises.resetFilters')}
            </Button>
          )}
        </Card>

        <div className="min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground" data-testid="catalog-count">
              {list.data ? t('exercises.found', { n: list.data.total }) : ' '}
            </p>
            <Select value={filters.sort} onValueChange={(v) => set({ sort: v as CatalogSort })}>
              <SelectTrigger className="h-8 w-48 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="order">{t('exercises.sortOrder')}</SelectItem>
                <SelectItem value="xp_desc">{t('exercises.sortXpDesc')}</SelectItem>
                <SelectItem value="xp_asc">{t('exercises.sortXpAsc')}</SelectItem>
                <SelectItem value="difficulty">{t('exercises.sortDifficulty')}</SelectItem>
                <SelectItem value="minutes">{t('exercises.sortMinutes')}</SelectItem>
                <SelectItem value="title">{t('exercises.sortTitle')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {list.isPending && (
            <Card className="space-y-2 p-3">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </Card>
          )}
          {list.isError && <ErrorState error={list.error} onRetry={() => list.refetch()} />}
          {list.data && list.data.items.length === 0 && <EmptyState icon={SearchX} title={t('exercises.noResults')} description={t('exercises.noResultsHint')} />}
          {list.data && list.data.items.length > 0 && (
            <Card className="divide-y divide-border/50 p-1.5">
              {list.data.items.map((exercise) => (
                <ExerciseRow key={exercise.id} exercise={exercise} />
              ))}
            </Card>
          )}
          {list.data && list.data.items.length < list.data.total && (
            <Button variant="outline" className="w-full" onClick={() => setLimit((l) => Math.min(600, l + PAGE_SIZE))} loading={list.isFetching}>
              {t('exercises.loadMore')} ({list.data.items.length}/{list.data.total})
            </Button>
          )}
        </div>
      </div>
    </Page>
  )
}
