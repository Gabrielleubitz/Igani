import { NextResponse } from 'next/server'
import { playUrl } from '@/lib/video'
import { authorizeVideo } from '@/lib/video-access'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Plays a private video. Allowed: signed-in teammates (team videos), admins (all), and visitors of the live offer the video
 * belongs to (?o=<offer slug>). Anyone else gets 404. When allowed we redirect to a 5-minute signed link straight to the private
 * bucket, so the file is never public, never passes through our server (no function bandwidth) and seeking works natively.
 * (The web players use /api/videos/<id>/link instead, so only one access check runs per play. This route stays for the mobile app and old links.)
 */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const auth = await authorizeVideo(id, new URL(req.url).searchParams.get('o'))
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status })
  try {
    return NextResponse.redirect(await playUrl(auth.video.pathname, auth.video.contentType), { status: 302, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
  } catch {
    return NextResponse.json({ error: 'Video storage is not connected' }, { status: 503 })
  }
}
