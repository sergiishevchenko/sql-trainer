import type { SqlCell } from '@shared/types/engine'

export function formatNumber(value: number, digits = 0): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value)
}

export function formatPercent(ratio: number, digits = 0): string {
  return `${formatNumber(ratio * 100, digits)}%`
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  if (h > 0) return `${h} ч ${m} мин`
  if (m > 0) return `${m} мин`
  return `${s} с`
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} мс`
  const seconds = ms / 1000
  if (seconds < 60) return `${formatNumber(seconds, 1)} с`
  return formatDuration(seconds)
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(timestamp)
}

export function formatDateTime(timestamp: number): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  }).format(timestamp)
}

export function formatDayLabel(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, d))
}

export function formatCell(cell: SqlCell): string {
  if (cell === null) return 'NULL'
  if (typeof cell === 'number') return Number.isInteger(cell) ? String(cell) : String(Math.round(cell * 1e6) / 1e6)
  return cell
}

export function pluralize(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
