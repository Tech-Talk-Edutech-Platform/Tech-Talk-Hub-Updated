import { fetchAboutSections } from '../lib/api/about'
import { useAsyncData } from './useAsyncData'

export function useAboutSections() {
  return useAsyncData(fetchAboutSections)
}
