import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { clientIp } from '@/lib/sales-contract-http'
import { getVideo } from '@/lib/video'
import { isVideoId } from '@/lib/video-core'
import { needsAck } from '@/lib/video-ack-core'
import { recordAck } from '@/lib/video-ack'

export const runtime = 'nodejs'

/** A teammate confirms the confidentiality notice for one internal video. The confirmation is stored and unlocks that video for a few hours. */
export async function POST(req: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const { id } = await props.params
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Sign in' }, { status: 401 })
  if (!isVideoId(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const video = await getVideo(id)
  if (!video || !needsAck(user.role, video.visibility)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await recordAck(user.id, id, clientIp(req), req.headers.get('user-agent') ?? 'unknown')
  return NextResponse.json({ ok: true })
}
