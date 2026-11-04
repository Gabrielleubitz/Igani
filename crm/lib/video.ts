import 'server-only'
import { randomBytes } from 'node:crypto'
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { Prisma } from '@prisma/client'
import { env } from './env'
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
  await removeObject(cur.pathname).catch(() => undefined)
  await prisma.siteSetting.deleteMany({ where: { key: videoKey(id) } })
}

/** Videos attached to one offer (used by the offer page). */
export async function offerVideos(offerId: string): Promise<VideoRecord[]> {
  return (await listVideos()).filter((v) => v.visibility === 'offer' && v.offerId === offerId)
}

// ─── Cloudflare R2 (S3-compatible private bucket) ───────────────────────────

export class StorageNotConfigured extends Error {
  constructor() {
    super('Video storage is not connected yet (Cloudflare R2 variables are missing).')
  }
}

let client: S3Client | undefined
function r2(): { s3: S3Client; bucket: string } {
  const e = env()
  if (!e.R2_ACCOUNT_ID || !e.R2_ACCESS_KEY_ID || !e.R2_SECRET_ACCESS_KEY || !e.R2_BUCKET) throw new StorageNotConfigured()
  client ??= new S3Client({ region: 'auto', endpoint: `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID, secretAccessKey: e.R2_SECRET_ACCESS_KEY } })
  return { s3: client, bucket: e.R2_BUCKET }
}

export const storageConfigured = (): boolean => {
  const e = env()
  return Boolean(e.R2_ACCOUNT_ID && e.R2_ACCESS_KEY_ID && e.R2_SECRET_ACCESS_KEY && e.R2_BUCKET)
}

/** A one-time link the admin's browser uses to upload one file straight to the private bucket (valid 15 minutes). */
export async function uploadUrl(key: string, contentType: string): Promise<string> {
  const { s3, bucket } = r2()
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }), { expiresIn: 900 })
}

/** Size and type of an uploaded object, or null if it is not there. */
export async function objectInfo(key: string): Promise<{ size: number; contentType: string } | null> {
  const { s3, bucket } = r2()
  const h = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key })).catch(() => null)
  return h ? { size: h.ContentLength ?? 0, contentType: h.ContentType ?? 'video/mp4' } : null
}

export async function removeObject(key: string): Promise<void> {
  const { s3, bucket } = r2()
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

/** A short-lived (5 minutes) direct link to the file, issued only after the access check. */
export async function playUrl(key: string, contentType: string): Promise<string> {
  const { s3, bucket } = r2()
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key, ResponseContentType: contentType, ResponseContentDisposition: 'inline' }), { expiresIn: 300 })
}
