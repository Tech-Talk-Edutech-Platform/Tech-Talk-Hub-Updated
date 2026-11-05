import { fetchCurriculumLevels } from '../lib/api/curriculum'
import { useAsyncData } from './useAsyncData'

export function useCurriculumLevels() {
  return useAsyncData(fetchCurriculumLevels)
}
