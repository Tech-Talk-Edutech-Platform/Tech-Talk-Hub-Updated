/** Dashboard roles observed in the source app's route matrix and auth flow. */
export const APP_ROLES = [
  'tutor',
  'owner',
  'operations_admin',
  'tech_admin',
  'student',
  // The sales and marketing team ("Sales & Marketing" on screen). Their
  // dashboard is src/features/sales (tables and rules:
  // supabase/migrations/20261116130000_sales_trials.sql).
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

/**
 * The roles an admin can give someone, in the order the role pickers list
 * them, with what each one can do. `non_user` (an account with no access yet)
 * isn't offered for new people.
 */
export const ASSIGNABLE_ROLES = [
  {
    role: 'student',
    description: 'Joins classes, sees their courses and homework.',
  },
  {
    role: 'tutor',
    description: 'Teaches classes and trials, opens free slots.',
  },
  {
    role: 'marketer',
    description: 'Works parent leads, books trials and records sales.',
  },
  {
    role: 'operations_admin',
    description: 'Full admin: people, schedule, sales and the website.',
  },
  {
    role: 'tech_admin',
    description: 'Full admin, for the technical team.',
  },
  {
    role: 'owner',
    description: 'Full admin. Only an owner can add another owner.',
  },
] as const satisfies readonly { role: AppRole; description: string }[]

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
