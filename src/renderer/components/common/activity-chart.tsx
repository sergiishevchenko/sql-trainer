import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { DayActivity } from '@shared/types/learning'
import { useT } from '@/i18n'
import { formatDayLabel } from '@/lib/format'

const PRIMARY = 'oklch(0.64 0.2 286)'
const SUCCESS = 'oklch(0.72 0.16 155)'

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) {
  if (!active || !payload?.length || !label) return null
  return (
    <div className="rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
      <p className="mb-1 font-medium">{formatDayLabel(label)}</p>
      {payload.map((p) => (
        <p key={p.name} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="text-foreground tabular-nums">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function ActivityChart({ data, height = 200, variant = 'area' }: { data: DayActivity[]; height?: number; variant?: 'area' | 'bar' }) {
  const t = useT()
  const rows = data.map((d) => ({ ...d, wrong: Math.max(0, d.attempts - d.correct) }))
  const axis = {
    stroke: 'oklch(1 0 0 / 30%)',
    fontSize: 10,
    tickLine: false,
    axisLine: false
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      {variant === 'area' ? (
        <AreaChart data={rows} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <defs>
            <linearGradient id="xpFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.45} />
              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
          <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'oklch(1 0 0 / 15%)' }} />
          <Area type="monotone" dataKey="xp" name={t('dashboard.activityXp')} stroke={PRIMARY} strokeWidth={2} fill="url(#xpFill)" />
        </AreaChart>
      ) : (
        <BarChart data={rows} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="oklch(1 0 0 / 5%)" />
          <XAxis dataKey="date" tickFormatter={formatDayLabel} minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'oklch(1 0 0 / 4%)' }} />
          <Bar dataKey="correct" name={t('analytics.correct')} stackId="a" fill={SUCCESS} radius={[0, 0, 0, 0]} />
          <Bar dataKey="wrong" name={t('analytics.wrong')} stackId="a" fill="oklch(0.64 0.21 22 / 70%)" radius={[3, 3, 0, 0]} />
        </BarChart>
      )}
    </ResponsiveContainer>
  )
}
