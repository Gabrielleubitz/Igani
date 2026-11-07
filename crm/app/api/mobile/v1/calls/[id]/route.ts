import { STEPS, asAnalysis, asTranscript } from '@/lib/call-analysis'
import { relationToCall } from '@/lib/call-access-db'
import { buildScore } from '@/lib/call-score'
import { CALL_STATUS_LABEL } from '@/lib/call-ui'
import { CALL_OUTCOMES } from '@/lib/calls'
import { appUrl } from '@/lib/env'
import { leadName } from '@/lib/format'
import { fail, json, mobileUser } from '@/lib/mobile'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const STEP_LABEL: Record<(typeof STEPS)[number], string> = { rapport: 'Rapport', intelligence: 'Questions', control: 'Control', threeTens: 'Three tens', looping: 'Looping', closing: 'Closing', ethics: 'Ethics' }

/** One call for the app: who, how it went, the recording, the score and coaching, and the transcript. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const user = await mobileUser()
  if (user instanceof Response) return user
  const { id } = await ctx.params
  if (!/^[a-z0-9]{20,40}$/i.test(id)) return fail('Not found.', 404)
  const call = await prisma.call.findUnique({ where: { id }, include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, company: true } }, prospect: { select: { name: true } }, user: { select: { name: true, email: true } } } })
  if (!call) return fail('Not found.', 404)
  const relation = await relationToCall(user, call)
  if (!relation) return fail('Not found.', 404)
  const a = asAnalysis(call.analysis)
  const number = call.direction === 'INBOUND' ? call.fromNumber : call.toNumber
  const recorded = Boolean(call.recordingSid) || (Boolean(call.twilioCallSid) && call.status === 'COMPLETED' && !call.simulated && (call.durationSec ?? 0) > 0)
  const score = a?.isSalesCall ? buildScore(a) : null
  return json({
    id: call.id,
    leadId: call.lead?.id ?? null,
    name: call.lead ? leadName(call.lead) : (call.prospect?.name ?? formatPhone(number)),
    company: call.lead?.company ?? null,
    number: formatPhone(number),
    dial: number,
    direction: call.direction,
    status: call.status,
    statusLabel: CALL_STATUS_LABEL[call.status] ?? call.status,
    outcome: call.outcome,
    outcomeLabel: call.outcome ? (CALL_OUTCOMES[call.outcome as keyof typeof CALL_OUTCOMES] ?? call.outcome) : null,
    notes: call.notes,
    startedAt: call.startedAt,
    durationSec: call.durationSec,
    by: call.user?.name ?? call.user?.email ?? null,
    shared: relation === 'shared',
    recording: recorded ? appUrl(`/api/calls/${call.id}/recording`) : null,
    analysis: call.analysisStatus,
    canAnalyze: recorded && (user.role === 'ADMIN' || call.userId === user.id),
    review: a
      ? {
          sales: a.isSalesCall,
          type: a.callType,
          summary: a.summary,
          verdict: a.straightLine?.verdict ?? null,
          sentiment: a.sentiment,
          nextStep: a.nextStep,
          score: score ? { total: score.total, capped: score.capped, parts: score.parts.map((p) => ({ key: p.key, label: p.label, score: p.score, why: p.why })), lift: score.lift?.label ?? null } : null,
          talkRatioRep: a.talkRatioRep,
          questions: a.questionsAsked,
          strengths: a.strengths,
          improvements: a.improvements,
          needs: a.clientNeeds,
          objections: a.objections.map((o) => ({ objection: o.objection, response: o.response, handledWell: o.handledWell, better: o.better })),
          actions: a.actionItems,
          moments: a.moments.map((m) => ({ at: m.at, step: m.step ? STEP_LABEL[m.step] : null, clientSaid: m.clientSaid, repSaid: m.repSaid, better: m.better, why: m.why })),
          skills: a.straightLine ? Object.entries(a.straightLine.scores).flatMap(([k, v]) => (v == null ? [] : [{ key: k, label: STEP_LABEL[k as (typeof STEPS)[number]] ?? k, score: v, why: a.straightLine?.why?.[k] ?? null }])) : [],
          focus: (a.focus ?? []).map((f) => ({ skill: f.skill, why: f.why, drill: f.drill, sayThis: f.sayThis })),
        }
      : null,
    transcript: asTranscript(call.transcript).map((l) => ({ at: l.start, speaker: l.speaker, text: l.text })),
  })
}
