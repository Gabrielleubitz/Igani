import 'server-only'
import type { Prisma } from '@prisma/client'
import { env, appUrl } from '@/lib/env'
import { prisma } from '@/lib/prisma'
import { seal, unseal } from '@/lib/tiktok'

/**
 * Igani's own Instagram (professional) account via "Instagram API with Instagram Login". An admin connects it once in
 * Admin → Settings; the long-lived token (60 days) is stored encrypted in SiteSetting and refreshed when it gets old.
 * Reels are only ever published by an admin pressing Approve on /admin/reels (Instagram's API has no drafts).
 */
export const INSTAGRAM_SCOPES = ['instagram_business_basic', 'instagram_business_content_publish', 'instagram_business_manage_messages'] as const
const KEY = 'instagram.account'
const GRAPH = 'https://graph.instagram.com/v21.0'

export function instagramConfig(): { id: string; secret: string } | null {
  const e = env()
  return e.INSTAGRAM_APP_ID && e.INSTAGRAM_APP_SECRET ? { id: e.INSTAGRAM_APP_ID, secret: e.INSTAGRAM_APP_SECRET } : null
}
export const instagramRedirectUri = (): string => appUrl('/api/public/instagram/callback')

type Stored = { token: string; expiresAt: number; issuedAt: number; userId: string; username: string | null; picture: string | null; connectedBy: string; connectedAt: number; /** DMs turned on (subscribed to message webhooks) */ messages?: boolean }
export type InstagramStatus = { connected: false } | { connected: true; username: string | null; picture: string | null; daysLeft: number; canMessage: boolean }

async function load(): Promise<Stored | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  return row ? (row.value as unknown as Stored) : null
}
async function save(s: Stored): Promise<void> {
  const v = s as unknown as Prisma.InputJsonValue
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: v }, update: { value: v } })
}
export async function instagramStatus(): Promise<InstagramStatus> {
  const s = await load()
  return s ? { connected: true, username: s.username, picture: s.picture, daysLeft: Math.max(0, Math.round((s.expiresAt - Date.now()) / 86_400_000)), canMessage: Boolean(s.messages) } : { connected: false }
}
export async function disconnectInstagram(): Promise<void> {
  await prisma.siteSetting.deleteMany({ where: { key: KEY } })
}

export function instagramAuthorizeUrl(state: string): string {
  const c = instagramConfig()
  if (!c) throw new Error('Instagram is not configured')
  const u = new URL('https://www.instagram.com/oauth/authorize')
  u.searchParams.set('client_id', c.id)
  u.searchParams.set('redirect_uri', instagramRedirectUri())
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('scope', INSTAGRAM_SCOPES.join(','))
  u.searchParams.set('state', state)
  return u.toString()
}

async function json<T>(res: Response): Promise<T> {
  const j = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string }
  if (!res.ok) {
    const e = j.error
    throw new Error(`Instagram: ${(typeof e === 'object' ? e?.message : e) || j.error_message || res.status}`)
  }
  return j
}

/** Callback: code → short-lived token → long-lived token (60 days); store it with the account's name. */
export async function connectInstagramWithCode(code: string, adminId: string): Promise<void> {
  const c = instagramConfig()
  if (!c) throw new Error('Instagram is not configured')
  const short = await json<{ access_token: string; user_id: number | string }>(await fetch('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, grant_type: 'authorization_code', redirect_uri: instagramRedirectUri(), code }) }))
  const long = await json<{ access_token: string; expires_in: number }>(await fetch(`https://graph.instagram.com/access_token?${new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: c.secret, access_token: short.access_token })}`))
  const me = await json<{ user_id?: string; id?: string; username?: string; profile_picture_url?: string }>(await fetch(`${GRAPH}/me?fields=user_id,username,profile_picture_url&access_token=${encodeURIComponent(long.access_token)}`)).catch(() => ({}) as { user_id?: string; username?: string; profile_picture_url?: string })
  const now = Date.now()
  // DMs: ask Instagram to send new messages to our webhook (only works when the messages permission was granted)
  const subscribed = await fetch(`${GRAPH}/me/subscribed_apps?subscribed_fields=messages&access_token=${encodeURIComponent(long.access_token)}`, { method: 'POST' }).then((r) => r.ok).catch(() => false)
  await save({ token: seal(long.access_token), expiresAt: now + long.expires_in * 1000, issuedAt: now, userId: String(me.user_id ?? short.user_id), username: me.username ?? null, picture: me.profile_picture_url ?? null, connectedBy: adminId, connectedAt: now, messages: subscribed })
}

/** The long-lived token, refreshed once it's over 2 days old and within 20 days of expiry. */
export async function token(): Promise<{ token: string; userId: string }> {
  const s = await load()
  if (!s || s.expiresAt < Date.now()) throw new Error('Instagram is not connected (or the connection expired): reconnect it in Admin → Settings')
  let tok = unseal(s.token)
  if (s.expiresAt - Date.now() < 20 * 86_400_000 && Date.now() - s.issuedAt > 2 * 86_400_000) {
    const r = await json<{ access_token: string; expires_in: number }>(await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(tok)}`))
    tok = r.access_token
    await save({ ...s, token: seal(tok), expiresAt: Date.now() + r.expires_in * 1000, issuedAt: Date.now() })
  }
  return { token: tok, userId: s.userId }
}

/** Step 1: Instagram fetches the video from `videoUrl` and starts processing. Returns the container id. */
export async function createReelContainer(videoUrl: string, caption: string, coverUrl?: string | null): Promise<string> {
  const t = await token()
  const params: Record<string, string> = { media_type: 'REELS', video_url: videoUrl, caption, share_to_feed: 'true', access_token: t.token }
  if (coverUrl) params.cover_url = coverUrl
  const r = await json<{ id: string }>(await fetch(`${GRAPH}/${t.userId}/media`, { method: 'POST', body: new URLSearchParams(params) }))
  return r.id
}
/** Step 2: IN_PROGRESS | FINISHED | ERROR | EXPIRED | PUBLISHED */
export async function containerStatus(containerId: string): Promise<{ status: string; message: string | null }> {
  const t = await token()
  const r = await json<{ status_code?: string; status?: string }>(await fetch(`${GRAPH}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(t.token)}`))
  return { status: r.status_code ?? 'IN_PROGRESS', message: r.status ?? null }
}
/** Step 3: publish a FINISHED container. Returns the media id and its permalink. */
export async function publishContainer(containerId: string): Promise<{ mediaId: string; permalink: string | null }> {
  const t = await token()
  const r = await json<{ id: string }>(await fetch(`${GRAPH}/${t.userId}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: containerId, access_token: t.token }) }))
  const p = await json<{ permalink?: string }>(await fetch(`${GRAPH}/${r.id}?fields=permalink&access_token=${encodeURIComponent(t.token)}`)).catch(() => ({}) as { permalink?: string })
  return { mediaId: r.id, permalink: p.permalink ?? null }
}
