import type { User } from '@supabase/supabase-js'
import type { AppRole } from './roles'

/** UI projection composed from Supabase Auth and observed profile fields. */
export type DashboardIdentity = User & {
  role: AppRole
  full_name?: string | null
  assigned_course_id?: string | null
  assigned_tutor_id?: string | null
  /** Saved dashboard theme ('light' | 'dark'); null until the person picks one. */
  theme?: string | null
}
