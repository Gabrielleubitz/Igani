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
