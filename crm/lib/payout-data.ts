import 'server-only'
import { paymentCutoff } from './commission'
import type { PayoutRow } from './payouts'
import { prisma } from './prisma'

interface Accepted { payoutDays: number | null; clawbackDays: number | null }

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Each representative's latest signed agreement: the payout and clawback days they actually agreed to. */
export async function latestTermsByEmail(emails: string[]): Promise<Map<string, Accepted>> {
  const rows = await prisma.agreementAcceptance.findMany({ where: { email: { in: emails } }, orderBy: { signedAt: 'desc' }, select: { email: true, terms: true } })
  const out = new Map<string, Accepted>()
  for (const r of rows) {
    if (out.has(r.email)) continue
    const t = ((r.terms as { terms?: Record<string, unknown> } | null)?.terms ?? {}) as Record<string, unknown>
    out.set(r.email, { payoutDays: num(t.payoutDays), clawbackDays: num(t.clawbackDays) })
  }
  return out
}

/**
 * The rows the Payouts page groups: one per client payment (its commission, which includes that payment's share of the bonus).
 * Commissions cancelled by the agreement ending are left out.
 */
export async function loadPayoutRows(): Promise<PayoutRow[]> {
  const leads = await prisma.lead.findMany({
    where: { status: 'WON', commissionTotal: { not: null }, payments: { some: {} } },
    select: {
      id: true, firstName: true, lastName: true, email: true, company: true, commissionTotal: true, commissionSnapshot: true,
      finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true,
      payments: { select: { id: true, commission: true, receivedAt: true, commissionPaidAt: true, refundedAt: true }, orderBy: { createdAt: 'asc' } },
      assignedTo: { select: { name: true, email: true } },
    },
  })
  const emails = [...new Set(leads.map((l) => l.assignedTo?.email?.toLowerCase()).filter((e): e is string => !!e))]
  const [terms, allowed] = await Promise.all([
    latestTermsByEmail(emails),
    prisma.allowedUser.findMany({ where: { email: { in: emails } }, select: { email: true, terminatedAt: true, endedForCause: true } }),
  ])
  const ended = new Map(allowed.map((a) => [a.email.toLowerCase(), { at: a.terminatedAt, forCause: a.endedForCause }]))
  const rows: PayoutRow[] = []
  for (const l of leads) {
    const email = l.assignedTo?.email?.toLowerCase() ?? null
    const e = email ? ended.get(email) : undefined
    const endedAt = paymentCutoff(e?.at, e?.forCause, l.commissionSnapshot)
    const t = email ? terms.get(email) : undefined
    const name = l.company || [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || 'Deal'
    const person = l.assignedTo?.name ?? l.assignedTo?.email ?? 'Unassigned'
    const common = { leadId: l.id, lead: name, salesperson: person, email, payoutDays: t?.payoutDays ?? null, clawbackDays: t?.clawbackDays ?? null }
    const cancelled = (receivedAt: Date, paidAt: Date | null): boolean => !!endedAt && receivedAt > endedAt && !paidAt
    for (const p of l.payments) {
      if (p.commission <= 0 || cancelled(p.receivedAt, p.commissionPaidAt)) continue
      rows.push({ ...common, paymentId: p.id, label: 'Payment', amount: p.commission, receivedAt: p.receivedAt, paidAt: p.commissionPaidAt, refundedAt: p.refundedAt ?? l.refundedAt })
    }
  }
  return rows
}

