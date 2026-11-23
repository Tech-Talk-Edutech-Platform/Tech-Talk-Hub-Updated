import { useEffect, useRef, useState, type ReactNode } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { createQueryClient } from '../lib/queryClient'
import type { DashboardIdentity } from '../types/dashboardIdentity'
import { isAppRole } from '../types/roles'
import { Button } from '../components/ui/Button'
import DashboardLayout from './DashboardLayout'

async function loadDashboardIdentity(
  expectedUserId: string,
  signal: AbortSignal,
): Promise<DashboardIdentity | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (error) throw error
  if (!user || user.id !== expectedUserId) return null

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, assigned_course_id, assigned_tutor_id, full_name, email')
    .eq('id', user.id)
    .abortSignal(signal)
    .maybeSingle()
  if (profileError) throw profileError
  if (!isAppRole(profile?.role)) return null
  return { ...user, ...profile, role: profile.role }
}

function DashboardWorkspace({ user }: { user: DashboardIdentity }) {
  const [client] = useState(createQueryClient)
  const active = useRef(false)

  useEffect(() => {
    active.current = true
    return () => {
      active.current = false
      queueMicrotask(() => {
        // React can replay effects in place while developing.
        if (active.current) return
        void client.cancelQueries()
        client.clear()
      })
    }
  }, [client])

  return (
    <QueryClientProvider client={client}>
      <DashboardLayout user={user} />
    </QueryClientProvider>
  )
}

export default function UnifiedDashboard({
  loadingView,
  userId,
  sessionLoading,
}: {
  loadingView: ReactNode
  userId: string | undefined
  sessionLoading: boolean
}) {
  const { role } = useParams()
  const [params] = useSearchParams()
  const identity = useQuery({
    queryKey: ['dashboard-identity', userId],
    queryFn: ({ signal }) =>
      userId ? loadDashboardIdentity(userId, signal) : null,
    enabled: Boolean(userId) && !sessionLoading,
    gcTime: 0,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })

  if (sessionLoading) return loadingView
  if (!userId) return <Navigate to="/login" replace />
  if (identity.isPending) return loadingView
  if (identity.isError || !identity.data) {
    return (
      <main className="mx-auto max-w-lg space-y-3 p-6" role="alert">
        <h1 className="text-xl font-bold">
          {identity.isError
            ? 'Dashboard access could not be checked'
            : 'Dashboard access unavailable'}
        </h1>
        <p>
          {identity.isError
            ? 'Check your connection and try again.'
            : 'Ask an administrator to check your account role.'}
        </p>
        {identity.isError && (
          <Button onClick={() => void identity.refetch()}>Try again</Button>
        )}
        <Button variant="outline" onClick={() => void supabase.auth.signOut()}>
          Sign out
        </Button>
      </main>
    )
  }
  const user = identity.data
  if (role !== user.role) {
    return (
      <Navigate
        to={`/${user.role}${params.size ? `?${params}` : ''}`}
        replace
      />
    )
  }
  return <DashboardWorkspace key={`${user.id}:${user.role}`} user={user} />
}
