import { NextResponse } from 'next/server'
import { playUrl } from '@/lib/video'
import { PLAY_LINK_SECONDS } from '@/lib/video-access-core'
import { authorizeVideo } from '@/lib/video-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * One access check per play: returns a direct, private, 30-minute link to the video file. The player then streams straight from the
 * bucket, so the many small range requests a video makes don't each go through a server function and database (which made it buffer).
 * Same rules as the stream route. The player asks again for a fresh link if it expires or errors.
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const auth = await authorizeVideo(id, new URL(req.url).searchParams.get('o'))
  const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status, headers })
  try {
    return NextResponse.json({ url: await playUrl(auth.video.pathname, auth.video.contentType, PLAY_LINK_SECONDS), expiresIn: PLAY_LINK_SECONDS }, { headers })
  } catch {
    return NextResponse.json({ error: 'Video storage is not connected' }, { status: 503, headers })
  }
}
