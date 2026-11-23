type RowsResult<T> = { data: T[] | null; error: { message: string } | null }

/** A report section can fail independently when its caller tracks availability. */
export async function optionalRows<T>(
  label: string,
  query: PromiseLike<RowsResult<T>>,
  onUnavailable?: () => void,
): Promise<T[]> {
  const { data, error } = await query
  if (error) {
    if (!onUnavailable)
      throw new Error(`Dashboard ${label} unavailable: ${error.message}`)
    onUnavailable()
  }
  return data ?? []
}
