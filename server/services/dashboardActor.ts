import type { Request } from 'express'
import { supabase } from '../supabase'

export const dashboardAdmins: ReadonlySet<string> = new Set([
  'owner',
  'operations_admin',
  'tech_admin',
])

export type DashboardActor = { id: string; role: string }

export async function dashboardActor(
  req: Request,
): Promise<DashboardActor | null> {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1]
  if (!token) return null

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('role, is_active')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile?.role || profile.is_active === false) return null
  return { id: data.user.id, role: profile.role }
}
