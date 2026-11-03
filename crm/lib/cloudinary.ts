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
