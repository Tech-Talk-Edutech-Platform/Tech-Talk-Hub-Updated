import { fetchTestimonials } from '../lib/api/testimonials'
import { useAsyncData } from './useAsyncData'

export function useTestimonials() {
  return useAsyncData(fetchTestimonials)
}
