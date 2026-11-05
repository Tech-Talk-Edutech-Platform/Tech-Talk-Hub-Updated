import type { PostgrestError } from '@supabase/supabase-js'

import type { PricingPlan } from '../../types/pricing'
import { getSupabase } from '../supabase'

/** Active pricing plans in display order. Throws so the UI can show the error. */
export async function fetchPricingPlans(): Promise<PricingPlan[]> {
  const { data, error } = await getSupabase()
    .from('pricing_plans')
    .select(
      `
        id,
        name,
        slug,
        description,
        classes_per_week,
        session_duration_minutes,
        monthly_kes,
        monthly_usd,
        quarterly_kes,
        quarterly_usd,
        quarterly_discount,
        yearly_kes,
        yearly_usd,
        yearly_discount,
        features,
        is_popular,
        is_active,
        display_order
      `,
    )
    .eq('is_active', true)
    .order('display_order', { ascending: true })
    .overrideTypes<PricingPlan[], { merge: false }>()

  if (error) {
    logPricingError(error)
    throw error
  }

  return data
}

function logPricingError(error: PostgrestError) {
  console.error('Pricing plans error:', {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  })
}
