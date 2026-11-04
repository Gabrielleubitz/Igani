/**
 * "Everything we can find" about a business on a call list: Google's listing (phone, site, hours, rating) plus what
 * its own website publishes (other phones, emails, WhatsApp, social pages) and, read by AI from the site's text, the
 * people it names with their roles. AI output is checked against the site: a phone or email it returns must actually
 * appear there, so nothing is invented.
 */
import 'server-only'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { formatPhone, toE164 } from './phone-numbers'
import { prisma } from './prisma'
import { scanSite, type SiteFindings } from './site-scan'

export interface ProspectContact {
  name: string
  role: string | null
  phone: string | null
  email: string | null
}

export interface ProspectDetails {
  hours?: string[] | null
  phones?: string[]
  emails?: string[]
  whatsapp?: string[]
  socials?: { kind: string; url: string }[]
  contacts?: ProspectContact[]
  summary?: string | null
  services?: string[]
  pages?: string[]
}

const DetailsSchema = z
  .object({
    hours: z.array(z.string()).nullish(),
    phones: z.array(z.string()).optional(),
    emails: z.array(z.string()).optional(),
    whatsapp: z.array(z.string()).optional(),
    socials: z.array(z.object({ kind: z.string(), url: z.string() })).optional(),
    contacts: z.array(z.object({ name: z.string(), role: z.string().nullable(), phone: z.string().nullable(), email: z.string().nullable() })).optional(),
    summary: z.string().nullish(),
    services: z.array(z.string()).optional(),
    pages: z.array(z.string()).optional(),
  })
  .passthrough()

export function asDetails(v: Prisma.JsonValue | null | undefined): ProspectDetails {
  const r = DetailsSchema.safeParse(v ?? {})
  return r.success ? (r.data as ProspectDetails) : {}
}

/** Who to ask for when calling: the first named person (with role). */
export function askFor(d: ProspectDetails): string | null {
  const c = d.contacts?.[0]
  return c ? `${c.name}${c.role ? ` (${c.role})` : ''}` : null
}

const AI_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'services', 'contacts'],
  properties: {
    summary: { type: ['string', 'null'], description: 'One or two sentences: what the business does, for whom, where. Same language as the site.' },
    services: { type: 'array', items: { type: 'string' }, description: 'Up to 6 main services or products, short.' },
    contacts: {
      type: 'array',
      description: 'People the site names (owner, manager, agents, staff). Only people explicitly named on the pages. Owner / decision makers first.',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'role', 'phone', 'email'],
        properties: {
          name: { type: 'string' },
          role: { type: ['string', 'null'] },
          phone: { type: ['string', 'null'], description: 'Only if the page shows this person’s number next to their name' },
          email: { type: ['string', 'null'], description: 'Only if the page shows this person’s email next to their name' },
        },
      },
    },
  },
} as const

const AI_PROMPT = `You read the text of a small business's website and extract facts for a salesperson who is about to call them.
Rules: only use what the text says. Never guess names, roles, phones or emails. If no person is named, return an empty
contacts list. Skip testimonials / client names (people who reviewed the business are not staff). Keep the site's language.`

async function aiRead(name: string, text: string): Promise<{ summary: string | null; services: string[]; contacts: ProspectContact[] } | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key || text.length < 80) return null
  const model = process.env.OPENAI_ENRICH_MODEL || process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0 }),
      response_format: { type: 'json_schema', json_schema: { name: 'business_facts', strict: true, schema: AI_SCHEMA } },
      messages: [
        { role: 'system', content: AI_PROMPT },
        { role: 'user', content: `Business: ${name}\n\nWebsite text:\n${text}` },
      ],
    }),
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) throw new Error(`AI read failed (${res.status})`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { summary?: unknown; services?: unknown; contacts?: unknown }
  const contacts = Array.isArray(raw.contacts) ? (raw.contacts as Record<string, unknown>[]) : []
  return {
    summary: typeof raw.summary === 'string' ? raw.summary.slice(0, 400) : null,
    services: Array.isArray(raw.services) ? raw.services.filter((s): s is string => typeof s === 'string').map((s) => s.slice(0, 60)).slice(0, 6) : [],
    contacts: contacts
      .map((c) => ({ name: String(c.name ?? '').trim().slice(0, 80), role: typeof c.role === 'string' && c.role.trim() ? c.role.trim().slice(0, 60) : null, phone: typeof c.phone === 'string' ? c.phone : null, email: typeof c.email === 'string' ? c.email : null }))
      .filter((c) => c.name.length >= 2)
      .slice(0, 10),
  }
}

/** AI answers are only kept when the site really shows them. */
export function verifyContacts(contacts: ProspectContact[], site: SiteFindings): ProspectContact[] {
  const digits = site.text.replace(/\D/g, '')
  const emails = new Set(site.emails)
  const lower = site.text.toLowerCase()
  return contacts
    .filter((c) => lower.includes(c.name.toLowerCase().split(/\s+/)[0]!))
    .map((c) => {
      const e164 = c.phone ? toE164(c.phone) : null
      const national = e164?.startsWith('+972') ? `0${e164.slice(4)}` : e164?.slice(1)
      const phoneOk = e164 && (site.phones.includes(e164) || (national && digits.includes(national.replace(/\D/g, ''))))
      const email = c.email?.toLowerCase().trim() ?? null
      return { ...c, phone: phoneOk ? e164 : null, email: email && (emails.has(email) || lower.includes(email)) ? email : null }
    })
}

/** Look the business up on its website and store what we found. Safe to call twice (only one run claims it). */
export async function enrichProspect(prospectId: string): Promise<void> {
  const claimed = await prisma.prospect.updateMany({
    where: { id: prospectId, OR: [{ enrichStatus: null }, { enrichStatus: { in: ['pending', 'failed'] } }, { enrichStatus: 'processing', updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }] },
    data: { enrichStatus: 'processing' },
  })
  if (!claimed.count) return
  const p = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId }, select: { name: true, phone: true, website: true, details: true } })
  const base = asDetails(p.details)
  if (!p.website) {
    await prisma.prospect.update({ where: { id: prospectId }, data: { enrichStatus: 'none', enrichedAt: new Date() } })
    return
  }
  try {
    const site = await scanSite(p.website)
    if (!site) {
      await prisma.prospect.update({ where: { id: prospectId }, data: { enrichStatus: 'failed', enrichedAt: new Date() } })
      return
    }
    const main = toE164(p.phone)
    const ai = await aiRead(p.name, site.text).catch((err: unknown) => {
      console.error('[prospect-details] AI read failed', prospectId, err instanceof Error ? err.message : err)
      return null
    })
    const details: ProspectDetails = {
      ...base,
      phones: site.phones.filter((x) => x !== main),
      emails: site.emails,
      whatsapp: site.whatsapp,
      socials: site.socials,
      contacts: ai ? verifyContacts(ai.contacts, site) : [],
      summary: ai?.summary ?? null,
      services: ai?.services ?? [],
      pages: site.pages,
    }
    await prisma.prospect.update({ where: { id: prospectId }, data: { details: details as Prisma.InputJsonValue, enrichStatus: 'done', enrichedAt: new Date() } })
  } catch (err) {
    console.error('[prospect-details] failed', prospectId, err instanceof Error ? err.message : err)
    await prisma.prospect.update({ where: { id: prospectId }, data: { enrichStatus: 'failed', enrichedAt: new Date() } })
  }
}

/** Work through waiting prospects, a few at a time, until the time budget runs out. */
export async function enrichPending(opts: { ids?: string[]; limit?: number; budgetMs?: number } = {}): Promise<number> {
  const until = Date.now() + (opts.budgetMs ?? 200_000)
  const rows = await prisma.prospect.findMany({
    where: { ...(opts.ids ? { id: { in: opts.ids } } : {}), OR: [{ enrichStatus: 'pending' }, { enrichStatus: 'processing', updatedAt: { lt: new Date(Date.now() - 10 * 60_000) } }] },
    orderBy: { createdAt: 'asc' },
    take: opts.limit ?? 60,
    select: { id: true },
  })
  let done = 0
  const queue = rows.map((r) => r.id)
  const worker = async (): Promise<void> => {
    while (queue.length && Date.now() < until) {
      await enrichProspect(queue.shift()!)
      done++
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return done
}

/** Every number we have for it, main first, formatted for display. */
export function allPhones(main: string, d: ProspectDetails): { e164: string; display: string; label: string | null }[] {
  const out: { e164: string; display: string; label: string | null }[] = []
  const seen = new Set<string>()
  const add = (raw: string | null | undefined, label: string | null): void => {
    const e = raw ? toE164(raw) : null
    if (!e || seen.has(e)) return
    seen.add(e)
    out.push({ e164: e, display: formatPhone(e), label })
  }
  add(main, 'Google')
  for (const c of d.contacts ?? []) add(c.phone, c.name)
  for (const w of d.whatsapp ?? []) add(w, 'WhatsApp')
  for (const ph of d.phones ?? []) add(ph, null)
  return out
}
