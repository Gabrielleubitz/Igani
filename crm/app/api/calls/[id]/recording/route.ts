import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { ensureRecordingSid, fetchRecordingAudio } from '@/lib/call-recording'
import { safeFileName } from '@/lib/call-download'
import { relationToCall } from '@/lib/call-access-db'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** Streams a call's recording: only to the person who made the call and to admins. Supports seeking (Range). */
export async function GET(req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const call = await prisma.call.findUnique({ where: { id }, select: { id: true, userId: true, startedAt: true, lead: { select: { firstName: true, lastName: true, company: true } } } })
  if (!call || !(await relationToCall(user, call))) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const sid = await ensureRecordingSid(id)
  if (!sid) return NextResponse.json({ error: 'No recording for this call' }, { status: 404 })
  const download = new URL(req.url).searchParams.get('download') === '1'
  // A saved copy: the whole file as an attachment (no seeking), named by date and person.
  if (download) {
    const full = await fetchRecordingAudio(sid, null)
    if (!full?.body) return NextResponse.json({ error: 'The recording is not available right now' }, { status: 502 })
    const who = call.lead ? [call.lead.firstName, call.lead.lastName].filter(Boolean).join(' ') || call.lead.company : null
    const name = safeFileName([call.startedAt.toISOString().slice(0, 10), who], 'mp3')
    return new Response(full.body, { status: 200, headers: { 'content-type': 'audio/mpeg', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } })
  }
  const range = req.headers.get('range')
  const audio = await fetchRecordingAudio(sid, range)
  if (!audio?.body) return NextResponse.json({ error: 'The recording is not available right now' }, { status: 502 })
  const headers = new Headers({ 'content-type': 'audio/mpeg', 'cache-control': 'private, no-store', 'accept-ranges': 'bytes', 'x-content-type-options': 'nosniff' })
  // Twilio ignores Range, but browsers need it to seek (jumping to a moment in the transcript): slice it here
  const m = range?.match(/^bytes=(\d+)-(\d*)$/)
  if (m && audio.status === 200) {
    const buf = new Uint8Array(await audio.arrayBuffer())
    const start = Number(m[1])
    const end = Math.min(m[2] ? Number(m[2]) : buf.length - 1, buf.length - 1)
    if (start >= buf.length || start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${buf.length}` } })
    headers.set('content-range', `bytes ${start}-${end}/${buf.length}`)
    headers.set('content-length', String(end - start + 1))
    return new Response(buf.slice(start, end + 1), { status: 206, headers })
  }
  for (const h of ['content-length', 'content-range']) {
    const v = audio.headers.get(h)
    if (v) headers.set(h, v)
  }
  return new Response(audio.body, { status: audio.status === 206 ? 206 : 200, headers })
}
