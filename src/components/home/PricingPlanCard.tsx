import { CheckCircle2 } from 'lucide-react'

import {
  formatPrice,
  getClassesLabel,
  getPlanDiscount,
  getPlanPrice,
} from '../../lib/pricing'
import type { BillingOption, Currency, PricingPlan } from '../../types/pricing'
import { HoverArrow } from '../ui/HoverArrow'

type PricingPlanCardProps = {
  plan: PricingPlan
  billing: BillingOption
  currency: Currency
  onEnroll: (plan: PricingPlan) => void
}

export function PricingPlanCard({
  plan,
  billing,
  currency,
  onEnroll,
}: PricingPlanCardProps) {
  const currentPrice = getPlanPrice(plan, billing.value, currency)
  const undiscountedPrice =
    getPlanPrice(plan, 'monthly', currency) * billing.months
  const discount = getPlanDiscount(plan, billing.value)
  const monthlyEquivalent = Math.round(currentPrice / billing.months)
  const features = Array.isArray(plan.features) ? plan.features : []

  return (
    <article
      className={`relative flex h-full flex-col rounded-[1.75rem] border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        plan.is_popular
          ? 'border-[#2947C7] shadow-lg shadow-blue-900/10'
          : 'border-slate-200 hover:border-purple-200'
      }`}
    >
      {plan.is_popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#FF3F7F] px-4 py-1 text-xs font-bold text-white shadow-md">
          Most Popular
        </span>
      )}

      {/* Plan details */}
      <div className="border-b border-slate-100 pb-5 text-center">
        <h3 className="text-xl font-black text-[#172554]">{plan.name}</h3>

        <p className="mt-1 text-sm font-semibold text-[#FF3F7F]">
          {getClassesLabel(plan.classes_per_week)}
        </p>

        {plan.description && (
          <p className="mt-3 min-h-[48px] text-sm leading-6 text-slate-500">
            {plan.description}
          </p>
        )}

        {/* Price */}
        <div className="mt-5">
          <p className="text-2xl font-black tracking-tight text-[#2947C7] sm:text-[1.7rem]">
            {formatPrice(currentPrice, currency)}
          </p>

          <p className="mt-1 text-sm text-slate-500">per {billing.period}</p>

          {discount > 0 && (
            <div className="mt-3 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xs text-slate-400 line-through">
                  {formatPrice(undiscountedPrice, currency)}
                </span>

                <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                  Save {discount}%
                </span>
              </div>

              <p className="text-xs text-slate-500">
                About {formatPrice(monthlyEquivalent, currency)} per month
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onEnroll(plan)}
          className={`group mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
            plan.is_popular
              ? 'bg-[#FF3F7F] text-white shadow-lg shadow-pink-500/20 hover:bg-[#E93470]'
              : 'border border-purple-200 bg-purple-50 text-[#2947C7] hover:border-[#2947C7] hover:bg-[#2947C7] hover:text-white'
          }`}
        >
          Enroll Now
          <HoverArrow />
        </button>
      </div>

      {/* Features */}
      <div className="flex flex-1 flex-col pt-5">
        <p className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
          What’s included
        </p>

        <ul className="space-y-3">
          {features.map((feature) => (
            <li
              key={feature}
              className="flex items-start gap-2.5 text-sm leading-6 text-slate-700"
            >
              <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  )
}
