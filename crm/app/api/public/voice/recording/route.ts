import { after } from 'next/server'
import { analyzeCall } from '@/lib/call-analysis'
import { prisma } from '@/lib/prisma'
import { readTwilioWebhook } from '@/lib/twilio'

export const dynamic = 'force-dynamic'
// the analysis (download, transcription, AI) runs after the response, within this function's time
export const maxDuration = 300

/** Twilio finished (or skipped) the recording. We keep only the reference; step 3 sends it to CallMap. */
export async function POST(req: Request): Promise<Response> {
  const p = await readTwilioWebhook(req, 'recording')
  if (!p) return new Response('Forbidden', { status: 403 })
  const callId = new URL(req.url).searchParams.get('callId')
  // a personal call is never recorded; if a recording shows up anyway, it is not kept or analysed
  if (callId && (await prisma.call.findUnique({ where: { id: callId }, select: { private: true } }))?.private) return new Response('ok')
  if (callId && /^RE[0-9a-f]{32}$/i.test(p.RecordingSid ?? '')) {
    const sec = Number.parseInt(p.RecordingDuration ?? '', 10)
    await prisma.call.updateMany({
      where: { id: callId, OR: [{ recordingSid: null }, { recordingSid: p.RecordingSid }] },
      data: { recordingSid: p.RecordingSid, recordingStatus: (p.RecordingStatus ?? 'completed').slice(0, 20), recordingSec: Number.isFinite(sec) ? sec : null, analysisStatus: p.RecordingStatus === 'completed' ? 'pending' : null },
    })
    // Answer Twilio right away; transcribe and analyse straight after (the hourly job retries if this fails)
    if (p.RecordingStatus === 'completed') {
      const run = (): Promise<void> => analyzeCall(callId).then(() => undefined).catch(() => undefined)
      try {
        after(run)
      } catch {
        void run() // outside a request scope (e.g. tests): start it directly; the hourly job retries if it doesn't finish
      }
    }
  } else if (callId && p.RecordingStatus === 'absent') {
    await prisma.call.updateMany({ where: { id: callId, recordingSid: null }, data: { recordingStatus: 'absent' } })
  }
  return new Response(null, { status: 204 })
}
