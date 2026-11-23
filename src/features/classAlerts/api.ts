import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { plannedDb } from '../../lib/plannedDb'
import { queryKeys } from '../../lib/queryClient'
import type {
  ClassAlertInboxRow,
  ClassAlertType,
} from '../../types/classroomTables'
import type { AppRole } from '../../types/roles'

/**
 * Alerts sent from the classroom, routed by type
 * (supabase/migrations/20261123120000_classroom_alert_routing.sql):
 *   AC alerts       → the sales team and the admins
 *   support alerts  → the tech admins and the admins
 *   Need help       → the admins
 * The database decides what each person sees; `alertTypesFor` only mirrors it
 * for the screen's wording and filters.
 */

export type ClassAlert = ClassAlertInboxRow

export const ALERT_TYPE_LABEL: Record<ClassAlertType, string> = {
  ac: 'AC alert',
  support: 'Support alert',
  help: 'Need help',
}

const ALERT_TYPES_BY_ROLE: Record<AppRole, ClassAlertType[]> = {
  owner: ['ac', 'support', 'help'],
  operations_admin: ['ac', 'support', 'help'],
  tech_admin: ['support'],
  marketer: ['ac'],
  tutor: [],
  student: [],
}

export function alertTypesFor(role: AppRole): ClassAlertType[] {
  return ALERT_TYPES_BY_ROLE[role]
}

/** Polled, so a new alert shows up without a reload. */
const POLL_MS = 20_000

export class AlertsNotSetUpError extends Error {}

type DbError = { code?: string; message?: string } | null

function raise(error: DbError, fallback: string): never {
  // The functions don't exist yet: the migration hasn't been applied.
  if (
    error?.code === 'PGRST202' ||
    error?.code === '42883' ||
    /classroom_alert_inbox|resolve_classroom_alert/.test(error?.message ?? '')
  ) {
    throw new AlertsNotSetUpError(
      'Class alerts aren’t set up in the database yet: apply migration 20261123120000_classroom_alert_routing.sql.',
    )
  }
  throw new Error(error?.message || fallback)
}

async function loadInbox(includeResolved: boolean): Promise<ClassAlert[]> {
  const { data, error } = await plannedDb.rpc('classroom_alert_inbox', {
    p_include_resolved: includeResolved,
    p_limit: includeResolved ? 200 : 100,
  })
  if (error) raise(error, 'Couldn’t load the alerts.')
  return data ?? []
}

export function useClassAlerts(includeResolved: boolean, enabled = true) {
  return useQuery({
    queryKey: queryKeys.classAlerts.inbox(includeResolved),
    queryFn: () => loadInbox(includeResolved),
    enabled,
    refetchInterval: POLL_MS,
    // Keep counting while the dashboard sits in a background tab.
    refetchIntervalInBackground: true,
    staleTime: 10_000,
    retry: (count, error) =>
      !(error instanceof AlertsNotSetUpError) && count < 1,
  })
}

/** Open alerts for the sidebar badge; 0 until the migration is applied. */
export function useOpenAlertCount(enabled: boolean): number {
  const open = useClassAlerts(false, enabled)
  return open.data?.length ?? 0
}

export function useResolveAlert() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, resolved }: { id: string; resolved: boolean }) => {
      const { error } = await plannedDb.rpc('resolve_classroom_alert', {
        p_alert_id: id,
        p_resolved: resolved,
      })
      if (error) raise(error, 'Couldn’t update the alert.')
    },
    onSettled: () =>
      client.invalidateQueries({ queryKey: queryKeys.classAlerts.all }),
  })
}
