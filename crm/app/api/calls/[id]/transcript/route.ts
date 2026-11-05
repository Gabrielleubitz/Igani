import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { asTranscript } from '@/lib/call-analysis'
import { safeFileName, transcriptText } from '@/lib/call-download'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/** The call's transcript as a text file: only to the person who made the call and to admins. */
export async function GET(_req: Request, props: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await props.params
  const user = await currentUserOrNull()
  if (!user) return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 })
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const call = await prisma.call.findUnique({
    where: { id },
    select: { userId: true, startedAt: true, transcript: true, lead: { select: { firstName: true, lastName: true, company: true } }, user: { select: { name: true } } },
  })
  if (!call || (user.role !== 'ADMIN' && call.userId !== user.id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const lines = asTranscript(call.transcript)
  if (!lines.length) return NextResponse.json({ error: 'No transcript for this call' }, { status: 404 })
  const who = call.lead ? [call.lead.firstName, call.lead.lastName].filter(Boolean).join(' ') || call.lead.company || null : null
  const rep = call.user?.name?.split(' ')[0] ?? 'Rep'
  const text = transcriptText(lines, { title: 'Call transcript', when: call.startedAt.toISOString().slice(0, 16).replace('T', ' ') + ' UTC', rep, who })
  const name = safeFileName([call.startedAt.toISOString().slice(0, 10), who, 'transcript'], 'txt')
  return new Response(text, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } })
}
