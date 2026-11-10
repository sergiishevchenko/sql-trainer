import { Award, BarChart3, Dumbbell, LayoutDashboard, ListChecks, Map, SquareTerminal, type LucideIcon } from 'lucide-react'
import type { TranslationKey } from '@/i18n'

export interface NavItem {
  to: string
  label: TranslationKey
  icon: LucideIcon
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/learn', label: 'nav.learn', icon: Map },
  { to: '/exercises', label: 'nav.exercises', icon: ListChecks },
  { to: '/practice', label: 'nav.practice', icon: Dumbbell },
  { to: '/playground', label: 'nav.playground', icon: SquareTerminal },
  { to: '/analytics', label: 'nav.analytics', icon: BarChart3 },
  { to: '/achievements', label: 'nav.achievements', icon: Award }
]
