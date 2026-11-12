'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { asAnalysis } from '@/lib/call-analysis'
import { coachFrom, type CoachCard } from '@/lib/call-coach'
import { buildScore } from '@/lib/call-score'
import { leadName } from '@/lib/format'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { reviewState, type ReviewStateName } from '@/lib/review-status'
import { toActionError, type ActionResult } from './result'

export interface CoachStatus {
  state: ReviewStateName
  willRetry?: boolean
  message?: string
  /** only when the review is ready and the viewer's own */
  card?: CoachCard
  /** who the call was with, for the heading */
  name: string
}

/**
 * Where the review of one of MY calls stands, and (once ready) the short coaching card. Read-only: it never starts,
 * retries or changes an analysis. Anyone else's call (an admin included), a private or a simulated call answers
 * "none", the same as a call that doesn't exist.
 */
export async function coachStatus(callId: string): Promise<ActionResult<CoachStatus>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const id = z.string().cuid().parse(callId)
    const call = await prisma.call.findFirst({
      where: { id, userId: user.id, private: false, simulated: false },
      select: {
        userId: true,
        private: true,
        simulated: true,
        toNumber: true,
        direction: true,
        fromNumber: true,
        startedAt: true,
        endedAt: true,
        answeredAt: true,
        durationSec: true,
        recordingSec: true,
        recordingStatus: true,
        analysisStatus: true,
        analysisError: true,
        analysisAttempts: true,
        lead: { select: { firstName: true, lastName: true, email: true, phone: true, company: true } },
        prospect: { select: { name: true } },
      },
    })
    if (!call) return { ok: true, data: { state: 'none', name: '' } }
    const name = call.lead ? leadName(call.lead) : (call.prospect?.name ?? formatPhone(call.direction === 'INBOUND' ? call.fromNumber : call.toNumber))
    // the analysis JSON is read only for a ready review of my own call
    let analysis: ReturnType<typeof asAnalysis> = null
    if (call.analysisStatus === 'ready') {
      const row = await prisma.call.findUnique({ where: { id }, select: { analysis: true } })
      analysis = asAnalysis(row?.analysis ?? null)
    }
    const s = reviewState(call, user.id, new Date(), analysis !== null)
    const data: CoachStatus = { state: s.state, name, ...(s.willRetry !== undefined ? { willRetry: s.willRetry } : {}), ...(s.message ? { message: s.message } : {}) }
    if (s.state === 'ready' && analysis) data.card = coachFrom(analysis, analysis.isSalesCall ? buildScore(analysis) : { total: 0 })
    return { ok: true, data }
  } catch (err) {
    return toActionError(err)
  }
}
