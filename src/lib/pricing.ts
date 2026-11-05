import { BILLING_OPTIONS } from '../data/pricing'
import type {
  BillingCycle,
  BillingOption,
  Currency,
  PricingPlan,
} from '../types/pricing'

const priceFormatter = new Intl.NumberFormat('en-KE', {
  maximumFractionDigits: 2,
})

export function formatPrice(amount: number, currency: Currency): string {
  const formattedAmount = priceFormatter.format(amount || 0)

  return currency === 'kes' ? `KES ${formattedAmount}` : `$${formattedAmount}`
}

export function getBillingOption(billing: BillingCycle): BillingOption {
  return (
    BILLING_OPTIONS.find((option) => option.value === billing) ??
    BILLING_OPTIONS[0]
  )
}

export function getPlanPrice(
  plan: PricingPlan,
  billing: BillingCycle,
  currency: Currency,
): number {
  return plan[`${billing}_${currency}`] || 0
}

export function getPlanDiscount(
  plan: PricingPlan,
  billing: BillingCycle,
): number {
  if (billing === 'quarterly') {
    return plan.quarterly_discount || 0
  }

  if (billing === 'yearly') {
    return plan.yearly_discount || 0
  }

  return 0
}

export function getClassesLabel(classesPerWeek: number | null): string {
  const amount = classesPerWeek || 0

  return `${amount} ${amount === 1 ? 'class' : 'classes'} per week`
}

/** The best discount on offer for a billing cycle, and whether every plan shares it. */
export function getDiscountSummary(
  plans: PricingPlan[],
  billing: BillingCycle,
) {
  const discounts = plans
    .map((plan) => getPlanDiscount(plan, billing))
    .filter((discount) => discount > 0)

  const highestDiscount = discounts.length > 0 ? Math.max(...discounts) : 0

  return {
    highestDiscount,
    allDiscountsMatch:
      discounts.length > 0 &&
      discounts.every((discount) => discount === highestDiscount),
  }
}

/** Query string handed to the `/pay` page when a parent enrolls. */
export function buildEnrollmentParams(
  plan: PricingPlan,
  billing: BillingOption,
  currency: Currency,
): URLSearchParams {
  return new URLSearchParams({
    planId: plan.id,
    planSlug: plan.slug,
    planName: plan.name,
    planClasses: getClassesLabel(plan.classes_per_week),
    billing: billing.value,
    currency: currency.toUpperCase(),
    amount: String(getPlanPrice(plan, billing.value, currency)),
  })
}
