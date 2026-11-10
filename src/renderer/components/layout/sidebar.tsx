import { useQueryClient } from '@tanstack/react-query'
import { ChevronsUpDown, Database, Flame, LogOut, Search, User } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'
import { rankForLevel } from '@shared/constants/levels'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useT } from '@/i18n'
import { formatNumber } from '@/lib/format'
import { useApiMutation } from '@/lib/query'
import { cn, isMac, modKey } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth'
import { useCurrentUser } from '@/hooks/use-current-user'
import { NAV_ITEMS } from './nav-items'

export function Sidebar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useCurrentUser()
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useApiMutation('auth:logout', {
    onSuccess: () => {
      queryClient.clear()
      setUser(null)
      navigate('/login')
    }
  })

  if (!user) return null
  const levelSpan = user.nextLevelXp - user.currentLevelXp
  const levelPercent = levelSpan > 0 ? ((user.xp - user.currentLevelXp) / levelSpan) * 100 : 100

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r bg-sidebar">
      <div className={cn('drag-region flex h-12 items-center gap-2 px-4', isMac && 'pl-20')}>
        <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Database className="size-3.5" />
        </div>
        <span className="text-sm font-semibold tracking-tight">{t('common.appName')}</span>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={onOpenPalette}
          className="no-drag flex h-8 w-full items-center gap-2 rounded-md border bg-background/40 px-2.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <Search className="size-3.5" />
          <span className="flex-1 text-left">{t('nav.commandHint')}</span>
          <kbd className="rounded border bg-muted px-1 font-mono text-[10px]">{modKey}K</kbd>
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
        {NAV_ITEMS.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground',
                isActive && 'bg-accent text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className={cn('size-4', isActive && 'text-primary')} />
                <span className="flex-1">{t(item.label)}</span>
                <span className="font-mono text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/60">
                  {modKey}
                  {index + 1}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-3 border-t p-3">
        <div className="space-y-1.5 px-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {t('common.level')} {user.level} · {t(`ranks.${rankForLevel(user.level)}`)}
            </span>
            <span className="flex items-center gap-1">
              <Flame className={cn('size-3', user.currentStreak > 0 ? 'text-orange-400' : 'text-muted-foreground/50')} />
              {user.currentStreak}
            </span>
          </div>
          <Progress value={levelPercent} className="h-1" />
          <p className="text-[10px] text-muted-foreground/70">
            {formatNumber(user.xp)} / {formatNumber(user.nextLevelXp)} XP
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors hover:bg-accent/60 data-[state=open]:bg-accent" data-testid="user-menu">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white" style={{ background: user.avatarColor }}>
                {user.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{user.username}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{user.email}</span>
              </span>
              <ChevronsUpDown className="size-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => navigate('/profile')}>
              <User />
              {t('nav.profile')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => logout.mutate(undefined)} data-testid="logout">
              <LogOut />
              {t('nav.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
