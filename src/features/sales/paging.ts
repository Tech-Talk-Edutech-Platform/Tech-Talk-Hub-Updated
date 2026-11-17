/**
 * One page of a long list. `page` is clamped, so a list that shrinks (a live
 * update, a new filter) never lands past its last page.
 */
export function pageOf<T>(rows: readonly T[], page: number, pageSize: number) {
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(Math.max(0, page), pageCount - 1)
  return {
    page: current,
    pageCount,
    items: rows.slice(current * pageSize, (current + 1) * pageSize),
  }
}
