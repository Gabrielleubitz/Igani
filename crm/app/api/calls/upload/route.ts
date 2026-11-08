import { NextResponse } from 'next/server'
import { logActivity } from '@/lib/audit'
import { currentUserOrNull } from '@/lib/auth'
import { analyzeUploadedCall } from '@/lib/call-analysis'
import { pastCallDate, pastCallFileError } from '@/lib/past-call'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const maxDuration = 300

/**
 * An admin adds a past call (such as a training call) by uploading its audio. The call is added to the chosen person's calls and
 * reviewed like a live one. The audio is not stored: only the transcript and the review are saved.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (!user || user.role !== 'ADMIN') return NextResponse.json({ error: 'Admins only' }, { status: 403 })
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'Call reviews are not set up (no OpenAI key).' }, { status: 503 })
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const personId = form?.get('personId')
  if (!(file instanceof File) || typeof personId !== 'string' || !personId) return NextResponse.json({ error: 'Choose a person and a file.' }, { status: 400 })
  const fileError = pastCallFileError(file)
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 })
  const dateRaw = form?.get('date')
  const when = pastCallDate(typeof dateRaw === 'string' ? dateRaw : null)
  if (!when) return NextResponse.json({ error: 'That date is not valid (it can’t be in the future).' }, { status: 400 })
  const person = await prisma.user.findFirst({ where: { id: personId, role: { in: ['ADMIN', 'SALES'] } }, select: { id: true, name: true } })
  if (!person) return NextResponse.json({ error: 'Person not found.' }, { status: 404 })

  const call = await prisma.call.create({
    data: {
      userId: person.id,
      direction: 'OUTBOUND',
      status: 'COMPLETED',
      fromNumber: 'training',
      toNumber: 'training',
      startedAt: when,
      answeredAt: when,
      endedAt: when,
      notes: 'Training call (added by an admin from an audio file)',
      analysisStatus: 'pending',
    },
    select: { id: true },
  })
  const result = await analyzeUploadedCall(call.id, file)
  await logActivity({ entityType: 'USER', entityId: person.id, actorId: user.id, action: 'call.uploaded', metadata: { callId: call.id, result } })
  if (result === 'none') return NextResponse.json({ error: 'Call reviews are not set up.' }, { status: 503 })
  return NextResponse.json({ ok: result === 'ready', id: call.id, ...(result === 'failed' ? { error: 'The call was added but the review failed. Open it to retry.' } : {}) })
}
