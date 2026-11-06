import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '../../lib/queryClient'
import * as api from './api'

// Course and topic lists change rarely and only through admin actions that
// invalidate them explicitly below.
const CATALOG_STALE_TIME = 5 * 60_000

export function useCourses() {
  return useQuery({
    queryKey: queryKeys.courses.all,
    queryFn: ({ signal }) => api.fetchCourses(signal),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useTopics(courseId: string) {
  return useQuery({
    queryKey: queryKeys.topics.byCourse(courseId),
    queryFn: ({ signal }) => api.fetchTopicsByCourse(courseId, signal),
    enabled: Boolean(courseId),
    staleTime: CATALOG_STALE_TIME,
  })
}

export function useNotes(topicId: string) {
  return useQuery({
    queryKey: queryKeys.notes.byTopic(topicId),
    queryFn: ({ signal }) => api.fetchNotesByTopic(topicId, signal),
    enabled: Boolean(topicId),
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createCourse,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  })
}

export function useCreateTopic() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createTopic,
    onSuccess: (_data, { courseId }) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.topics.byCourse(courseId),
      }),
  })
}

export function useCreateNote() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createNote,
    onSuccess: (_data, note) =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.notes.byTopic(note.topic_id),
      }),
  })
}

export function useDeleteNote(topicId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.deleteNote,
    onSuccess: (_data, id) =>
      queryClient.setQueryData<api.NoteSummary[]>(
        queryKeys.notes.byTopic(topicId),
        (notes) => notes?.filter((note) => note.id !== id),
      ),
  })
}
