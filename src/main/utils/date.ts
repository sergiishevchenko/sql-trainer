export function localDate(timestamp: number = Date.now()): string {
  const d = new Date(timestamp)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const next = new Date(y, m - 1, d + days, 12)
  return localDate(next.getTime())
}

export function lastNDates(n: number, today: string): string[] {
  return Array.from({ length: n }, (_, i) => addDays(today, i - n + 1))
}
