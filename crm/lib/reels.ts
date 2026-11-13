import 'server-only'
import { randomBytes } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { env, appUrl } from '@/lib/env'

/**
 * Reels made by the twice-a-day job, waiting for a person: the job uploads the file to the private bucket and adds it
 * here; an admin watches it on /admin/reels and presses Approve to publish to Instagram (or dismisses it).
 */
export type ReelStatus = 'uploading' | 'pending' | 'processing' | 'posted' | 'failed' | 'dismissed'
export type Reel = {
  id: string
  title: string
  caption: string
  key: string
  /** Igani-branded cover image (Instagram uses it as the reel's cover) */
  coverKey?: string
  /** where the cover frame sits in the video, for TikTok's cover */
  coverMs?: number
  /** a short summary of the story (for new cover art) */
  story?: string
  /** the file name on the Mac, in finals/ */
  file?: string
  coverVersion?: number
  status: ReelStatus
  createdAt: number
  containerId?: string
  permalink?: string | null
  error?: string | null
  decidedBy?: string
  decidedAt?: number
  /** TikTok direct post, independent of Instagram */
  tiktok?: { status: 'processing' | 'posted' | 'failed'; publishId: string; privacy: string; postId?: string | null; error?: string | null }
}
const KEY = 'reels.queue'

export async function listReels(): Promise<Reel[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: KEY } })
  return ((row?.value as unknown as Reel[]) ?? []).slice().sort((a, b) => b.createdAt - a.createdAt)
}
async function write(list: Reel[]): Promise<void> {
  const v = list.slice(0, 60) as unknown as Prisma.InputJsonValue
  await prisma.siteSetting.upsert({ where: { key: KEY }, create: { key: KEY, value: v }, update: { value: v } })
}
export async function getReel(id: string): Promise<Reel | null> {
  return (await listReels()).find((r) => r.id === id) ?? null
}
export async function addReel(title: string, caption: string, coverMs?: number, extra: { story?: string; file?: string } = {}): Promise<Reel> {
  const id = randomBytes(8).toString('hex')
  const reel: Reel = { id, title: title.slice(0, 120), caption: caption.slice(0, 2200), key: `reels/${id}.mp4`, coverKey: `reels/${id}-cover.jpg`, coverMs: coverMs && coverMs > 0 ? Math.round(coverMs) : undefined, story: extra.story?.slice(0, 1200), file: extra.file?.slice(0, 200), status: 'uploading', createdAt: Date.now() }
  await write([reel, ...(await listReels())])
  return reel
}
export async function updateReel(id: string, patch: Partial<Reel>): Promise<Reel | null> {
  const list = await listReels()
  const i = list.findIndex((r) => r.id === id)
  if (i < 0) return null
  list[i] = { ...list[i]!, ...patch }
  await write(list)
  return list[i]!
}

// ---- a signed, short-lived link to the reel on our own domain (TikTok pulls videos only from verified domains) ----
const sig = (id: string, exp: number): string => createHmac('sha256', `reels:${env().NEXTAUTH_SECRET}`).update(`${id}.${exp}`).digest('base64url')
export function reelFileUrl(id: string, ttlSeconds = 3600): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  return appUrl(`/api/public/reels/file/${id}?exp=${exp}&sig=${sig(id, exp)}`)
}
export function reelFileSigOk(id: string, exp: string | null, given: string | null): boolean {
  const e = Number(exp)
  if (!given || !Number.isFinite(e) || e < Date.now() / 1000) return false
  const a = Buffer.from(given), b = Buffer.from(sig(id, e))
  return a.length === b.length && timingSafeEqual(a, b)
}

// ---- requests from the Reels page to the reel maker on the Mac (it checks every couple of minutes) ----
export type ReelRequest = { id: string; kind: 'reel' | 'cover'; reelId?: string; topic?: string; requestedBy: string; at: number; state: 'queued' | 'working' | 'done' | 'failed'; message?: string | null; doneAt?: number }
export type ReelWorker = { lastSeen: number | null; state: 'idle' | 'working'; message: string | null; since: number | null }
const REQ = 'reels.requests'
const WORKER = 'reels.worker'

export async function listRequests(): Promise<ReelRequest[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: REQ } })
  return ((row?.value as unknown as ReelRequest[]) ?? []).slice().sort((a, b) => b.at - a.at)
}
async function writeRequests(list: ReelRequest[]): Promise<void> {
  const v = list.slice(0, 40) as unknown as Prisma.InputJsonValue
  await prisma.siteSetting.upsert({ where: { key: REQ }, create: { key: REQ, value: v }, update: { value: v } })
}
export async function addRequest(r: Omit<ReelRequest, 'id' | 'at' | 'state'>): Promise<ReelRequest> {
  const req: ReelRequest = { ...r, id: randomBytes(6).toString('hex'), at: Date.now(), state: 'queued' }
  await writeRequests([req, ...(await listRequests())])
  return req
}
/** The oldest queued request, marked as being worked on. */
export async function takeRequest(): Promise<ReelRequest | null> {
  const list = await listRequests()
  const next = list.filter((r) => r.state === 'queued').sort((a, b) => a.at - b.at)[0]
  if (!next) return null
  next.state = 'working'
  await writeRequests(list)
  return next
}
export async function finishRequest(id: string, ok: boolean, message: string | null): Promise<void> {
  const list = await listRequests()
  const r = list.find((x) => x.id === id)
  if (!r) return
  r.state = ok ? 'done' : 'failed'
  r.message = message?.slice(0, 300) ?? null
  r.doneAt = Date.now()
  await writeRequests(list)
}
export async function getWorker(): Promise<ReelWorker> {
  const row = await prisma.siteSetting.findUnique({ where: { key: WORKER } })
  return (row?.value as unknown as ReelWorker) ?? { lastSeen: null, state: 'idle', message: null, since: null }
}
export async function setWorker(patch: Partial<ReelWorker>): Promise<void> {
  const cur = await getWorker()
  const next = { ...cur, ...patch, lastSeen: Date.now() }
  if (patch.state && patch.state !== cur.state) next.since = Date.now()
  const v = next as unknown as Prisma.InputJsonValue
  await prisma.siteSetting.upsert({ where: { key: WORKER }, create: { key: WORKER, value: v }, update: { value: v } })
}
