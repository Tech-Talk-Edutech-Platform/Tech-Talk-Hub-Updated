import type { BillingOption, Currency } from '../types/pricing'

export const CURRENCY_OPTIONS: { value: Currency; label: string }[] = [
  { value: 'kes', label: 'KES' },
  { value: 'usd', label: 'USD' },
]

export const BILLING_OPTIONS: BillingOption[] = [
  { value: 'monthly', label: 'Monthly', period: 'month', months: 1 },
  { value: 'quarterly', label: 'Quarterly', period: 'quarter', months: 3 },
  { value: 'yearly', label: 'Yearly', period: 'year', months: 12 },
]
