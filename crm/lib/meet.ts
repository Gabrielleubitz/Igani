import 'server-only'
import { createSign, randomBytes } from 'node:crypto'

/**
 * Igani Meet: video rooms on Jitsi, run by 8x8 ("Jitsi as a Service", 8x8.vc). The CRM draws its own Igani UI around the
 * call and signs a short-lived pass (JWT) for each person, so only people we invited get into a room.
 *
 * Setup (Vercel env): JAAS_APP_ID (vpaas-magic-cookie-…), JAAS_KEY_ID (the API key id shown in the 8x8 console, with or
 * without the "appId/" prefix) and JAAS_PRIVATE_KEY (the PEM private key for that API key; "\n" escapes are fine).
 * Without them, development falls back to the public meet.jit.si server (time-limited, test only).
 */

export interface MeetConfig {
  domain: string
  /** the room name Jitsi gets (8x8 rooms are "<appId>/<room>") */
  roomName: string
  scriptUrl: string
  jwt: string | null
  /** true on the public test server: calls are capped by Jitsi and branding can't be fully removed */
  testServer: boolean
}

export interface MeetPerson {
  id: string
  name: string
  email: string | null
  avatar: string | null
  moderator: boolean
}

function jaas(): { appId: string; kid: string; key: string } | null {
  const appId = process.env.JAAS_APP_ID?.trim()
  const kidRaw = process.env.JAAS_KEY_ID?.trim()
  const key = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!appId || !kidRaw || !key) return null
  return { appId, kid: kidRaw.includes('/') ? kidRaw : `${appId}/${kidRaw}`, key }
}

export const meetConfigured = (): boolean => jaas() != null
/** The public server is only for trying it out locally; production needs the 8x8 keys. */
export const meetAvailable = (): boolean => meetConfigured() || process.env.NODE_ENV !== 'production'

/** Room codes and invite tokens: random and URL-safe. */
export const newRoomCode = (): string => `igani-${randomBytes(9).toString('base64url').toLowerCase().replace(/[^a-z0-9]/g, '')}`
export const newInviteToken = (): string => randomBytes(24).toString('base64url')

const b64 = (v: object): string => Buffer.from(JSON.stringify(v)).toString('base64url')

/** An 8x8 JaaS pass for one person in one room (RS256), valid for a few hours. */
export function signMeetJwt(room: string, person: MeetPerson, now = new Date(), hours = 6): string | null {
  const c = jaas()
  if (!c) return null
  const iat = Math.floor(now.getTime() / 1000)
  const header = { alg: 'RS256', typ: 'JWT', kid: c.kid }
  const payload = {
    aud: 'jitsi',
    iss: 'chat',
    sub: c.appId,
    room,
    iat,
    nbf: iat - 30,
    exp: iat + hours * 3600,
    context: {
      user: { id: person.id, name: person.name, email: person.email ?? undefined, avatar: person.avatar ?? undefined, moderator: person.moderator ? 'true' : 'false' },
      features: { livestreaming: 'false', recording: 'false', transcription: 'false', 'outbound-call': 'false', 'sip-outbound-call': 'false' },
    },
  }
  const body = `${b64(header)}.${b64(payload)}`
  const sig = createSign('RSA-SHA256').update(body).sign(c.key).toString('base64url')
  return `${body}.${sig}`
}

/** Everything the browser needs to join a room as this person. */
export function meetConfigFor(code: string, person: MeetPerson): MeetConfig | null {
  const c = jaas()
  if (c) return { domain: '8x8.vc', roomName: `${c.appId}/${code}`, scriptUrl: `https://8x8.vc/${c.appId}/external_api.js`, jwt: signMeetJwt(code, person), testServer: false }
  if (process.env.NODE_ENV === 'production') return null
  return { domain: 'meet.jit.si', roomName: code, scriptUrl: 'https://meet.jit.si/external_api.js', jwt: null, testServer: true }
}

/** Parses "a@x.com, Dana <dana@y.co>; b@z.org" into unique, valid, lower-cased addresses with optional names. */
export function parseInviteEmails(raw: string): { email: string; name: string | null }[] {
  const out = new Map<string, string | null>()
  for (const part of raw.split(/[,;\n]+/)) {
    const t = part.trim()
    if (!t) continue
    const m = /^(.*?)<\s*([^<>\s]+@[^<>\s]+)\s*>$/.exec(t)
    const email = (m ? m[2]! : t).toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) continue
    const name = m ? m[1]!.trim().replace(/^"|"$/g, '') || null : null
    if (!out.has(email)) out.set(email, name)
  }
  return [...out].slice(0, 50).map(([email, name]) => ({ email, name }))
}
