import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'text-primary',
  children
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  accent?: string
  children?: ReactNode
}) {
  return (
    <Card className="relative overflow-hidden p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn('size-4', accent)} />
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}
