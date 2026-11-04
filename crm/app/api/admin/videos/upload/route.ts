import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { listVideos } from '@/lib/video'
import { MAX_VIDEO_BYTES, VIDEO_TYPES, usedBytes } from '@/lib/video-core'

export const runtime = 'nodejs'

/** Admin only: issues a short-lived token so the browser can upload one video straight to the private store. */
export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  const body = (await req.json().catch(() => null)) as HandleUploadBody | null
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('videos/')) throw new Error('Invalid path')
        const used = usedBytes(await listVideos())
        return { allowedContentTypes: [...VIDEO_TYPES], maximumSizeInBytes: Math.min(MAX_VIDEO_BYTES, 1024 ** 3 - used), addRandomSuffix: true }
      },
      onUploadCompleted: async () => undefined,
    })
    return NextResponse.json(json)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 })
  }
}
