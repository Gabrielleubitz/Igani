import 'server-only'
import { createHmac, createSign, randomBytes, timingSafeEqual } from 'node:crypto'

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

interface Jaas {
  appId: string
  kid: string
  key: string
}

/** Reads and checks the three 8x8 settings. A wrong value is named exactly (it would otherwise just hang on "Connecting"). */
function readJaas(): { ok: Jaas } | { problem: string } | null {
  const appId = process.env.JAAS_APP_ID?.trim()
  const kidRaw = process.env.JAAS_KEY_ID?.trim()
  const key = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, '\n').trim()
  if (!appId && !kidRaw && !key) return null
  if (!appId || !kidRaw || !key) return { problem: `Missing ${[!appId && 'JAAS_APP_ID', !kidRaw && 'JAAS_KEY_ID', !key && 'JAAS_PRIVATE_KEY'].filter(Boolean).join(' and ')} in Vercel.` }
  if (!/^vpaas-magic-cookie-[a-z0-9]+$/i.test(appId)) return { problem: 'JAAS_APP_ID should look like vpaas-magic-cookie-… (the App ID at the top of the 8x8 console).' }
  if (/BEGIN|KEY-----|\s/.test(kidRaw) || kidRaw.length > 160) return { problem: 'JAAS_KEY_ID holds a key file, not the key’s ID. In the 8x8 console, API Keys, copy the short Key ID (it looks like vpaas-magic-cookie-…/a1b2c3) and paste only that.' }
  const kid = kidRaw.includes('/') ? kidRaw : `${appId}/${kidRaw}`
  if (!kid.startsWith(`${appId}/`) || !/^[A-Za-z0-9_-]{3,80}$/.test(kid.slice(appId.length + 1))) return { problem: 'JAAS_KEY_ID doesn’t match this app. Copy the Key ID of an API key from the same 8x8 app.' }
  if (/PUBLIC KEY/.test(key) || !/PRIVATE KEY-----/.test(key)) return { problem: 'JAAS_PRIVATE_KEY must be the private key file you downloaded when creating the API key (it starts with -----BEGIN PRIVATE KEY-----), not the public key.' }
  return { ok: { appId, kid, key } }
}

function jaas(): Jaas | null {
  const r = readJaas()
  return r && 'ok' in r ? r.ok : null
}

/** What's wrong with the 8x8 settings, if anything (null when fine or not set at all). */
export function meetSetupProblem(): string | null {
  const r = readJaas()
  return r && 'problem' in r ? r.problem : null
}

export const meetConfigured = (): boolean => jaas() != null
/** The public server is only for trying it out locally; production needs the 8x8 keys. */
export const meetAvailable = (): boolean => meetConfigured() || process.env.NODE_ENV !== 'production'

/**
 * Recording needs 8x8's webhook (it tells us where the finished file is) with its signing secret in JAAS_WEBHOOK_SECRET.
 * Without it the record button stays hidden: a recording we never hear about would be lost after 24 hours.
 */
export const meetRecordingReady = (): boolean => meetConfigured() && Boolean(process.env.JAAS_WEBHOOK_SECRET?.trim())

/** The Jitsi script for this setup, so the call page can load it while people are still on the "ready to join" screen. */
export function meetScriptUrl(): string | null {
  const c = jaas()
  if (c) return `https://8x8.vc/${c.appId}/external_api.js`
  return process.env.NODE_ENV === 'production' ? null : 'https://meet.jit.si/external_api.js'
}

/**
 * Checks 8x8's X-Jaas-Signature ("t=<unix>,v1=<base64 HMAC-SHA256 of `${t}.${body}`>") against the endpoint's secret.
 * Only v1 counts (no downgrades) and the timestamp must be recent, so an old message can't be replayed.
 */
export function verifyJaasSignature(rawBody: string, header: string | null, secret: string, now = Date.now(), toleranceSec = 600): boolean {
  if (!header || !secret) return false
  let t: string | null = null
  const sigs: string[] = []
  for (const part of header.split(',')) {
    const i = part.indexOf('=')
    if (i < 0) continue
    const k = part.slice(0, i).trim()
    const v = part.slice(i + 1).trim()
    if (k === 't') t = v
    else if (k === 'v1') sigs.push(v)
  }
  if (!t || !/^\d+$/.test(t) || !sigs.length) return false
  if (Math.abs(now / 1000 - Number(t)) > toleranceSec) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(`${t}.${rawBody}`, 'utf8').digest('base64'))
  return sigs.some((s) => {
    const got = Buffer.from(s)
    return got.length === expected.length && timingSafeEqual(got, expected)
  })
}

/** The room code from 8x8's "<appId>/<room>" name, only for our own app. */
export function roomCodeFromFqn(fqn: unknown, appId = process.env.JAAS_APP_ID?.trim()): string | null {
  if (typeof fqn !== 'string' || !appId) return null
  const [app, room, ...rest] = fqn.split('/')
  if (rest.length || app?.toLowerCase() !== appId.toLowerCase() || !room || !/^[a-z0-9-]{6,60}$/.test(room)) return null
  return room
}

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
      // only the host side (admins) may record; everyone sees and hears that a call is being recorded
      features: { livestreaming: 'false', recording: person.moderator && meetRecordingReady() ? 'true' : 'false', transcription: 'false', 'outbound-call': 'false', 'sip-outbound-call': 'false' },
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
