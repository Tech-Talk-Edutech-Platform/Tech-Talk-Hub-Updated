import { fetchTeamMembers } from '../lib/api/about'
import { useAsyncData } from './useAsyncData'

export function useTeamMembers() {
  return useAsyncData(fetchTeamMembers)
}
