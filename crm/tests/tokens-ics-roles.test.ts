import { describe, expect, it } from 'vitest'
import { buildIcs } from '@/lib/ics'
import { canAccess, isPublicPath } from '@/lib/roles'
import { createInviteToken, safeEqual, verifyInviteToken } from '@/lib/tokens'

const KEY = 'test-secret-test-secret'

describe('invite tokens', () => {
  const exp = new Date('2026-11-10T00:00:00Z')
  it('round-trips', () => {
    const t = createInviteToken('ckbooking123', exp, KEY)
    expect(verifyInviteToken(t, new Date('2026-11-01T00:00:00Z'), KEY)).toEqual({ ok: true, bookingId: 'ckbooking123', expiresAt: exp })
  })
  it('rejects tampering, wrong key and expiry', () => {
    const t = createInviteToken('ckbooking123', exp, KEY)
    const now = new Date('2026-11-01T00:00:00Z')
    expect(verifyInviteToken(t.replace('ckbooking123', 'ckbooking999'), now, KEY)).toMatchObject({ ok: false, reason: 'bad-signature' })
    expect(verifyInviteToken(t, now, 'another-secret-entirely')).toMatchObject({ ok: false, reason: 'bad-signature' })
    expect(verifyInviteToken(t, new Date('2026-11-11T00:00:00Z'), KEY)).toMatchObject({ ok: false, reason: 'expired' })
    expect(verifyInviteToken('garbage', now, KEY)).toMatchObject({ ok: false, reason: 'malformed' })
  })
  it('compares secrets safely', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('ics', () => {
  it('produces a valid CRLF calendar with escaped text', () => {
    const ics = buildIcs(
      {
        uid: 'b1@app.igani.co',
        start: new Date('2026-11-02T09:00:00Z'),
        end: new Date('2026-11-02T09:30:00Z'),
        title: 'Intro, call; Igani',
        location: 'https://meet.google.com/abc-defg-hij',
        organizerName: 'Gabriel',
        organizerEmail: 'g@igani.co',
        attendeeName: 'Dana',
        attendeeEmail: 'dana@example.com',
      },
      new Date('2026-11-01T00:00:00Z'),
    )
    expect(ics).toContain('DTSTART:20261102T090000Z\r\n')
    expect(ics).toContain('SUMMARY:Intro\\, call\; Igani\r\n')
    expect(ics.split('\r\n').every((l) => Buffer.byteLength(l) <= 75)).toBe(true)
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
  })
})

describe('route roles', () => {
  it('enforces areas', () => {
    expect(canAccess('ADMIN', '/admin/users')).toBe(true)
    expect(canAccess('SALES', '/admin/users')).toBe(false)
    expect(canAccess('SALES', '/sales')).toBe(true)
    expect(canAccess('MARKETING', '/sales/invite')).toBe(false)
    expect(canAccess('MARKETING', '/api/anything')).toBe(true)
    expect(canAccess(undefined, '/sales')).toBe(false)
  })
  it('keeps public paths public and nothing else', () => {
    expect(isPublicPath('/book/intro')).toBe(true)
    expect(isPublicPath('/invites/abc')).toBe(true)
    expect(isPublicPath('/api/v1/leads')).toBe(true)
    expect(isPublicPath('/api/auth/callback/google')).toBe(true)
    expect(isPublicPath('/api/v1/leads-export')).toBe(false)
    expect(isPublicPath('/loginx')).toBe(false)
    expect(isPublicPath('/admin')).toBe(false)
    expect(isPublicPath('/bookings')).toBe(false)
    expect(isPublicPath('/')).toBe(false)
  })
})

describe('formatDateTime', async () => {
  const { formatDateTime } = await import('@/lib/format')
  it('formats with a zone label without throwing', () => {
    expect(formatDateTime(new Date('2026-11-02T09:00:00Z'), 'Asia/Jerusalem')).toBe('Nov 2, 2026, 11:00 AM GMT+2')
  })
})
