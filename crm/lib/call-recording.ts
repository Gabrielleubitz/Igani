import 'server-only'
import twilio from 'twilio'
import { prisma } from './prisma'
import { twilioConfig } from './twilio'

/**
 * Call recordings stay on Twilio. The CRM streams them through an authenticated route (owner or admin only) using its
 * own API key; there is never a public link. If our recording callback was missed, the recording is looked up on
 * Twilio by the call's own legs and remembered.
 */

const RE = /^RE[0-9a-f]{32}$/i

/** The recording's SID for a call, looking it up on Twilio (and storing it) if our callback never arrived. */
export async function ensureRecordingSid(callId: string): Promise<string | null> {
  const call = await prisma.call.findUnique({ where: { id: callId }, select: { recordingSid: true, twilioCallSid: true, childCallSid: true, simulated: true } })
  if (!call || call.simulated) return null
  if (call.recordingSid && RE.test(call.recordingSid)) return call.recordingSid
  const c = twilioConfig()
  if (!c || !call.twilioCallSid) return null
  try {
    const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
    for (const sid of [call.twilioCallSid, call.childCallSid].filter((x): x is string => Boolean(x))) {
      const recs = await client.recordings.list({ callSid: sid, limit: 5 })
      const done = recs.find((r) => r.status === 'completed') ?? recs[0]
      if (done && RE.test(done.sid)) {
        const sec = Number.parseInt(String(done.duration ?? ''), 10)
        await prisma.call.updateMany({
          where: { id: callId, recordingSid: null },
          data: { recordingSid: done.sid, recordingStatus: done.status, recordingSec: Number.isFinite(sec) ? sec : null, analysisStatus: done.status === 'completed' ? 'pending' : null },
        })
        return done.sid
      }
    }
  } catch (err) {
    console.error('[recording] lookup failed', callId, err instanceof Error ? err.message : err)
  }
  return null
}

/** Fetches the recording audio from Twilio (MP3), passing a Range header through for seeking. */
export async function fetchRecordingAudio(recordingSid: string, range?: string | null): Promise<Response | null> {
  const c = twilioConfig()
  if (!c || !RE.test(recordingSid)) return null
  const url = `https://api.twilio.com/2010-04-01/Accounts/${c.accountSid}/Recordings/${recordingSid}.mp3`
  const auth = Buffer.from(`${c.apiKeySid}:${c.apiKeySecret}`).toString('base64')
  const res = await fetch(url, { headers: { authorization: `Basic ${auth}`, ...(range ? { range } : {}) }, redirect: 'follow', cache: 'no-store' })
  return res.ok || res.status === 206 ? res : null
}
