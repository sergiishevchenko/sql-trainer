import * as DialogPrimitive from '@radix-ui/react-dialog'
import { CornerDownLeft, Search, User } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { StatusIcon, TypeBadge } from '@/components/common/exercise-badges'
import { useT } from '@/i18n'
import { useApi } from '@/lib/query'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from './nav-items'

interface PaletteEntry {
  key: string
  label: string
  hint?: React.ReactNode
  icon?: React.ReactNode
  action: () => void
}

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useT()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const search = query.trim()
  const exercises = useApi('exercises:list', { search, limit: 12 }, { enabled: open && search.length > 1 })

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const entries = useMemo<PaletteEntry[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      onOpenChange(false)
    }
    const pages: PaletteEntry[] = [...NAV_ITEMS, { to: '/profile', label: 'nav.profile' as const, icon: User }]
      .filter((item) => !search || t(item.label).toLowerCase().includes(search.toLowerCase()))
      .map((item) => ({ key: `nav:${item.to}`, label: t(item.label), icon: <item.icon className="size-4 text-muted-foreground" />, action: go(item.to) }))
    const found: PaletteEntry[] =
      search.length > 1
        ? (exercises.data?.items ?? []).map((ex) => ({
            key: `ex:${ex.id}`,
            label: ex.title,
            icon: <StatusIcon status={ex.status} />,
            hint: <TypeBadge type={ex.type} />,
            action: go(`/exercises/${ex.id}`)
          }))
        : []
    return [...pages, ...found]
  }, [search, exercises.data, navigate, onOpenChange, t])

  useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, entries.length - 1)))
  }, [entries.length])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % Math.max(1, entries.length))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + entries.length) % Math.max(1, entries.length))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      entries[active]?.action()
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed top-[18%] left-1/2 z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border bg-popover shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          onKeyDown={onKeyDown}
          aria-describedby={undefined}
        >
          <DialogPrimitive.Title className="sr-only">{t('nav.commandHint')}</DialogPrimitive.Title>
          <div className="flex items-center gap-2 border-b px-4">
            <Search className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setActive(0)
              }}
              placeholder={t('exercises.searchPlaceholder')}
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
            />
          </div>
          <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5">
            {entries.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted-foreground">{t('exercises.noResults')}</p>}
            {entries.map((entry, index) => (
              <button
                key={entry.key}
                data-index={index}
                onMouseMove={() => setActive(index)}
                onClick={entry.action}
                className={cn('flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm', index === active && 'bg-accent')}
              >
                {entry.icon}
                <span className="flex-1 truncate">{entry.label}</span>
                {entry.hint}
                {index === active && <CornerDownLeft className="size-3.5 text-muted-foreground" />}
              </button>
            ))}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
