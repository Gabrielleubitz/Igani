import { createHmac, createVerify, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { meetConfigFor, meetConfigured, meetRecordingReady, meetSetupProblem, newInviteToken, newRoomCode, parseInviteEmails, roomCodeFromFqn, signMeetJwt, verifyJaasSignature } from '@/lib/meet'
import { withFromName } from '@/lib/email'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString()
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<string, unknown>
const saved = { ...process.env }

describe('Igani Meet', () => {
  afterEach(() => {
    for (const k of ['JAAS_APP_ID', 'JAAS_KEY_ID', 'JAAS_PRIVATE_KEY', 'JAAS_WEBHOOK_SECRET']) delete process.env[k]
    Object.assign(process.env, saved)
  })

  it('signs an 8x8 pass for one person in one room, verifiable with the public key', () => {
    Object.assign(process.env, { JAAS_APP_ID: 'vpaas-magic-cookie-abc', JAAS_KEY_ID: 'key1', JAAS_PRIVATE_KEY: pem.replace(/\n/g, '\\n') })
    const now = new Date('2026-11-05T10:00:00Z')
    const jwt = signMeetJwt('igani-room', { id: 'u1', name: 'Dana', email: 'dana@x.com', avatar: null, moderator: false }, now)!
    const [h, p, sig] = jwt.split('.') as [string, string, string]
    expect(decode(h)).toEqual({ alg: 'RS256', typ: 'JWT', kid: 'vpaas-magic-cookie-abc/key1' })
    const body = decode(p)
    expect(body).toMatchObject({ aud: 'jitsi', iss: 'chat', sub: 'vpaas-magic-cookie-abc', room: 'igani-room', exp: now.getTime() / 1000 + 6 * 3600 })
    expect((body.context as { user: { moderator: string; name: string } }).user).toMatchObject({ name: 'Dana', moderator: 'false' })
    expect(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(sig, 'base64url'))).toBe(true)
    expect(meetConfigFor('igani-room', { id: 'u1', name: 'Dana', email: null, avatar: null, moderator: true })).toMatchObject({ domain: '8x8.vc', roomName: 'vpaas-magic-cookie-abc/igani-room', scriptUrl: 'https://8x8.vc/vpaas-magic-cookie-abc/external_api.js', testServer: false })
  })

  it('without keys: the public test server outside production, nothing in production', () => {
    expect(signMeetJwt('r', { id: 'u', name: 'x', email: null, avatar: null, moderator: false })).toBeNull()
    expect(meetConfigFor('r', { id: 'u', name: 'x', email: null, avatar: null, moderator: false })).toMatchObject({ domain: 'meet.jit.si', jwt: null, testServer: true })
    Object.assign(process.env, { NODE_ENV: 'production' })
    expect(meetConfigFor('r', { id: 'u', name: 'x', email: null, avatar: null, moderator: false })).toBeNull()
  })

  it('names a wrong 8x8 setting instead of signing a pass 8x8 will refuse', () => {
    const set = (kid: string, key = pem) => Object.assign(process.env, { JAAS_APP_ID: 'vpaas-magic-cookie-abc', JAAS_KEY_ID: kid, JAAS_PRIVATE_KEY: key })
    // the public key pasted as the key ID (what happened on the live site)
    set(pub)
    expect(meetSetupProblem()).toMatch(/JAAS_KEY_ID holds a key file/)
    expect(meetConfigured()).toBe(false)
    expect(signMeetJwt('r', { id: 'u', name: 'x', email: null, avatar: null, moderator: true })).toBeNull()
    set('key1', pub)
    expect(meetSetupProblem()).toMatch(/JAAS_PRIVATE_KEY must be the private key/)
    set('vpaas-magic-cookie-other/key1')
    expect(meetSetupProblem()).toMatch(/doesn’t match this app/)
    for (const kid of ['key1', 'vpaas-magic-cookie-abc/key1']) {
      set(kid)
      expect(meetSetupProblem()).toBeNull()
      expect(meetConfigured()).toBe(true)
    }
    delete process.env.JAAS_PRIVATE_KEY
    expect(meetSetupProblem()).toMatch(/Missing JAAS_PRIVATE_KEY/)
  })

  it('reads invite emails typed any way', () => {
    expect(parseInviteEmails('Dana@X.com, Mike Amory <mike@cryo.com>; bad-email\n"Sam Lee" <sam@y.co>, dana@x.com')).toEqual([
      { email: 'dana@x.com', name: null },
      { email: 'mike@cryo.com', name: 'Mike Amory' },
      { email: 'sam@y.co', name: 'Sam Lee' },
    ])
  })

  it('makes unguessable room codes and tokens', () => {
    expect(newRoomCode()).toMatch(/^igani-[a-z0-9]{8,}$/)
    expect(newRoomCode()).not.toBe(newRoomCode())
    expect(newInviteToken().length).toBeGreaterThanOrEqual(30)
  })

  it('lets only hosts record, and only once the recording webhook is set up', () => {
    Object.assign(process.env, { JAAS_APP_ID: 'vpaas-magic-cookie-abc', JAAS_KEY_ID: 'key1', JAAS_PRIVATE_KEY: pem })
    const features = (moderator: boolean) => (decode(signMeetJwt('r', { id: 'u', name: 'x', email: null, avatar: null, moderator })!.split('.')[1]!).context as { features: { recording: string } }).features.recording
    expect(meetRecordingReady()).toBe(false)
    expect(features(true)).toBe('false')
    process.env.JAAS_WEBHOOK_SECRET = 'whsec_test'
    expect(meetRecordingReady()).toBe(true)
    expect(features(true)).toBe('true')
    expect(features(false)).toBe('false')
  })

  it('accepts only recent 8x8 webhooks signed with our secret (v1 only)', () => {
    const secret = 'whsec_9635df66714a4cf088ee9d0979dd3bf6'
    const body = '{"eventType":"RECORDING_UPLOADED"}'
    const t = 1_800_000_000
    const sig = createHmac('sha256', secret).update(`${t}.${body}`).digest('base64')
    const now = t * 1000
    expect(verifyJaasSignature(body, `t=${t},v1=${sig}`, secret, now)).toBe(true)
    expect(verifyJaasSignature(body, `t=${t},v0=bad,v1=${sig}`, secret, now)).toBe(true)
    expect(verifyJaasSignature(body + ' ', `t=${t},v1=${sig}`, secret, now)).toBe(false)
    expect(verifyJaasSignature(body, `t=${t},v1=${sig}`, 'whsec_other', now)).toBe(false)
    expect(verifyJaasSignature(body, `t=${t},v0=${sig}`, secret, now)).toBe(false)
    expect(verifyJaasSignature(body, `t=${t},v1=${sig}`, secret, now + 3600_000)).toBe(false)
    expect(verifyJaasSignature(body, null, secret, now)).toBe(false)
  })

  it('reads our room from 8x8’s room name, and nobody else’s', () => {
    expect(roomCodeFromFqn('vpaas-magic-cookie-abc/igani-x1y2z3', 'vpaas-magic-cookie-abc')).toBe('igani-x1y2z3')
    expect(roomCodeFromFqn('vpaas-magic-cookie-other/igani-x1y2z3', 'vpaas-magic-cookie-abc')).toBeNull()
    expect(roomCodeFromFqn('vpaas-magic-cookie-abc/../x', 'vpaas-magic-cookie-abc')).toBeNull()
    expect(roomCodeFromFqn(42, 'vpaas-magic-cookie-abc')).toBeNull()
  })

  it('sends invites as the host, from our own address', () => {
    expect(withFromName('Igani <bookings@igani.co>', 'Gabriel Leubitz (Igani)')).toBe('"Gabriel Leubitz (Igani)" <bookings@igani.co>')
    expect(withFromName('bookings@igani.co', 'Dana "D" <x>')).toBe('"Dana D x" <bookings@igani.co>')
    expect(withFromName('Igani <bookings@igani.co>', '  ')).toBe('Igani <bookings@igani.co>')
  })
})

describe('Igani Meet on its own host', () => {
  it('recognises meet.igani.co, meet.localhost and MEET_URL’s host, nothing else', async () => {
    const { isMeetHost } = await import('@/lib/meet-host')
    expect(isMeetHost('meet.igani.co')).toBe(true)
    expect(isMeetHost('MEET.igani.co')).toBe(true)
    expect(isMeetHost('meet.localhost:3100')).toBe(true)
    expect(isMeetHost('app.igani.co')).toBe(false)
    expect(isMeetHost('meet.app.igani.co')).toBe(false)
    expect(isMeetHost('evilmeet.igani.co')).toBe(false)
    expect(isMeetHost(null)).toBe(false)
    const before = process.env.MEET_URL
    process.env.MEET_URL = 'https://calls.example.com'
    try {
      expect(isMeetHost('calls.example.com')).toBe(true)
    } finally {
      if (before === undefined) delete process.env.MEET_URL
      else process.env.MEET_URL = before
    }
  })

  it('maps the CRM’s /meet paths to the Meet host’s root', async () => {
    const { stripMeetPrefix, isFilePath } = await import('@/lib/meet-host')
    expect(stripMeetPrefix('/meet')).toBe('/')
    expect(stripMeetPrefix('/meet/igani-abc')).toBe('/igani-abc')
    expect(stripMeetPrefix('/meeting')).toBe('/meeting')
    expect(isFilePath('/meet/icon-32.png')).toBe(true)
    expect(isFilePath('/meet/igani-abc')).toBe(false)
  })

  it('lets the host or an admin run a meeting, and no other teammate', async () => {
    const { canManageMeet } = await import('@/lib/meet-access')
    expect(canManageMeet({ id: 'u1', role: 'SALES' }, { hostId: 'u1' })).toBe(true)
    expect(canManageMeet({ id: 'u2', role: 'SALES' }, { hostId: 'u1' })).toBe(false)
    expect(canManageMeet({ id: 'u2', role: 'MARKETING' }, { hostId: null })).toBe(false)
    expect(canManageMeet({ id: 'u3', role: 'ADMIN' }, { hostId: 'u1' })).toBe(true)
  })
})

describe('Igani Meet connection health', () => {
  it('reads 8x8’s connection stats defensively and grades them', async () => {
    const { readNet, netLevel } = await import('@/components/meet/net')
    expect(readNet(null)).toEqual({ lossUp: 0, lossDown: 0, rtt: null, upKbps: null, downKbps: null, score: null })
    const weak = readNet({ packetLoss: { upload: 6, download: '1' }, jvbRTT: 120, bitrate: { upload: 900, download: 1500 } })
    expect(weak).toMatchObject({ lossUp: 6, lossDown: 1, rtt: 120, upKbps: 900 })
    expect(netLevel(weak)).toBe('weak')
    expect(netLevel(readNet({ packetLoss: { upload: 0, download: 0 }, transport: [{ rtt: 40 }] }))).toBe('good')
    expect(netLevel(readNet({ packetLoss: { upload: 1, download: 2 }, transport: [{ rtt: 950 }] }))).toBe('poor')
    expect(netLevel(readNet({ packetLoss: { upload: 20 } }))).toBe('poor')
  })
})

describe('iOS app menu', () => {
  it('lists only the pages a role may open, in their folders', async () => {
    const { navPagesFor } = await import('@/lib/nav')
    const sales = navPagesFor('SALES').map((p) => p.href)
    const admin = navPagesFor('ADMIN').map((p) => p.href)
    expect(sales).toContain('/sales/leads')
    expect(sales).not.toContain('/admin/users')
    expect(admin).toContain('/admin/users')
    expect(navPagesFor('ADMIN').find((p) => p.href === '/sales/board')?.group).toBe('Sales')
    expect(navPagesFor('MARKETING').map((p) => p.href)).not.toContain('/sales/calls')
  })
})
