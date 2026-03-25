/**
 * Shrinks large images in the browser so POST /api/admin/upload stays under
 * hosting body limits (e.g. Vercel ~4.5 MB). Skips GIF (animation) and non-images.
 */
export async function compressImageForUpload(
  file: File,
  maxBytes = 3.5 * 1024 * 1024
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif') {
    return file
  }
  if (file.size <= maxBytes) {
    return file
  }

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const maxDim = 2560
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(file)
        return
      }
      ctx.drawImage(img, 0, 0, width, height)

      const tryQuality = (q: number) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const base = file.name.replace(/\.[^.]+$/, '') || 'image'
            const out = new File([blob], `${base}.jpg`, { type: 'image/jpeg' })
            if (out.size <= maxBytes || q <= 0.5) {
              resolve(out.size <= maxBytes ? out : file)
              return
            }
            tryQuality(q - 0.08)
          },
          'image/jpeg',
          q
        )
      }
      tryQuality(0.88)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}
