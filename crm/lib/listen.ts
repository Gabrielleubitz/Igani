import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { logActivity } from './audit'
import type { SessionUser } from './auth'
import { BookingError } from './bookings'
import { prisma } from './prisma'
import { getSetting } from './settings'
import { twilioClient, twilioConfig, voiceUrl } from './twilio'

/**
 * Listening in on live calls. Calls are always placed the normal way; nothing about them changes. When an admin clicks
 * Listen, the CRM asks Twilio to fork the call's audio (both sides, one way only) to the listen relay (relay/) as a
 * media stream, and hands the admin a short-lived token for the relay's listener socket. The relay fans the audio out
 * to listeners and tells the CRM when the last one leaves, so the stream is stopped. The rep and the client hear and
 * see nothing of it; a stream failing can't touch the call. Every listen is in the audit log.
 */

/** Which side each stream track carries. The parent leg of an outgoing call is the rep's app; of an incoming call, the client's phone. */
export type ListenRoles = { inbound: 'rep' | 'client'; outbound: 'rep' | 'client' }

export interface ListenSession {
  relayUrl: string
  /** listener token for the relay (HS256 JWT, a couple of minutes to connect) */
  token: string
  roles: ListenRoles
  rep: string
  contact: string
}

/** The relay, when it's set up (LISTEN_RELAY_URL + LISTEN_RELAY_SECRET). */
export function listenRelay(): { url: string; secret: string } | null {
  const url = process.env.LISTEN_RELAY_URL?.trim().replace(/\/+$/, '') ?? ''
  const secret = process.env.LISTEN_RELAY_SECRET?.trim() ?? ''
  return /^wss?:\/\//.test(url) && secret.length >= 16 ? { url, secret } : null
}

const b64url = (b: Buffer | string): string => Buffer.from(b).toString('base64url')

/** A compact HS256 JWT the relay checks (jose-compatible, no library needed). */
export function signListenerToken(secret: string, claims: Record<string, unknown>, ttlSec = 120): string {
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const body = b64url(JSON.stringify({ ...claims, iat: now, exp: now + ttlSec }))
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url')
  return `${head}.${body}.${sig}`
}

/** The token Twilio carries to the relay with the stream: `<expiry>.<hmac(callId.expiry)>`. */
export function streamToken(secret: string, callId: string, ttlSec = 120): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec
  return `${exp}.${createHmac('sha256', secret).update(`${callId}.${exp}`).digest('hex')}`
}

/** The relay signs what it posts back to the CRM with the same secret (hex HMAC-SHA256 of the raw body). */
export function verifyRelaySignature(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature || !/^[0-9a-f]{64}$/i.test(signature)) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest()
  const given = Buffer.from(signature, 'hex')
  return given.length === expected.length && timingSafeEqual(given, expected)
}

export const rolesFor = (direction: 'OUTBOUND' | 'INBOUND'): ListenRoles => (direction === 'OUTBOUND' ? { inbound: 'rep', outbound: 'client' } : { inbound: 'client', outbound: 'rep' })

const STARTING = 'starting:'
const STARTING_STALE_MS = 20_000

/**
 * An admin starts listening to a live call. Checks everything, forks the call's audio to the relay once (a second
 * listener reuses the stream), and returns what the browser needs to connect.
 */
export async function startListen(admin: SessionUser, callId: string): Promise<ListenSession> {
  if (admin.role !== 'ADMIN') throw new BookingError('Only admins can listen in.', 'FORBIDDEN')
  const relay = listenRelay()
  if (!relay) throw new BookingError('Listening in isn’t set up yet (the relay is missing: see relay/README.md).', 'INVALID_STATE')
  if (!(await getSetting('voice.listenIn'))) throw new BookingError('Listening in is switched off (Admin → Phone).', 'FORBIDDEN')
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { user: { select: { id: true, name: true, email: true } }, lead: { select: { firstName: true, lastName: true, email: true, company: true } }, prospect: { select: { name: true } } },
  })
  if (!call || call.simulated) throw new BookingError('That call can’t be listened to.', 'NOT_FOUND')
  if (call.private) throw new BookingError('That’s a private call.', 'FORBIDDEN')
  if (call.userId === admin.id) throw new BookingError('That’s your own call.', 'INVALID_STATE')
  if (call.status !== 'IN_PROGRESS' || !call.twilioCallSid) throw new BookingError('That call isn’t connected right now.', 'INVALID_STATE')
  const c = twilioConfig()
  if (!c) throw new BookingError('Twilio isn’t configured.', 'INVALID_STATE')

  const roles = rolesFor(call.direction)
  // Fork the audio once: claim the slot, create the stream, store its sid. Anyone else arriving meanwhile just joins
  // the relay room; the audio reaches them the moment the stream is up. A claim left behind by a crash goes stale.
  const stale = call.listenStreamSid?.startsWith(STARTING) && Date.now() - Number(call.listenStreamSid.slice(STARTING.length)) > STARTING_STALE_MS
  if (!call.listenStreamSid || stale) {
    const marker = `${STARTING}${Date.now()}`
    const claimed = await prisma.call.updateMany({ where: { id: call.id, listenStreamSid: call.listenStreamSid ?? null }, data: { listenStreamSid: marker } })
    if (claimed.count) {
      try {
        const stream = await twilioClient(c)
          .calls(call.twilioCallSid)
          .streams.create({
            url: `${relay.url}/twilio`,
            name: `listen-${call.id}`,
            track: 'both_tracks',
            statusCallback: voiceUrl('stream', call.id),
            statusCallbackMethod: 'POST',
            'parameter1.name': 'token',
            'parameter1.value': streamToken(relay.secret, call.id),
            'parameter2.name': 'callId',
            'parameter2.value': call.id,
            'parameter3.name': 'roles',
            'parameter3.value': `${roles.inbound},${roles.outbound}`,
          })
        await prisma.call.updateMany({ where: { id: call.id, listenStreamSid: marker }, data: { listenStreamSid: stream.sid } })
      } catch (err) {
        await prisma.call.updateMany({ where: { id: call.id, listenStreamSid: marker }, data: { listenStreamSid: null } }).catch(() => undefined)
        console.error('[listen] could not start the stream', err instanceof Error ? err.message : err)
        throw new BookingError('Couldn’t start listening (Twilio refused the audio stream). Try again in a moment.', 'INVALID_STATE')
      }
    }
  }
  // kept in the audit log: who listened to whose call
  await logActivity({ actorId: admin.id, entityType: 'USER', entityId: call.userId ?? admin.id, action: 'call.listen.started', metadata: { callId: call.id, rep: call.userId } })
  const contact = call.lead ? [call.lead.firstName, call.lead.lastName].filter(Boolean).join(' ') || call.lead.email || call.lead.company || 'Client' : (call.prospect?.name ?? 'Client')
  return {
    relayUrl: relay.url,
    token: signListenerToken(relay.secret, { callId: call.id, sub: admin.id, roles }),
    roles,
    rep: call.user?.name ?? call.user?.email ?? 'Teammate',
    contact,
  }
}

/** The admin stopped listening (or the player closed): noted with how long they listened. The stream is stopped by the relay's callback. */
export async function stopListen(admin: SessionUser, callId: string, seconds: number): Promise<void> {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, userId: true } })
  if (!call) return
  await logActivity({ actorId: admin.id, entityType: 'USER', entityId: call.userId ?? admin.id, action: 'call.listen.stopped', metadata: { callId: call.id, rep: call.userId, seconds: Math.max(0, Math.round(seconds)) } })
}

/** Stop forking the call's audio (the last listener left). Streams also end by themselves with the call. */
export async function stopStream(callId: string): Promise<boolean> {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { twilioCallSid: true, listenStreamSid: true } })
  const sid = call?.listenStreamSid
  if (!call?.twilioCallSid || !sid || !/^MZ[0-9a-f]{32}$/i.test(sid)) return false
  const c = twilioConfig()
  if (c) {
    await twilioClient(c)
      .calls(call.twilioCallSid)
      .streams(sid)
      .update({ status: 'stopped' })
      .catch(() => undefined) // already over
  }
  await prisma.call.updateMany({ where: { id: callId, listenStreamSid: sid }, data: { listenStreamSid: null } })
  return true
}

/** Twilio says the stream stopped or failed: forget it, so the next Listen starts a fresh one. */
export async function streamEnded(callId: string, streamSid: string | undefined): Promise<void> {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { listenStreamSid: true } })
  const sid = call?.listenStreamSid
  if (!sid) return
  if (sid === streamSid) await prisma.call.updateMany({ where: { id: callId, listenStreamSid: sid }, data: { listenStreamSid: null } })
}
