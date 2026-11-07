import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { canManageMeet } from '@/lib/meet-access'
import { meetRecordingUrl } from '@/lib/cloudinary'
import { recordingState } from '@/lib/meet-recording'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** The meeting's host or an admin: sends the browser to a signed link for the recording (play, or ?download=1 to save it). */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  const { id } = await props.params
  const rec = await prisma.meetRecording.findUnique({ where: { id: id.slice(0, 40) }, select: { status: true, publicId: true, sourceUrl: true, sourceUntil: true, startedAt: true, createdAt: true, room: { select: { title: true, hostId: true } } } })
  // Same answer for "no such recording" and "not yours", so ids can't be probed
  if (!rec || !canManageMeet(user, rec.room)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const state = recordingState(rec)
  const download = new URL(req.url).searchParams.get('download') === '1'
  const day = (rec.startedAt ?? rec.createdAt).toISOString().slice(0, 10)
  const target = state === 'saved' && rec.publicId ? meetRecordingUrl(rec.publicId, download ? { download: `Igani Meet ${rec.room.title} ${day}` } : {}) : state === 'temporary' || state === 'processing' ? rec.sourceUrl : null
  if (!target) return NextResponse.json({ error: 'This recording has expired.' }, { status: 410 })
  const res = NextResponse.redirect(target, 302)
  res.headers.set('Cache-Control', 'private, no-store')
  return res
}
