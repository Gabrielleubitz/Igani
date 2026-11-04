import 'server-only'
import { randomBytes } from 'node:crypto'
import { del, get } from '@vercel/blob'
import type { Prisma } from '@prisma/client'
import { prisma } from './prisma'
import { VIDEO_PREFIX, parseVideo, videoKey, type VideoRecord } from './video-core'

const json = (v: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue

export async function listVideos(): Promise<VideoRecord[]> {
  const rows = await prisma.siteSetting.findMany({ where: { key: { startsWith: VIDEO_PREFIX } } })
  return rows
    .map((r) => parseVideo(r.key.slice(VIDEO_PREFIX.length), r.value))
    .filter((v): v is VideoRecord => v !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getVideo(id: string): Promise<VideoRecord | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: videoKey(id) } })
  return row ? parseVideo(id, row.value) : null
}

export async function saveVideo(v: Omit<VideoRecord, 'id' | 'createdAt'>): Promise<VideoRecord> {
  const id = randomBytes(9).toString('base64url')
  const rec: VideoRecord = { ...v, id, createdAt: new Date().toISOString() }
  const { id: _id, ...value } = rec
  await prisma.siteSetting.create({ data: { key: videoKey(id), value: json(value) } })
  return rec
}

export async function updateVideo(id: string, patch: Partial<Pick<VideoRecord, 'title' | 'visibility' | 'offerId'>>): Promise<void> {
  const cur = await getVideo(id)
  if (!cur) return
  const { id: _id, ...value } = { ...cur, ...patch }
  await prisma.siteSetting.update({ where: { key: videoKey(id) }, data: { value: json(value) } })
}

export async function deleteVideo(id: string): Promise<void> {
  const cur = await getVideo(id)
  if (!cur) return
  await del(cur.pathname).catch(() => undefined)
  await prisma.siteSetting.deleteMany({ where: { key: videoKey(id) } })
}

/** Videos attached to one offer (used by the offer page). */
export async function offerVideos(offerId: string): Promise<VideoRecord[]> {
  return (await listVideos()).filter((v) => v.visibility === 'offer' && v.offerId === offerId)
}

/** Opens the private blob (optionally a byte range) as a stream. */
export async function openVideo(pathname: string, range: { start: number; end: number } | null): ReturnType<typeof get> {
  return get(pathname, { access: 'private', headers: range ? { Range: `bytes=${range.start}-${range.end}` } : undefined })
}
