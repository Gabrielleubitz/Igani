import 'server-only'
import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { env, appUrl } from '@/lib/env'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/**
 * Igani's own TikTok account, connected by an admin (Login Kit, web). The tokens are stored encrypted in SiteSetting
 * `tiktok.account`. The reel job on the owner's Mac asks /api/public/tiktok/token (with TIKTOK_JOB_SECRET) for a fresh
 * access token and uploads videos itself. Videos go to the account's drafts unless the job asks for a direct post.
 */
export const TIKTOK_SCOPES = ['user.info.basic', 'video.upload', 'video.publish'] as const
const KEY = 'tiktok.account'
const AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/'
const TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/'
const USER_URL = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,avatar_url'

export function tiktokConfig(): { key: string; secret: string } | null {
  const e = env()
  return e.TIKTOK_CLIENT_KEY && e.TIKTOK_CLIENT_SECRET ? { key: e.TIKTOK_CLIENT_KEY, secret: e.TIKTOK_CLIENT_SECRET } : null
}
export const tiktokRedirectUri = (): string => appUrl('/api/public/tiktok/callback')

// ---- encryption at rest (AES-256-GCM, key derived from NEXTAUTH_SECRET) ----
const aesKey = (): Buffer => createHash('sha256').update(`tiktok:${env().NEXTAUTH_SECRET}`).digest()
export function seal(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', aesKey(), iv)
  const body = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), body].map((b) => b.toString('base64url')).join('.')
}
export function unseal(sealed: string): string {
  const parts = sealed.split('.').map((p) => Buffer.from(p, 'base64url'))
  if (parts.length !== 3) throw new Error('Bad sealed value')
  const [iv, tag, body] = parts as [Buffer, Buffer, Buffer]
  const d = createDecipheriv('aes-256-gcm', aesKey(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(body), d.final()]).toString('utf8')
}

type Stored = { access: string; refresh: string; expiresAt: number; refreshExpiresAt: number; openId: string; scope: string; displayName: string | null; avatarUrl: string | null; connectedBy: string; connectedAt: number }
export type TikTokStatus = { connected: false } | { connected: true; displayName: string | null; avatarUrl: string | null; scope: string; connectedAt: number; refreshExpiresAt: number; daysLeft: number }

async function load(): Promise<Stored | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  return row ? (row.value as unknown as Stored) : null
}
async function save(s: Stored): Promise<void> {
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: s as unknown as Prisma.InputJsonValue }, update: { value: s as unknown as Prisma.InputJsonValue } })
}
export async function tiktokStatus(): Promise<TikTokStatus> {
  const s = await load()
  return s ? { connected: true, displayName: s.displayName, avatarUrl: s.avatarUrl, scope: s.scope, connectedAt: s.connectedAt, refreshExpiresAt: s.refreshExpiresAt, daysLeft: Math.max(0, Math.round((s.refreshExpiresAt - Date.now()) / 86_400_000)) } : { connected: false }
}
export async function disconnectTikTok(): Promise<void> {
  await prisma.siteSetting.deleteMany({ where: { key: KEY } })
}

/** The URL an admin is sent to; `state` is checked on the way back (cookie). */
export function authorizeUrl(state: string): string {
  const c = tiktokConfig()
  if (!c) throw new Error('TikTok is not configured')
  const u = new URL(AUTH_URL)
  u.searchParams.set('client_key', c.key)
  u.searchParams.set('scope', TIKTOK_SCOPES.join(','))
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('redirect_uri', tiktokRedirectUri())
  u.searchParams.set('state', state)
  return u.toString()
}

type TokenResponse = { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number; open_id: string; scope: string; error?: string; error_description?: string }
async function tokenRequest(body: Record<string, string>): Promise<TokenResponse> {
  const c = tiktokConfig()
  if (!c) throw new Error('TikTok is not configured')
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', 'cache-control': 'no-cache' }, body: new URLSearchParams({ client_key: c.key, client_secret: c.secret, ...body }) })
  const j = (await res.json()) as TokenResponse
  if (!res.ok || j.error || !j.access_token) throw new Error(`TikTok token error: ${j.error_description || j.error || res.status}`)
  return j
}

/** Callback: exchange the code, read who connected, store it encrypted. */
export async function connectWithCode(code: string, adminId: string): Promise<void> {
  const t = await tokenRequest({ code, grant_type: 'authorization_code', redirect_uri: tiktokRedirectUri() })
  let displayName: string | null = null
  let avatarUrl: string | null = null
  try {
    const r = await fetch(USER_URL, { headers: { authorization: `Bearer ${t.access_token}` } })
    const j = (await r.json()) as { data?: { user?: { display_name?: string; avatar_url?: string } } }
    displayName = j.data?.user?.display_name ?? null
    avatarUrl = j.data?.user?.avatar_url ?? null
  } catch {
    // the name is only for the settings card
  }
  const now = Date.now()
  await save({ access: seal(t.access_token), refresh: seal(t.refresh_token), expiresAt: now + t.expires_in * 1000, refreshExpiresAt: now + t.refresh_expires_in * 1000, openId: t.open_id, scope: t.scope, displayName, avatarUrl, connectedBy: adminId, connectedAt: now })
}

/** A valid access token for the reel job, refreshed when it has under 10 minutes left. */
export async function freshAccessToken(): Promise<{ accessToken: string; openId: string; scope: string } | null> {
  const s = await load()
  if (!s) return null
  if (s.expiresAt - Date.now() > 10 * 60 * 1000) return { accessToken: unseal(s.access), openId: s.openId, scope: s.scope }
  if (s.refreshExpiresAt < Date.now()) return null
  const t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: unseal(s.refresh) })
  const now = Date.now()
  await save({ ...s, access: seal(t.access_token), refresh: seal(t.refresh_token), expiresAt: now + t.expires_in * 1000, refreshExpiresAt: now + t.refresh_expires_in * 1000, scope: t.scope || s.scope })
  return { accessToken: t.access_token, openId: s.openId, scope: t.scope || s.scope }
}

/** Constant-time check of the job's bearer secret. */
export function jobSecretOk(header: string | null): boolean {
  const want = env().TIKTOK_JOB_SECRET
  if (!want || !header?.startsWith('Bearer ')) return false
  const a = Buffer.from(header.slice(7)), b = Buffer.from(want)
  return a.length === b.length && timingSafeEqual(a, b)
}

// ---- direct post (Content Posting API), used by the "Post now" test in Admin → Settings ----
const API = 'https://open.tiktokapis.com/v2/post/publish'
type ApiEnvelope<T> = { data?: T; error?: { code?: string; message?: string } }
async function tiktokApi<T>(path: string, accessToken: string, body: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json; charset=UTF-8' }, body: JSON.stringify(body ?? {}) })
  const j = (await res.json().catch(() => ({}))) as ApiEnvelope<T>
  if (!res.ok || (j.error?.code && j.error.code !== 'ok')) throw new Error(`TikTok: ${j.error?.message || j.error?.code || res.status}`)
  return (j.data ?? {}) as T
}

export type TikTokCreator = { username: string | null; nickname: string | null; privacyOptions: string[]; maxDurationSec: number | null }
/** Who will post and which privacy levels TikTok allows them (unaudited apps only get SELF_ONLY). */
export async function tiktokCreatorInfo(): Promise<TikTokCreator> {
  const t = await freshAccessToken()
  if (!t) throw new Error('TikTok is not connected (or the connection expired): reconnect it first')
  const d = await tiktokApi<{ creator_username?: string; creator_nickname?: string; privacy_level_options?: string[]; max_video_post_duration_sec?: number }>('/creator_info/query/', t.accessToken, {})
  return { username: d.creator_username ?? null, nickname: d.creator_nickname ?? null, privacyOptions: d.privacy_level_options ?? [], maxDurationSec: d.max_video_post_duration_sec ?? null }
}

/** TikTok takes one chunk up to 64 MB; the test keeps to that. */
export const TIKTOK_MAX_SINGLE_UPLOAD = 64 * 1024 * 1024

/** Direct-post a video (bytes in hand) and return the publish id to poll. Needs the video.publish scope. */
export async function tiktokDirectPost(video: ArrayBuffer, caption: string, privacy: string): Promise<string> {
  const t = await freshAccessToken()
  if (!t) throw new Error('TikTok is not connected (or the connection expired): reconnect it first')
  if (!t.scope.split(',').includes('video.publish')) throw new Error('TikTok did not grant video.publish: disconnect and connect again, and approve posting')
  const size = video.byteLength
  if (size > TIKTOK_MAX_SINGLE_UPLOAD) throw new Error('The test video must be 64 MB or smaller')
  const init = await tiktokApi<{ publish_id: string; upload_url: string }>('/video/init/', t.accessToken, {
    post_info: { title: caption.slice(0, 2200), privacy_level: privacy, disable_comment: false, disable_duet: false, disable_stitch: false },
    source_info: { source: 'FILE_UPLOAD', video_size: size, chunk_size: size, total_chunk_count: 1 },
  })
  const put = await fetch(init.upload_url, { method: 'PUT', headers: { 'content-type': 'video/mp4', 'content-length': String(size), 'content-range': `bytes 0-${size - 1}/${size}` }, body: video })
  if (!put.ok) throw new Error(`TikTok upload failed (${put.status})`)
  return init.publish_id
}

/** PROCESSING_UPLOAD | PROCESSING_DOWNLOAD | SEND_TO_USER_INBOX | PUBLISH_COMPLETE | FAILED */
export async function tiktokPostStatus(publishId: string): Promise<{ status: string; failReason: string | null; postId: string | null }> {
  const t = await freshAccessToken()
  if (!t) throw new Error('TikTok is not connected (or the connection expired): reconnect it first')
  const d = await tiktokApi<{ status?: string; fail_reason?: string; publicaly_available_post_id?: (string | number)[] }>('/status/fetch/', t.accessToken, { publish_id: publishId })
  const id = d.publicaly_available_post_id?.[0]
  return { status: d.status ?? 'PROCESSING_UPLOAD', failReason: d.fail_reason ?? null, postId: id != null ? String(id) : null }
}
