/** Dashboard roles observed in the source app's route matrix and auth flow. */
export const APP_ROLES = [
  'tutor',
  'owner',
  'operations_admin',
  'tech_admin',
  'student',
  // The sales and marketing team ("Sales & Marketing" on screen). The role
  // comes from supabase/migrations/20261116120000_marketer_role.sql; its
  // dashboard runs on demo data until supabase/drafts/sales_trial_booking.sql
  // is applied.
  'marketer',
] as const

export type AppRole = (typeof APP_ROLES)[number]

const ROLE_LABELS: Record<AppRole, string> = {
  tutor: 'Tutor',
  owner: 'Owner',
  operations_admin: 'Operations Admin',
  tech_admin: 'Tech Admin',
  student: 'Student',
  marketer: 'Sales & Marketing',
}

/** A role's name on screen, e.g. 'marketer' → "Sales & Marketing". */
export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'No role'
  return isAppRole(role) ? ROLE_LABELS[role] : role.replaceAll('_', ' ')
}

export const ADMIN_ROLES = [
  'owner',
  'operations_admin',
  'tech_admin',
] as const satisfies readonly AppRole[]

export type AdminRole = (typeof ADMIN_ROLES)[number]

export const TUTOR_ADMIN_ROLES = [
  'tutor',
  'owner',
  'tech_admin',
] as const satisfies readonly AppRole[]

const adminRoleSet: ReadonlySet<string> = new Set(ADMIN_ROLES)

export function isAdminRole(value: unknown): value is AdminRole {
  return typeof value === 'string' && adminRoleSet.has(value)
}

/** Narrows untrusted role values without changing their source or resolution. */
export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && APP_ROLES.some((role) => role === value)
}
