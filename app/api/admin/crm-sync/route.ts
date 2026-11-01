/**
 * POST /api/admin/crm-sync?collection=all|leads|contact&cursor=N
 * Copies existing site leads (`leads`) and contact-form submissions (`contactSubmissions`) into the Igani CRM,
 * tagged with where each one came from. Safe to repeat: the CRM matches by email/phone, keeps the original
 * submission date, and imports quietly (no alert emails, no auto-assignment).
 *
 * Works in batches (BATCH per call) so it never hits serverless time limits; the admin button loops on `next`.
 * Auth: header `x-admin-password` must equal the server-only ADMIN_PASSWORD env var (never bundled to the browser).
 */
import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { crmConfigured, crmLeadFromContactSubmission, crmLeadFromSiteLead, forwardLeadToCrm, type CrmLead } from '@/lib/crm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BATCH = 40

function authorised(req: NextRequest): 'ok' | 'unset' | 'denied' {
  const want = process.env.ADMIN_PASSWORD || ''
  if (!want) return 'unset'
  const got = req.headers.get('x-admin-password') ?? ''
  return got.length === want.length && timingSafeEqual(Buffer.from(got), Buffer.from(want)) ? 'ok' : 'denied'
}

function deny(state: 'unset' | 'denied'): NextResponse {
  return state === 'unset'
    ? NextResponse.json({ error: 'Set a server-only ADMIN_PASSWORD environment variable on the site to enable CRM sync.' }, { status: 503 })
    : NextResponse.json({ error: 'Wrong admin password.' }, { status: 401 })
}

async function loadAll(which: string): Promise<CrmLead[]> {
  const items: CrmLead[] = []
  if (which === 'all' || which === 'leads') {
    const snap = await getDocs(collection(db, 'leads'))
    snap.forEach((d) => items.push(crmLeadFromSiteLead(d.data())))
  }
  if (which === 'all' || which === 'contact') {
    const snap = await getDocs(collection(db, 'contactSubmissions'))
    snap.forEach((d) => items.push(crmLeadFromContactSubmission(d.data())))
  }
  // Oldest first (undated last), so when someone submitted several times the CRM keeps their first source.
  return items.sort((a, b) => (a.submittedAt ?? '9999').localeCompare(b.submittedAt ?? '9999'))
}

export async function GET(req: NextRequest) {
  const auth = authorised(req)
  if (auth !== 'ok') return deny(auth)
  return NextResponse.json({ configured: crmConfigured() })
}

export async function POST(req: NextRequest) {
  const auth = authorised(req)
  if (auth !== 'ok') return deny(auth)
  if (!crmConfigured()) {
    return NextResponse.json({ error: 'CRM is not connected. Set CRM_LEAD_WEBHOOK_URL and CRM_LEAD_WEBHOOK_SECRET in the site’s environment variables.' }, { status: 400 })
  }
  const params = new URL(req.url).searchParams
  const which = ['all', 'leads', 'contact'].includes(params.get('collection') ?? '') ? params.get('collection')! : 'all'
  const cursor = Math.max(0, Number.parseInt(params.get('cursor') ?? '0', 10) || 0)

  const all = await loadAll(which)
  const batch = all.slice(cursor, cursor + BATCH)
  const totals = { created: 0, alreadyInCrm: 0, skipped: 0, failed: 0 }
  // Sequential on purpose: keeps duplicate matching deterministic and is gentle on the CRM.
  for (const lead of batch) {
    const res = await forwardLeadToCrm({ ...lead, backfill: true })
    if (res.ok) res.duplicate ? totals.alreadyInCrm++ : totals.created++
    else if ('skipped' in res) totals.skipped++
    else totals.failed++
  }
  const next = cursor + batch.length
  return NextResponse.json({ ...totals, total: all.length, processed: next, next: next < all.length ? next : null })
}
