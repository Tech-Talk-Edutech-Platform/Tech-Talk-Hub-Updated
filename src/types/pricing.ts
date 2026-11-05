export type Currency = 'kes' | 'usd'

export type BillingCycle = 'monthly' | 'quarterly' | 'yearly'

export type BillingOption = {
  value: BillingCycle
  label: string
  period: string
  months: number
}

/** Price columns on `pricing_plans`, e.g. `monthly_kes`, `yearly_usd`. */
export type PlanPriceColumn = `${BillingCycle}_${Currency}`

/** A row from the Supabase `pricing_plans` table. */
export type PricingPlan = Record<PlanPriceColumn, number | null> & {
  id: string
  name: string
  slug: string
  description: string | null
  classes_per_week: number | null
  session_duration_minutes: number | null
  quarterly_discount: number | null
  yearly_discount: number | null
  features: string[] | null
  is_popular: boolean
  is_active: boolean
  display_order: number | null
}
