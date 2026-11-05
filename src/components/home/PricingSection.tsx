import { ShieldCheck, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { BILLING_OPTIONS, CURRENCY_OPTIONS } from '../../data/pricing'
import { usePricingPlans } from '../../hooks/usePricingPlans'
import { getErrorMessage } from '../../lib/getErrorMessage'
import {
  buildEnrollmentParams,
  getBillingOption,
  getDiscountSummary,
} from '../../lib/pricing'
import type { BillingCycle, Currency, PricingPlan } from '../../types/pricing'
import { HoverArrow } from '../ui/HoverArrow'
import { SegmentedControl } from '../ui/SegmentedControl'
import { PricingPlanCard } from './PricingPlanCard'
import { PricingStatus } from './PricingStatus'

export function PricingSection() {
  const [currency, setCurrency] = useState<Currency>('kes')
  const [billing, setBilling] = useState<BillingCycle>('monthly')
  const plansState = usePricingPlans()
  const navigate = useNavigate()

  const selectedBilling = getBillingOption(billing)
  const plans = plansState.status === 'success' ? plansState.data : []
  const hasPlans = plans.length > 0
  const { highestDiscount, allDiscountsMatch } = getDiscountSummary(
    plans,
    billing,
  )

  function handleEnroll(plan: PricingPlan) {
    const params = buildEnrollmentParams(plan, selectedBilling, currency)
    void navigate(`/pay?${params.toString()}`)
  }

  return (
    <section className="relative scroll-mt-24 bg-background px-4 pb-14 pt-12 font-poppins sm:px-6 sm:pb-16 sm:pt-16">
      <div className="mx-auto max-w-7xl">
        {/* Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[#2947C7] shadow-sm">
            <Sparkles className="h-4 w-4 text-[#FF3F7F]" />
            Flexible Learning Plans
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-tight text-[#172554] sm:text-4xl lg:text-5xl">
            Choose how your child{' '}
            <span className="text-[#FF3F7F]">learns best.</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Live, personalized coding classes with flexible schedules and
            practical learning at every stage.
          </p>
        </div>

        {/* Pricing controls */}
        <div className="mb-10 mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <SegmentedControl
            options={CURRENCY_OPTIONS}
            value={currency}
            onChange={setCurrency}
            buttonClassName="px-4 text-sm"
            activeClassName="bg-[#2947C7] text-white"
          />

          <SegmentedControl
            options={BILLING_OPTIONS}
            value={billing}
            onChange={setBilling}
            className="max-w-full"
            buttonClassName="px-3 text-xs sm:px-4 sm:text-sm"
            activeClassName="bg-[#FF3F7F] text-white"
          />
        </div>

        {plansState.status === 'success' && highestDiscount > 0 && (
          <p className="mb-8 text-center text-sm font-semibold text-[#2947C7]">
            {allDiscountsMatch
              ? `Save ${highestDiscount}%`
              : `Save up to ${highestDiscount}%`}{' '}
            with {selectedBilling.label.toLowerCase()} billing.
          </p>
        )}

        {plansState.status === 'loading' && <PricingStatus status="loading" />}

        {plansState.status === 'error' && (
          <PricingStatus
            status="error"
            message={getErrorMessage(
              plansState.error,
              'Pricing plans are temporarily unavailable.',
            )}
          />
        )}

        {plansState.status === 'success' && !hasPlans && (
          <PricingStatus status="empty" />
        )}

        {hasPlans && (
          <>
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <PricingPlanCard
                  key={plan.id}
                  plan={plan}
                  billing={selectedBilling}
                  currency={currency}
                  onEnroll={handleEnroll}
                />
              ))}
            </div>

            {/* Free trial */}
            <div className="mt-10 rounded-2xl border border-purple-100 bg-white px-6 py-6 text-center shadow-sm">
              <p className="flex items-center justify-center gap-2 text-sm text-slate-600">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#2947C7]" />
                Not ready to enroll? Let your child try a class first.
              </p>

              <Link
                to="/book-class"
                className="group mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#FF3F7F] transition hover:text-[#E93470]"
              >
                Book a Free Trial
                <HoverArrow />
              </Link>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
