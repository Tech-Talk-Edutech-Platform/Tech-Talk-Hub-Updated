import { QueryClient } from '@tanstack/react-query'
import { isWorthRetrying } from './loadErrors'

// App-wide defaults. Resources override staleTime where their data changes
// more or less often (e.g. course/topic lists are long-lived).
export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // One retry for blips; none for a 404 or a refusal, which a retry
        // can't fix (the error card says what's wrong straight away).
        retry: (failures, error) => failures < 1 && isWorthRetrying(error),
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
  classAlerts: {
    all: ['class-alerts'] as const,
    inbox: (includeResolved: boolean) =>
      ['class-alerts', 'inbox', includeResolved] as const,
  },
  dashboard: {
    admin: (period: string) => ['dashboard', 'admin', period] as const,
    tutor: (tutorId: string, period: string) =>
      ['dashboard', 'tutor', tutorId, period] as const,
    student: (studentId: string) =>
      ['dashboard', 'student', studentId] as const,
    /** The signed-in person's own name and avatar (Settings, home banners). */
    myProfile: (userId: string) => ['dashboard', 'my-profile', userId] as const,
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
    tutorTrials: (tutorId: string) =>
      ['schedule', 'tutor-trials', tutorId] as const,
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
