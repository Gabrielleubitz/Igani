import { Readable } from 'stream'
import { v2 as cloudinary } from 'cloudinary'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  })
}

export const cloudinaryConfigured = !!(cloudName && apiKey && apiSecret)

export interface CloudinaryUploadResult {
  secure_url: string
  public_id: string
}

/**
 * Upload a file buffer to Cloudinary (images or video).
 * Uses folder `igani/help` and resource_type `auto` so images and videos are accepted.
 * Returns the secure URL. If Cloudinary is not configured, returns null.
 */
export async function uploadToCloudinary(
  buffer: Buffer,
  options: {
    folder?: string
    publicId?: string
    resourceType?: 'image' | 'video' | 'raw' | 'auto'
    originalFilename?: string
  } = {}
): Promise<CloudinaryUploadResult | null> {
  if (!cloudinaryConfigured) {
    console.warn('Cloudinary: missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET')
    return null
  }

  const { folder = 'igani/help', resourceType = 'auto', publicId } = options

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      folder,
      resource_type: resourceType
    }
    if (publicId) uploadOptions.public_id = publicId

    const writeStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (err, result) => {
        if (err) {
          reject(err)
          return
        }
        if (!result || !result.secure_url) {
          reject(new Error('Cloudinary upload returned no URL'))
          return
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id ?? ''
        })
      }
    )

    const readable = Readable.from(buffer)
    readable.on('error', reject)
    writeStream.on('error', reject)
    readable.pipe(writeStream)
  })
}
