import 'server-only'
import { commissionStatus } from './commission'
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

/** Won deals whose client payment is in: the rows the Payouts page groups. Cancelled commissions (after termination) are left out. */
export async function loadPayoutRows(): Promise<PayoutRow[]> {
  const leads = await prisma.lead.findMany({
    where: { status: 'WON', commissionTotal: { not: null }, finalPaymentReceivedAt: { not: null } },
    select: { id: true, firstName: true, lastName: true, email: true, company: true, commissionTotal: true, finalPaymentReceivedAt: true, finalPaidAt: true, refundedAt: true, assignedTo: { select: { name: true, email: true } } },
  })
  const emails = [...new Set(leads.map((l) => l.assignedTo?.email?.toLowerCase()).filter((e): e is string => !!e))]
  const [terms, allowed] = await Promise.all([
    latestTermsByEmail(emails),
    prisma.allowedUser.findMany({ where: { email: { in: emails } }, select: { email: true, terminatedAt: true } }),
  ])
  const ended = new Map(allowed.map((a) => [a.email.toLowerCase(), a.terminatedAt]))
  const rows: PayoutRow[] = []
  for (const l of leads) {
    const email = l.assignedTo?.email?.toLowerCase() ?? null
    const s = commissionStatus({ commissionTotal: l.commissionTotal, finalPaymentReceivedAt: l.finalPaymentReceivedAt, finalPaidAt: l.finalPaidAt, refundedAt: l.refundedAt, terminatedAt: email ? ended.get(email) ?? null : null })
    if (s.voided) continue
    const t = email ? terms.get(email) : undefined
    rows.push({
      leadId: l.id,
      lead: l.company || [l.firstName, l.lastName].filter(Boolean).join(' ') || l.email || 'Deal',
      salesperson: l.assignedTo?.name ?? l.assignedTo?.email ?? 'Unassigned',
      email,
      amount: l.commissionTotal ?? 0,
      receivedAt: l.finalPaymentReceivedAt,
      paidAt: l.finalPaidAt,
      refundedAt: l.refundedAt,
      payoutDays: t?.payoutDays ?? null,
      clawbackDays: t?.clawbackDays ?? null,
    })
  }
  return rows
}
