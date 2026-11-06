import { QueryClient } from '@tanstack/react-query'

// App-wide defaults. Resources override staleTime where their data changes
// more or less often (e.g. course/topic lists are long-lived).
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      // Admin/tutor screens stay open in background tabs; refetching every
      // query on each tab switch would multiply Supabase requests.
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const queryKeys = {
  courses: {
    all: ['courses'] as const,
  },
  topics: {
    all: ['topics'] as const,
    byCourse: (courseId: string) => ['topics', 'course', courseId] as const,
  },
  notes: {
    all: ['notes'] as const,
    byTopic: (topicId: string) => ['notes', 'topic', topicId] as const,
  },
}
