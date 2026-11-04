import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getVideo, openVideo } from '@/lib/video'
import { canWatch, isVideoId, parseRange, sliceStream } from '@/lib/video-core'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Plays a private video. Allowed: signed-in teammates (team videos), admins (all), and visitors of the live offer the video
 * belongs to (?o=<offer slug>). The file never has a public address; this route streams it from the private store with Range support.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const deny = (): NextResponse => NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!isVideoId(id)) return deny()
  const video = await getVideo(id)
  if (!video) return deny()
  const slug = new URL(req.url).searchParams.get('o')
  const [viewer, offer] = await Promise.all([
    currentUserOrNull(),
    slug && video.visibility === 'offer' ? prisma.offer.findUnique({ where: { slug }, select: { id: true, status: true } }) : null,
  ])
  if (!canWatch(video, viewer, offer)) return deny()

  const range = parseRange(req.headers.get('range'), video.size)
  if (range === 'invalid') return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${video.size}` } })
  const res = await openVideo(video.pathname, range)
  if (!res || !res.stream) return deny()
  const headers: Record<string, string> = {
    'Content-Type': video.contentType,
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  }
  if (range) {
    // If the store ignored the Range header and sent the whole file, cut the requested bytes out ourselves
    const upstreamRanged = Boolean(res.headers.get('content-range'))
    const body = upstreamRanged ? res.stream : sliceStream(res.stream, range.start, range.end)
    headers['Content-Range'] = `bytes ${range.start}-${range.end}/${video.size}`
    headers['Content-Length'] = String(range.end - range.start + 1)
    return new Response(body, { status: 206, headers })
  }
  headers['Content-Length'] = String(video.size)
  return new Response(res.stream, { status: 200, headers })
}
