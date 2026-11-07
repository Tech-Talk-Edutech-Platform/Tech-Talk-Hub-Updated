import { useQuery } from '@tanstack/react-query'

import { fetchPublicProgram } from '../lib/api/programs'
import { queryKeys } from '../lib/queryClient'

export function usePublicProgram(slug: string) {
  return useQuery({
    queryKey: queryKeys.site.program(slug),
    queryFn: () => fetchPublicProgram(slug),
  })
}
