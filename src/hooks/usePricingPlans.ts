import { fetchPricingPlans } from '../lib/api/pricing'
import { useAsyncData } from './useAsyncData'

export function usePricingPlans() {
  return useAsyncData(fetchPricingPlans)
}
