import 'server-only'
import { v2 as cloudinary } from 'cloudinary'

/** Offer contracts (PDF) live in Cloudinary. Same account and env names as the marketing site. */
export function cloudinaryConfigured(): boolean {
  return Boolean(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
}

function client(): typeof cloudinary {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  return cloudinary
}

/**
 * Uploads a PDF as a "raw" file: Cloudinary serves raw files as-is, so a PDF opens in the browser
 * without the account's "allow PDF delivery" switch (which only applies to image-type uploads).
 */
export async function uploadContractPdf(buffer: Buffer, publicId: string): Promise<{ url: string; publicId: string }> {
  if (!cloudinaryConfigured()) throw new Error('Cloudinary is not set up for the CRM (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).')
  const res = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
    client()
      .uploader.upload_stream({ resource_type: 'raw', public_id: publicId, overwrite: true, folder: 'igani/offers' }, (err, out) => (err || !out ? reject(err ?? new Error('Upload failed')) : resolve(out)))
      .end(buffer)
  })
  return { url: res.secure_url, publicId: res.public_id }
}

/** Only files from our own Cloudinary account may be fetched server-side (the signing step reads the contract back). */
export function isOwnCloudinaryUrl(url: string): boolean {
  try {
    const u = new URL(url)
    const cloud = process.env.CLOUDINARY_CLOUD_NAME
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && !!cloud && u.pathname.startsWith(`/${cloud}/`)
  } catch {
    return false
  }
}

/**
 * The contract's bytes, through Cloudinary's authenticated download API. Public delivery of PDFs is blocked on many
 * accounts ("deny or ACL failure"), so we never rely on the public URL: the server signs a short-lived download.
 */
export async function downloadContract(publicId: string): Promise<Uint8Array> {
  if (!cloudinaryConfigured()) throw new Error('Cloudinary is not set up for the CRM.')
  const url = client().utils.private_download_url(publicId, '', { resource_type: 'raw', type: 'upload', expires_at: Math.floor(Date.now() / 1000) + 300 })
  const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Cloudinary download failed (${res.status} ${res.headers.get('x-cld-error') ?? ''})`.trim())
  const buf = new Uint8Array(await res.arrayBuffer())
  if (buf.byteLength > 20 * 1024 * 1024) throw new Error('The contract is too large.')
  return buf
}

/**
 * Igani Meet recordings: Cloudinary fetches the file straight from 8x8's short-lived link (nothing passes through our
 * server) and keeps it private ("authenticated"), so it can only be opened through a signed link the CRM hands to admins.
 */
export async function copyMeetRecording(sourceUrl: string, name: string): Promise<{ publicId: string; bytes: number }> {
  if (!cloudinaryConfigured()) throw new Error('Cloudinary is not set up for the CRM.')
  const res = await client().uploader.upload(sourceUrl, { resource_type: 'video', type: 'authenticated', folder: 'igani/meet', public_id: name, overwrite: true, timeout: 280_000 })
  return { publicId: res.public_id, bytes: res.bytes }
}

/** A signed link to play (or, with download, save) a stored recording. */
export function meetRecordingUrl(publicId: string, opts: { download?: string } = {}): string {
  return client().url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format: 'mp4',
    ...(opts.download ? { flags: `attachment:${opts.download.replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80) || 'igani-meet'}` } : {}),
  })
}

export async function deleteMeetRecording(publicId: string): Promise<void> {
  if (!cloudinaryConfigured()) return
  await client().uploader.destroy(publicId, { resource_type: 'video', type: 'authenticated', invalidate: true })
}

/**
 * Team chat files are private ("authenticated"): this signs a short-lived link for someone allowed to see them.
 * Images get a smaller preview when `thumb` is set; anything else downloads under its own name.
 */
export function chatFileLink(f: { publicId: string; rt?: string; format?: string | null; kind: 'image' | 'file'; name: string }, opts: { thumb?: boolean } = {}): string {
  const resourceType = (f.rt as 'image' | 'raw' | 'video' | undefined) ?? (f.kind === 'image' ? 'image' : 'raw')
  if (f.kind === 'image' && resourceType === 'image') {
    return client().url(f.publicId, {
      resource_type: 'image',
      type: 'authenticated',
      sign_url: true,
      secure: true,
      ...(f.format ? { format: f.format } : {}),
      ...(opts.thumb ? { transformation: [{ width: 640, height: 640, crop: 'limit', quality: 'auto', fetch_format: 'auto' }] } : {}),
    })
  }
  return client().utils.private_download_url(f.publicId, resourceType === 'raw' ? '' : (f.format ?? ''), { resource_type: resourceType, type: 'authenticated', attachment: true, expires_at: Math.floor(Date.now() / 1000) + 600 })
}
