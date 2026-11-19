const DAY_MS = 86_400_000

export const PERIODS = [
  { id: '7d', label: 'Last 7 days', days: 7 },
  { id: '30d', label: 'Last 30 days', days: 30 },
  { id: '90d', label: 'Last 90 days', days: 90 },
] as const

export type PeriodId = (typeof PERIODS)[number]['id']

export type PeriodRange = {
  days: number
  /** Start of the selected period. */
  start: Date
  /** Now. */
  end: Date
  /** Start of the equally long period before `start`. */
  previousStart: Date
}

export function isPeriodId(value: string): value is PeriodId {
  return PERIODS.some((period) => period.id === value)
}

export function periodRange(id: PeriodId): PeriodRange {
  const days = PERIODS.find((period) => period.id === id)?.days ?? 30
  const end = new Date()
  const start = new Date(end.getTime() - days * DAY_MS)
  return {
    days,
    start,
    end,
    previousStart: new Date(start.getTime() - days * DAY_MS),
  }
}

/** Which half of the comparison window a timestamp falls in, if either. */
export function periodHalf(
  range: PeriodRange,
  at: string | null | undefined,
): 'current' | 'previous' | null {
  if (!at) return null
  const time = Date.parse(at)
  if (Number.isNaN(time) || time > range.end.getTime()) return null
  if (time >= range.start.getTime()) return 'current'
  if (time >= range.previousStart.getTime()) return 'previous'
  return null
}

/** Whole-number percentage change, or null when there is no baseline. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 100)
}

export function average(values: readonly number[]) {
  if (values.length === 0) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

/** One chart bucket: a label plus a number per series. */
export type ChartPoint = { label: string } & Record<string, number | string>

/**
 * Splits the selected period into chart buckets (daily for a week, six
 * buckets otherwise) and sums each series per bucket.
 */
export function bucketSeries<K extends string>(
  range: PeriodRange,
  rows: readonly { at: string; key: K; value?: number }[],
  keys: readonly K[],
): ChartPoint[] {
  const count = range.days <= 7 ? range.days : 6
  const size = (range.end.getTime() - range.start.getTime()) / count
  const format = new Intl.DateTimeFormat(
    'en-KE',
    range.days <= 7 ? { weekday: 'short' } : { day: 'numeric', month: 'short' },
  )
  const sums = Array.from({ length: count }, () => new Map<K, number>())

  for (const row of rows) {
    const offset = Date.parse(row.at) - range.start.getTime()
    if (Number.isNaN(offset) || offset < 0) continue
    const bucket = sums[Math.min(Math.floor(offset / size), count - 1)]
    bucket.set(row.key, (bucket.get(row.key) ?? 0) + (row.value ?? 1))
  }

  return sums.map((bucket, index) => {
    const point: ChartPoint = {
      label: format.format(new Date(range.start.getTime() + index * size)),
    }
    for (const key of keys) point[key] = bucket.get(key) ?? 0
    return point
  })
}

const integer = new Intl.NumberFormat('en-KE')
const compactKes = new Intl.NumberFormat('en-KE', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

export const formatNumber = (value: number) => integer.format(value)
export const formatKes = (value: number) => `KES ${compactKes.format(value)}`

export function formatRelative(at: string | null | undefined) {
  if (!at) return '—'
  const diff = Date.now() - Date.parse(at)
  if (Number.isNaN(diff)) return '—'
  const hours = Math.round(diff / 3_600_000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} h ago`
  const days = Math.round(hours / 24)
  return days === 1 ? 'Yesterday' : `${days} days ago`
}
