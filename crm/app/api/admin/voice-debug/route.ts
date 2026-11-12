import { NextResponse } from 'next/server'
import { currentUserOrNull } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { twilioClient, twilioConfig } from '@/lib/twilio'

export const dynamic = 'force-dynamic'

/** Admins: what Twilio says about the latest calls (legs, alerts), for diagnosing calls that don't connect. */
export async function GET(req: Request): Promise<NextResponse> {
  const user = await currentUserOrNull()
  if (user?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const c = twilioConfig()
  if (!c) return NextResponse.json({ error: 'Twilio not configured' }, { status: 503 })
  const client = twilioClient(c)
  const n = Math.min(5, Number(new URL(req.url).searchParams.get('n') ?? 3) || 3)
  const calls = await prisma.call.findMany({ where: { simulated: false, direction: 'OUTBOUND' }, orderBy: { startedAt: 'desc' }, take: n })
  const mask = (s: string | null | undefined): string => (s ? s.replace(/\d{4}$/, '****') : '')
  const leg = async (sid: string | null) => {
    if (!sid) return null
    try {
      const k = await client.calls(sid).fetch()
      return { sid: k.sid, status: k.status, direction: k.direction, from: mask(k.from), to: mask(k.to), duration: k.duration, start: k.startTime, end: k.endTime, answeredBy: k.answeredBy }
    } catch (e) {
      return { sid, error: e instanceof Error ? e.message : String(e) }
    }
  }
  const out = []
  for (const call of calls) {
    // child legs Twilio made from the rep's leg (direct calls)
    const children = call.twilioCallSid ? await client.calls.list({ parentCallSid: call.twilioCallSid, limit: 3 }).catch(() => []) : []
    out.push({
      id: call.id,
      at: call.startedAt,
      status: call.status,
      listenStreamSid: call.listenStreamSid,
      to: mask(call.toNumber),
      repLeg: await leg(call.twilioCallSid),
      clientLeg: await leg(call.childCallSid),
      childrenOfRepLeg: children.map((k) => ({ sid: k.sid, status: k.status, to: mask(k.to), duration: k.duration })),
    })
  }
  const alerts = await client.monitor.v1.alerts
    .list({ startDate: new Date(Date.now() - 48 * 3600_000), limit: 15 })
    .then((a) => a.map((x) => ({ at: x.dateCreated, code: x.errorCode, level: x.logLevel, url: x.requestUrl?.replace(/callId=[^&]+/, 'callId=…'), text: (x.alertText ?? '').slice(0, 300) })))
    .catch((e: unknown) => [{ error: e instanceof Error ? e.message : String(e) }])
  return NextResponse.json({ calls: out, alerts }, { headers: { 'cache-control': 'no-store' } })
}
