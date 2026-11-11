import { useQuery } from '@tanstack/react-query'
import { loadClassroom } from '../../lib/classroom/repository'

export const classroomQueryKey = (roomCode: string) =>
  ['classroom', roomCode] as const

/**
 * The room's session, students, lesson material and badges. Loaded once per
 * room code; the page keeps what happens in class in its own state.
 */
export function useClassroomData(roomCode: string) {
  return useQuery({
    queryKey: classroomQueryKey(roomCode),
    queryFn: () => loadClassroom(roomCode),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
  })
}
