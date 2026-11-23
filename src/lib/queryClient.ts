import { QueryClient } from '@tanstack/react-query'

// App-wide defaults. Resources override staleTime where their data changes
// more or less often (e.g. course/topic lists are long-lived).
export const createQueryClient = () =>
  new QueryClient({
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
  dashboard: {
    admin: (period: string) => ['dashboard', 'admin', period] as const,
    tutor: (tutorId: string, period: string) =>
      ['dashboard', 'tutor', tutorId, period] as const,
    student: (studentId: string) =>
      ['dashboard', 'student', studentId] as const,
  },
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
  schedule: {
    global: ['schedule', 'global'] as const,
    calendar: (userId: string | null, role: string | null) =>
      ['schedule', 'calendar', userId, role] as const,
  },
  training: {
    course: ['training', 'course'] as const,
    progress: (tutorId: string) => ['training', 'progress', tutorId] as const,
    allProgress: ['training', 'progress', 'all'] as const,
    signedUrls: (paths: readonly string[]) =>
      ['training', 'signed-urls', ...paths] as const,
  },
  site: {
    program: (slug: string) => ['site', 'program', slug] as const,
    products: (program?: string) =>
      ['site', 'products', program ?? 'all'] as const,
    product: (slug: string) => ['site', 'product', slug] as const,
    productsByIds: (ids: string[]) =>
      ['site', 'products-by-id', ...ids] as const,
    blogPosts: (category: string) => ['site', 'blog', category] as const,
    blogPost: (slug: string) => ['site', 'blog-post', slug] as const,
    relatedPosts: (postId: string) => ['site', 'blog-related', postId] as const,
  },
}
