import { createVerify, generateKeyPairSync } from 'node:crypto'
import { afterEach, describe, expect, it } from 'vitest'
import { meetConfigFor, meetConfigured, meetSetupProblem, newInviteToken, newRoomCode, parseInviteEmails, signMeetJwt } from '@/lib/meet'

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
const pub = publicKey.export({ type: 'spki', format: 'pem' }).toString()
const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString()) as Record<string, unknown>
const saved = { ...process.env }

describe('Igani Meet', () => {
  afterEach(() => {
    for (const k of ['JAAS_APP_ID', 'JAAS_KEY_ID', 'JAAS_PRIVATE_KEY']) delete process.env[k]
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
})
