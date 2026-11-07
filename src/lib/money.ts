const formatters = new Map<string, Intl.NumberFormat>()

/** Whole-unit currency amount, e.g. `Ksh 1,500` for KES in the en-KE locale. */
export function formatMoney(
  value: number | null | undefined,
  currency: string | null = 'KES',
): string {
  const code = currency || 'KES'
  let formatter = formatters.get(code)

  if (!formatter) {
    formatter = new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: code,
      maximumFractionDigits: 0,
    })
    formatters.set(code, formatter)
  }

  return formatter.format(value || 0)
}
