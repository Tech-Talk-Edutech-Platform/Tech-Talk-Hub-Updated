import { useEffect, useRef, useState, type ReactNode } from 'react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { Navigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import { createQueryClient } from '../lib/queryClient'
import { browserTimeZone } from '../lib/timeZones'
import {
  applyTheme,
  clearPaintedTheme,
  loadAccountTheme,
  readStoredTheme,
} from '../lib/theme'
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

function DashboardWorkspace({
  user,
  onProfileSaved,
}: {
  user: DashboardIdentity
  onProfileSaved: () => void
}) {
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

  // Keep the account's time zone in step with this browser, so trials booked
  // for a family elsewhere show the right time for this person too
  // (users.time_zone). Fire and forget: nothing waits on it. The workspace is
  // keyed by user, so this runs once per signed-in person.
  useEffect(() => {
    void supabase
      .rpc('set_my_time_zone', { p_zone: browserTimeZone() })
      .then(({ error }) => {
        if (error) console.warn('Couldn’t save the time zone:', error.message)
      })
  }, [])

  // Dark mode: this browser's copy paints at once (index.html already did on
  // a full load), then the account's choice wins so it follows the person
  // between devices. Leaving the dashboard returns to the light public site.
  useEffect(() => {
    const stored = readStoredTheme()
    if (stored) applyTheme(stored)
    let current = true
    void loadAccountTheme(user.id).then((saved) => {
      if (current && saved) applyTheme(saved)
    })
    return () => {
      current = false
      clearPaintedTheme()
    }
  }, [user.id])

  return (
    <QueryClientProvider client={client}>
      <DashboardLayout user={user} onProfileSaved={onProfileSaved} />
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
  return (
    <DashboardWorkspace
      key={`${user.id}:${user.role}`}
      user={user}
      onProfileSaved={() => void identity.refetch()}
    />
  )
}
