/** Dashboard roles observed in the source app's route matrix and auth flow. */
export const APP_ROLES = [
  'tutor',
  'owner',
  'operations_admin',
  'tech_admin',
  'student',
  'marketer',
] as const

export type AppRole = (typeof APP_ROLES)[number]

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
