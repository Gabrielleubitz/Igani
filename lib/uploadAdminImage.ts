import { compressImageForUpload } from '@/lib/compressImageForUpload'

const SERVER_MAX_HINT = 3.5 * 1024 * 1024

/**
 * Upload admin image: prefer direct Cloudinary from the browser (no Vercel body limit),
 * else POST to /api/admin/upload with optional compression for large files.
 */
export async function uploadAdminImage(file: File): Promise<string> {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET

  if (cloud && preset) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('upload_preset', preset)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
      method: 'POST',
      body: fd,
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        typeof data.error === 'object' && data.error?.message
          ? String(data.error.message)
          : typeof data.error === 'string'
            ? data.error
            : 'Cloudinary upload failed'
      throw new Error(msg)
    }
    if (!data.secure_url) {
      throw new Error('Upload failed: no URL returned')
    }
    return data.secure_url as string
  }

  let toSend = file
  if (file.size > SERVER_MAX_HINT) {
    toSend = await compressImageForUpload(file, SERVER_MAX_HINT)
  }
  if (toSend.size > SERVER_MAX_HINT && file.type === 'image/gif') {
    throw new Error(
      'GIF is too large for server upload. Add NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for direct uploads, or use a smaller file / paste a URL.'
    )
  }

  const formData = new FormData()
  formData.append('file', toSend)
  const res = await fetch('/api/admin/upload', {
    method: 'POST',
    body: formData,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 413) {
    throw new Error(
      'File too large for the server (hosting limit ~4.5 MB). Use a smaller image, paste an image URL, or set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME and NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET for direct Cloudinary uploads.'
    )
  }
  if (!res.ok) {
    throw new Error(typeof data.error === 'string' ? data.error : 'Upload failed')
  }
  if (!data.url) {
    throw new Error('Upload failed: no URL returned')
  }
  return data.url as string
}
