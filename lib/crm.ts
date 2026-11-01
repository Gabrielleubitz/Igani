/**
 * Igani CRM bridge (app.igani.co). Every lead form on the site forwards here, tagged with where it came from.
 * Configure with CRM_LEAD_WEBHOOK_URL (https://app.igani.co/api/v1/leads) and CRM_LEAD_WEBHOOK_SECRET.
 * Always best effort: a CRM outage never breaks a visitor's form.
 */

export interface CrmLead {
  email?: string
  firstName?: string
  lastName?: string
  phone?: string
  company?: string
  message?: string
  budget?: string
  /** Channel shown in the CRM's "Came from", e.g. "Website contact form", "Landing page" */
  source: string
  /** Page / form / campaign, e.g. "/realestate · call_back" */
  sourceDetail?: string
  utm?: { source?: string; medium?: string; campaign?: string; term?: string; content?: string }
  /** Original submission time (ISO); used when backfilling old leads */
  submittedAt?: string
  /** Historical import: the CRM skips alerts and auto-assignment */
  backfill?: boolean
}

export type CrmResult = { ok: true; id: string; duplicate: boolean } | { ok: false; status?: number; error: string } | { ok: false; skipped: true; error: string }

export function crmConfigured(): boolean {
  return Boolean(process.env.CRM_LEAD_WEBHOOK_URL && process.env.CRM_LEAD_WEBHOOK_SECRET)
}

const clean = (v: unknown, max = 500): string | undefined => {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s.slice(0, max) : undefined
}

/**
 * Conservative email check, close to what the CRM (zod) accepts, so a typo'd email is dropped
 * instead of making the CRM reject the whole lead (a valid phone still gets through).
 */
export function isValidEmail(email: string): boolean {
  return /^(?!\.)(?!.*\.\.)[A-Za-z0-9._%+'-]+(?<!\.)@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,}$/.test(email)
}

function splitName(name: string | undefined): { firstName?: string; lastName?: string } {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') || undefined }
}

/** Send one lead to the CRM. Never throws. */
export async function forwardLeadToCrm(lead: CrmLead, timeoutMs = 5000): Promise<CrmResult> {
  const url = process.env.CRM_LEAD_WEBHOOK_URL
  const key = process.env.CRM_LEAD_WEBHOOK_SECRET
  if (!url || !key) return { ok: false, skipped: true, error: 'CRM not configured' }
  const rawEmail = clean(lead.email, 254)?.toLowerCase().replace(/\.+$/, '')
  const email = rawEmail && isValidEmail(rawEmail) ? rawEmail : undefined
  const phone = clean(lead.phone, 40)
  if (!email && !phone) {
    console.warn('[crm] lead not forwarded: no valid email or phone', { source: lead.source, hadEmail: Boolean(rawEmail) })
    return { ok: false, skipped: true, error: 'No valid email or phone' }
  }
  const body = {
    email,
    phone,
    firstName: clean(lead.firstName, 100),
    lastName: clean(lead.lastName, 100),
    company: clean(lead.company, 200),
    message: clean(lead.message, 5000),
    budget: clean(lead.budget, 100),
    source: clean(lead.source, 100) ?? 'Website',
    sourceDetail: clean(lead.sourceDetail, 300),
    utm: lead.utm ? Object.fromEntries(Object.entries(lead.utm).map(([k, v]) => [k, clean(v, 200)]).filter(([, v]) => v)) : undefined,
    submittedAt: lead.submittedAt,
    backfill: lead.backfill || undefined,
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
    const data = (await res.json().catch(() => ({}))) as { id?: string; duplicate?: boolean; error?: string }
    if (!res.ok || !data.id) {
      console.error('[crm] lead webhook failed', res.status, data.error)
      return { ok: false, status: res.status, error: data.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, id: data.id, duplicate: Boolean(data.duplicate) }
  } catch (err) {
    console.error('[crm] lead webhook error', err)
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' }
  }
}

const toIso = (v: unknown): string | undefined => {
  if (!v) return undefined
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate: () => Date }).toDate().toISOString()
  const d = new Date(v as string)
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/** A /contact (or funnel) submission from the `contactSubmissions` collection. */
export function crmLeadFromContactSubmission(doc: Record<string, unknown>): CrmLead {
  const message = clean(doc.message, 5000)
  const projectType = clean(doc.projectType, 100)
  const isFunnel = typeof message === 'string' && message.startsWith('[Funnel Lead')
  const phoneInMessage = message?.match(/^Phone:\s*(.+)$/m)?.[1]
  return {
    email: clean(doc.email),
    firstName: clean(doc.firstName),
    lastName: clean(doc.lastName),
    phone: clean(doc.phone) ?? clean(phoneInMessage),
    message: projectType && !isFunnel ? `${projectType}: ${message ?? ''}` : message,
    source: isFunnel ? 'Landing page' : 'Website contact form',
    sourceDetail: isFunnel ? `Funnel form${projectType ? ` · ${projectType}` : ''}` : `${clean(doc.page, 100) ?? 'Contact form'}${projectType ? ` · ${projectType}` : ''}`,
    // contactSubmissions store the time as `submittedAt` (a Firestore Timestamp)
    submittedAt: toIso(doc.submittedAt ?? doc.createdAt),
  }
}

/** A landing-page / main-site lead from the `leads` collection (POST /api/leads). */
export function crmLeadFromSiteLead(doc: Record<string, unknown>): CrmLead {
  const d = (doc.sourceDetails ?? {}) as Record<string, unknown>
  const page = clean(d.page, 100)
  const form = clean(d.form, 100)
  return {
    ...splitName(clean(doc.name, 200)),
    email: clean(doc.email),
    phone: clean(doc.phone),
    message: clean(doc.message, 5000),
    source: doc.source === 'landing_page' ? 'Landing page' : 'Website',
    // `campaign` here is our own page label (e.g. real_estate), not an ad UTM, so it goes in the detail line.
    sourceDetail: [page, form, clean(d.campaign, 100)].filter(Boolean).join(' · ') || undefined,
    utm: { source: clean(d.utm_source, 200), campaign: clean(d.utm_campaign, 200) },
    submittedAt: toIso(doc.createdAt),
  }
}
