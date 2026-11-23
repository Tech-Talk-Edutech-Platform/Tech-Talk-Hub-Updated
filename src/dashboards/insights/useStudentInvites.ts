import { useQuery } from '@tanstack/react-query'
import {
  listMyInvites,
  studentClassroomKeys,
} from '../../lib/classroom/invites'

export function useStudentInvites(userId: string) {
  return useQuery({
    queryKey: studentClassroomKeys.invites(userId),
    queryFn: listMyInvites,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  })
}
