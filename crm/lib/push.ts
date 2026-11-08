import 'server-only'
import { createPrivateKey, sign } from 'node:crypto'
import http2 from 'node:http2'
import { after } from 'next/server'
import { appUrl } from './env'
import { prisma } from './prisma'

/**
 * Push notifications to the Igani CRM iPhone app, through Apple (APNs, token auth). Needs, in Vercel:
 *   APNS_KEY      the .p8 key's contents (Apple Developer → Keys → Apple Push Notifications service)
 *   APNS_KEY_ID   that key's 10-character id
 *   APNS_TEAM_ID  the Apple team (defaults to Igani's, 8T65J68WA2)
 * Without them nothing is sent and nothing breaks.
 */

export type PushKind = 'chat' | 'texts' | 'calls' | 'leads'
export const PUSH_KINDS: { key: PushKind; label: string; hint: string }[] = [
  { key: 'chat', label: 'Team chat', hint: 'Direct messages and @mentions' },
  { key: 'texts', label: 'Texts', hint: 'Texts to your Igani number' },
  { key: 'calls', label: 'Missed calls', hint: 'Calls to your line nobody answered' },
  { key: 'leads', label: 'New leads', hint: 'Leads given to you' },
]

export interface PushMessage {
  title: string
  subtitle?: string
  body: string
  /** groups notifications on the lock screen (one stack per conversation) */
  thread: string
  /** the app's actions for it (Reply, Call back…) */
  category: 'CHAT' | 'SMS' | 'MISSED_CALL' | 'LEAD'
  /** what the app opens, and data for the actions */
  data: Record<string, string | boolean | null>
  /** replaces an earlier notification with the same id instead of stacking (e.g. a call's missed-call alert) */
  collapseId?: string
}

const BUNDLE = 'co.igani.crm'
let jwtCache: { token: string; at: number } | null = null

function config(): { key: string; keyId: string; teamId: string } | null {
  const key = process.env.APNS_KEY?.trim().replace(/\\n/g, '\n')
  const keyId = process.env.APNS_KEY_ID?.trim()
  if (!key || !keyId) return null
  return { key, keyId, teamId: process.env.APNS_TEAM_ID?.trim() || '8T65J68WA2' }
}

export const pushConfigured = (): boolean => config() !== null

/** Apple's provider token (ES256 JWT), reused for 50 minutes as Apple asks. */
function providerToken(c: { key: string; keyId: string; teamId: string }): string {
  if (jwtCache && Date.now() - jwtCache.at < 50 * 60_000) return jwtCache.token
  const b64 = (v: object | Buffer): string => (Buffer.isBuffer(v) ? v : Buffer.from(JSON.stringify(v))).toString('base64url')
  const head = `${b64({ alg: 'ES256', kid: c.keyId })}.${b64({ iss: c.teamId, iat: Math.floor(Date.now() / 1000) })}`
  const sig = sign('sha256', Buffer.from(head), { key: createPrivateKey(c.key), dsaEncoding: 'ieee-p1363' })
  jwtCache = { token: `${head}.${b64(sig)}`, at: Date.now() }
  return jwtCache.token
}

/** Unread chat messages plus unread texts: the number on the app icon. */
async function badgeFor(userId: string): Promise<number> {
  const [chat, sms] = await Promise.all([
    prisma.$queryRaw<{ n: number }[]>`
      SELECT count(*)::int AS n FROM "ChatMessage" m
      JOIN "ChatMember" cm ON cm."channelId" = m."channelId" AND cm."userId" = ${userId}
      JOIN "ChatChannel" c ON c."id" = m."channelId" AND c."archivedAt" IS NULL
      WHERE m."createdAt" > cm."lastReadAt" AND m."deletedAt" IS NULL AND (m."userId" IS NULL OR m."userId" <> ${userId})`,
    prisma.smsMessage.count({ where: { userId, direction: 'INBOUND', readAt: null } }).catch(() => 0),
  ])
  return (chat[0]?.n ?? 0) + sms
}

function send(session: http2.ClientHttp2Session, token: string, jwt: string, payload: string, collapseId?: string): Promise<number> {
  return new Promise((resolve) => {
    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': BUNDLE,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      ...(collapseId ? { 'apns-collapse-id': collapseId.slice(0, 64) } : {}),
    })
    let status = 0
    req.on('response', (h) => (status = Number(h[':status']) || 0))
    req.on('error', () => resolve(0))
    req.on('close', () => resolve(status))
    req.setTimeout(8000, () => req.close())
    req.end(payload)
  })
}

/** Send one notification to every phone of these people that wants this kind. Never throws. */
export async function pushTo(userIds: string[], kind: PushKind, msg: PushMessage, opts: { everyKind?: boolean } = {}): Promise<number> {
  const c = config()
  if (!c || !userIds.length) return 0
  let sent = 0
  try {
    const devices = await prisma.pushDevice.findMany({ where: { userId: { in: [...new Set(userIds)] } } })
    const wanted = devices.filter((d) => opts.everyKind || (d.prefs as Record<string, boolean> | null)?.[kind] !== false)
    if (!wanted.length) return 0
    const jwt = providerToken(c)
    const badges = new Map<string, number>()
    for (const id of new Set(wanted.map((d) => d.userId))) badges.set(id, await badgeFor(id).catch(() => 0))
    for (const env of ['production', 'sandbox'] as const) {
      const group = wanted.filter((d) => (d.env === 'sandbox') === (env === 'sandbox'))
      if (!group.length) continue
      const session = http2.connect(env === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com')
      session.on('error', () => undefined)
      const gone: string[] = []
      await Promise.all(
        group.map(async (d) => {
          const payload = JSON.stringify({
            aps: {
              alert: { title: msg.title, ...(msg.subtitle ? { subtitle: msg.subtitle } : {}), body: msg.body.slice(0, 600) },
              sound: 'default',
              badge: badges.get(d.userId) ?? 0,
              'thread-id': msg.thread,
              category: msg.category,
              'mutable-content': 1, // the app's extension adds the sender's photo
              'interruption-level': 'active',
            },
            ...msg.data,
            kind,
          })
          const status = await send(session, d.token, jwt, payload, msg.collapseId)
          if (status === 200) sent++
          if (status === 410 || status === 400) gone.push(d.token) // uninstalled, or a token from the other environment
        }),
      )
      session.close()
      if (gone.length) await prisma.pushDevice.deleteMany({ where: { token: { in: gone } } })
    }
  } catch (err) {
    console.error('[push] failed', err instanceof Error ? err.message : err)
  }
  return sent
}

/** Fire a push after the response (or right away outside a request), so it never slows the action down. */
export function pushLater(userIds: string[], kind: PushKind, msg: PushMessage | (() => Promise<PushMessage | null>)): void {
  const run = async (): Promise<void> => {
    const m = typeof msg === 'function' ? await msg().catch(() => null) : msg
    if (m) await pushTo(userIds, kind, m)
  }
  try {
    after(run)
  } catch {
    void run()
  }
}

/** A teammate's photo as an absolute URL (for the notification's avatar). */
export const photoUrl = (path: string | null | undefined): string | null => (path ? appUrl(path) : null)
