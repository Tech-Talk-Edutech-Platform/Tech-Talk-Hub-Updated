import { describe, expect, it } from '@jest/globals'
import {
  ADMIN_ROLES,
  APP_ROLES,
  isAdminRole,
  isAppRole,
  TUTOR_ADMIN_ROLES,
} from './roles'

describe('isAppRole', () => {
  it('accepts every configured dashboard role', () => {
    APP_ROLES.forEach((role) => {
      expect(isAppRole(role)).toBe(true)
    })
  })

  it('rejects values that are not configured roles', () => {
    expect(isAppRole('admin')).toBe(false)
    expect(isAppRole(null)).toBe(false)
    expect(isAppRole(undefined)).toBe(false)
    expect(isAppRole({ role: 'student' })).toBe(false)
  })
})

describe('isAdminRole', () => {
  it('accepts the configured administrative roles', () => {
    ADMIN_ROLES.forEach((role) => {
      expect(isAdminRole(role)).toBe(true)
    })
  })

  it('rejects non-admin and untrusted values', () => {
    expect(isAdminRole('tutor')).toBe(false)
    expect(isAdminRole('admin')).toBe(false)
    expect(isAdminRole(null)).toBe(false)
  })

  it('keeps the receipt and results route role group explicit', () => {
    expect(TUTOR_ADMIN_ROLES).toEqual(['tutor', 'owner', 'tech_admin'])
  })
})
