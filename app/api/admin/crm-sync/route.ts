/**
 * POST /api/admin/crm-sync
 * Copies every existing site lead (`leads`) and contact-form submission (`contactSubmissions`) into the Igani CRM,
 * tagged with where each one came from. Safe to run any number of times: the CRM matches by email/phone,
 * keeps the original submission date, and imports quietly (no alert emails, no auto-assignment).
 *
 * Auth: header `x-admin-password` must equal ADMIN_PASSWORD (server-only) or, if unset, NEXT_PUBLIC_ADMIN_PASSWORD
 * — the same password the /admin screen asks for.
 * GET returns whether the CRM connection is configured.
 */
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { crmConfigured, crmLeadFromContactSubmission, crmLeadFromSiteLead, forwardLeadToCrm, type CrmLead } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

function authorised(req: NextRequest): boolean {
  const want = process.env.ADMIN_PASSWORD || process.env.NEXT_PUBLIC_ADMIN_PASSWORD || ''
  const got = req.headers.get('x-admin-password') ?? ''
  if (!want || got.length !== want.length) return false
  return timingSafeEqual(Buffer.from(got), Buffer.from(want))
}

export async function GET(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ configured: crmConfigured() })
}

export async function POST(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!crmConfigured()) {
    return NextResponse.json({ error: 'CRM is not connected. Set CRM_LEAD_WEBHOOK_URL and CRM_LEAD_WEBHOOK_SECRET in the site’s environment variables.' }, { status: 400 })
  }
  const which = new URL(req.url).searchParams.get('collection') ?? 'all'

  const items: { from: string; lead: CrmLead }[] = []
  if (which === 'all' || which === 'leads') {
    const snap = await getDocs(collection(db, 'leads'))
    snap.forEach((d) => items.push({ from: 'leads', lead: crmLeadFromSiteLead(d.data()) }))
  }
  if (which === 'all' || which === 'contact') {
    const snap = await getDocs(collection(db, 'contactSubmissions'))
    snap.forEach((d) => items.push({ from: 'contact', lead: crmLeadFromContactSubmission(d.data()) }))
  }
  // Oldest first, so when the same person submitted several times the CRM keeps their first source.
  items.sort((a, b) => (a.lead.submittedAt ?? '').localeCompare(b.lead.submittedAt ?? ''))

  const totals = { total: items.length, created: 0, alreadyInCrm: 0, skipped: 0, failed: 0 }
  const errors: string[] = []
  // Sequential on purpose: keeps duplicate matching deterministic and is gentle on the CRM.
  for (const { lead } of items) {
    const res = await forwardLeadToCrm({ ...lead, backfill: true })
    if (res.ok) res.duplicate ? totals.alreadyInCrm++ : totals.created++
    else if ('skipped' in res) totals.skipped++
    else {
      totals.failed++
      if (errors.length < 5) errors.push(`${lead.email ?? lead.phone ?? 'unknown'}: ${res.error}`)
    }
  }
  return NextResponse.json({ ...totals, errors })
}
