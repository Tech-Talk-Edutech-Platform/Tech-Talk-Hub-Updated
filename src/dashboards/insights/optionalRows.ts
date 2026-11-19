type RowsResult<T> = { data: T[] | null; error: { message: string } | null }

/**
 * Rows for a panel that can be left empty. A permission or network error in
 * one secondary query should not blank the whole dashboard, so it is logged
 * and treated as no rows.
 */
export async function optionalRows<T>(
  label: string,
  query: PromiseLike<RowsResult<T>>,
): Promise<T[]> {
  const { data, error } = await query
  if (error) {
    console.warn(`Dashboard ${label} unavailable:`, error.message)
    return []
  }
  return data ?? []
}
