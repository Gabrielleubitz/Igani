import { describe, expect, it } from 'vitest'
import { CALENDAR_SCOPES, GMAIL_READ_SCOPE, GOOGLE_CONNECT_SCOPES, SIGN_IN_SCOPES, grantsWorkspaceAccess } from '../lib/google-scopes'

describe('Google scopes', () => {
  it('sign-in asks for identity only, so Google shows no unverified-app warning', () => {
    expect(SIGN_IN_SCOPES.split(' ').sort()).toEqual(['email', 'openid', 'profile'])
  })

  it('"Connect Google" asks for identity plus Calendar and Gmail', () => {
    const asked = GOOGLE_CONNECT_SCOPES.split(' ')
    for (const s of [...SIGN_IN_SCOPES.split(' '), ...CALENDAR_SCOPES, GMAIL_READ_SCOPE]) expect(asked).toContain(s)
  })

  it('a plain sign-in grant must not overwrite a saved connection', () => {
    expect(grantsWorkspaceAccess('openid email profile')).toBe(false)
    expect(grantsWorkspaceAccess('openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile')).toBe(false)
    expect(grantsWorkspaceAccess('')).toBe(false)
    expect(grantsWorkspaceAccess(null)).toBe(false)
    expect(grantsWorkspaceAccess(undefined)).toBe(false)
  })

  it('a grant with Calendar or Gmail is stored', () => {
    expect(grantsWorkspaceAccess(GOOGLE_CONNECT_SCOPES)).toBe(true)
    expect(grantsWorkspaceAccess(`openid ${CALENDAR_SCOPES[0]}`)).toBe(true)
    expect(grantsWorkspaceAccess(`openid ${GMAIL_READ_SCOPE}`)).toBe(true)
  })
})
