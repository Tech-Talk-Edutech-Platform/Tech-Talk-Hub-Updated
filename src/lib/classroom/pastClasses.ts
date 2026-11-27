/**
 * Past classes cover three calendar months: this month and the two before
 * it (on 27 Nov that's 1 Sep onwards), shown grouped by month.
 */
export const PAST_CLASS_MONTHS = 3

/** Midnight on the 1st of the oldest month still shown. */
export function pastWindowStart(now: number) {
  const today = new Date(now)
  return new Date(
    today.getFullYear(),
    today.getMonth() - (PAST_CLASS_MONTHS - 1),
    1,
  )
}

export function inPastWindow(iso: string | null | undefined, now: number) {
  if (!iso) return false
  const time = Date.parse(iso)
  return !Number.isNaN(time) && time >= pastWindowStart(now).getTime()
}

export type MonthGroup<T> = { key: string; label: string; items: T[] }

/** Newest month first; items keep their order within a month. */
export function groupByMonth<T>(
  items: readonly T[],
  dateOf: (item: T) => string | null | undefined,
): MonthGroup<T>[] {
  const groups = new Map<string, MonthGroup<T>>()
  for (const item of items) {
    const iso = dateOf(item)
    if (!iso) continue
    const date = new Date(iso)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    let group = groups.get(key)
    if (!group) {
      group = {
        key,
        label: date.toLocaleDateString(undefined, {
          month: 'long',
          year: 'numeric',
        }),
        items: [],
      }
      groups.set(key, group)
    }
    group.items.push(item)
  }
  return [...groups.values()].toSorted((a, b) => b.key.localeCompare(a.key))
}
