import { prisma } from '@/lib/prisma'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Twilio finished (or skipped) the recording. We keep only the reference; step 3 sends it to CallMap. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'recording')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  if (callId && /^RE[0-9a-f]{32}$/i.test(p.RecordingSid ?? '')) {
    const sec = Number.parseInt(p.RecordingDuration ?? '', 10)
    await prisma.call.updateMany({
      where: { id: callId, OR: [{ recordingSid: null }, { recordingSid: p.RecordingSid }] },
      data: { recordingSid: p.RecordingSid, recordingStatus: (p.RecordingStatus ?? 'completed').slice(0, 20), recordingSec: Number.isFinite(sec) ? sec : null, analysisStatus: p.RecordingStatus === 'completed' ? 'pending' : null },
    })
  } else if (callId && p.RecordingStatus === 'absent') {
    await prisma.call.updateMany({ where: { id: callId, recordingSid: null }, data: { recordingStatus: 'absent' } })
  }
  return new Response(null, { status: 204 })
}
