import 'server-only'
import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import { logActivity } from './audit'
import { chat, type TranscriptLine } from './call-analysis'
import { prisma } from './prisma'
import { auditSite, normalizeSiteUrl } from './site-audit'

/**
 * What a call teaches us about the client. After each call's review, the AI reads the transcript once more for facts
 * (who answered, their company, website, what they need, budget, a booked time, next steps). They are saved on the
 * call, merged into a profile on the lead, and used to fill the lead's empty fields (never overwriting what's there).
 * A website we learn about is checked (platform, e.g. WordPress, and its version).
 */

const S = (max: number) => z.string().nullable().transform((s) => (s ? s.trim().slice(0, max) || null : null))
const L = (n: number, len = 200) => z.array(z.string()).transform((a) => a.map((x) => x.trim().slice(0, len)).filter(Boolean).slice(0, n))

export const CallIntel = z.object({
  person: z.object({ firstName: S(60), lastName: S(80), role: S(80), email: S(160), otherPhone: S(40) }),
  company: z.object({ name: S(120), industry: S(80), location: S(120), size: S(60), website: S(200), socials: L(5, 200) }),
  site: z.object({ platform: S(60), notes: S(300) }),
  needs: L(8),
  pains: L(8),
  budget: S(120),
  timeline: S(120),
  decisionMaker: S(160),
  competitors: L(6, 120),
  meeting: z.object({
    booked: z.boolean(),
    /** local time in the rep's zone, "YYYY-MM-DDTHH:mm" */
    when: z.string().nullable().transform((s) => (s && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s.trim()) ? s.trim() : null)),
    durationMin: z.number().nullable().transform((n) => (n && n > 0 ? Math.min(480, Math.round(n)) : null)),
    kind: z.enum(['phone', 'video', 'in_person', 'unspecified']),
    topic: S(160),
    quote: S(240),
  }),
  actionItems: z
    .array(z.object({ text: S(200), owner: z.enum(['rep', 'client']), due: z.string().nullable(), kind: z.enum(['call', 'email', 'send', 'meeting', 'task']) }))
    .transform((a) => a.filter((x) => x.text).slice(0, 8).map((x) => ({ ...x, text: x.text!, due: x.due && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/.test(x.due.trim()) ? x.due.trim() : null }))),
  facts: z.array(z.object({ label: S(60), value: S(240), quote: S(240) })).transform((a) => a.filter((f) => f.label && f.value).slice(0, 10)),
})
export type CallIntel = z.infer<typeof CallIntel>

const str = { type: ['string', 'null'] }
const list = { type: 'array', items: { type: 'string' } }
const obj = (properties: Record<string, unknown>) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties })
const SCHEMA = obj({
  person: obj({ firstName: str, lastName: str, role: str, email: str, otherPhone: str }),
  company: obj({ name: str, industry: str, location: str, size: str, website: str, socials: list }),
  site: obj({ platform: str, notes: str }),
  needs: list,
  pains: list,
  budget: str,
  timeline: str,
  decisionMaker: str,
  competitors: list,
  meeting: obj({ booked: { type: 'boolean' }, when: str, durationMin: { type: ['number', 'null'] }, kind: { type: 'string', enum: ['phone', 'video', 'in_person', 'unspecified'] }, topic: str, quote: str }),
  actionItems: { type: 'array', items: obj({ text: { type: 'string' }, owner: { type: 'string', enum: ['rep', 'client'] }, due: str, kind: { type: 'string', enum: ['call', 'email', 'send', 'meeting', 'task'] } }) },
  facts: { type: 'array', items: obj({ label: { type: 'string' }, value: { type: 'string' }, quote: str }) },
})

const PROMPT = `You read a sales call transcript (Igani builds websites, apps and systems for businesses) and pull out facts about the CLIENT, to fill their CRM profile.

Rules:
- Only what was actually said on the call (or is unmistakable). Never guess or invent. Unknown = null or [].
- Names exactly as said. If the client said their name in Hebrew, write it in Hebrew. Split first and last name.
- "role": their job or position ("owner", "marketing manager").
- company.website: a domain if one was said ("bloomstudio.co.il"); spell-out like "bloom studio dot co dot il" becomes "bloomstudio.co.il". Not a guess from the company name.
- site.platform: what their CURRENT website runs on if mentioned (WordPress, Wix, Shopify, "no website", "custom"). site.notes: what they said about the site (slow, old, hacked, built by a nephew…).
- needs: what they want built or fixed. pains: problems they described. Short phrases, in the call's language.
- budget / timeline / decisionMaker: as they put it ("around 15k", "before Passover", "my partner Avi decides").
- competitors: other agencies, freelancers or tools they mentioned.
- meeting: booked=true only if both sides agreed on a specific time for a next meeting or call. "when" is that time as local "YYYY-MM-DDTHH:mm", resolved from the call's date given below ("tomorrow at 10" → the date after the call, 10:00). If only a day was agreed, use 10:00 and say so in topic. kind: phone / video (Zoom, Meet) / in_person / unspecified. quote: the words that set it.
- actionItems: concrete next steps for either side ("Send the proposal by Thursday", "Client sends logo files"). due as "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" if a date was said, else null. kind: call / email / send / meeting / task. Write them in the language of the review instructions below.
- facts: anything else useful to remember (number of branches, they sell abroad, they used us before, kids' names they mentioned for rapport…), each with a short quote.
- If this was a voicemail, fill what the caller said about themselves.`

/** Reads one call's transcript for client facts. */
export async function extractIntel(key: string, lines: TranscriptLine[], ctx: { startedAt: Date; timeZone: string; reviewIn: 'he' | 'en'; known: string }): Promise<CallIntel> {
  const local = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.timeZone, weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(ctx.startedAt)
  const transcript = lines
    .slice(0, 800)
    .map((l) => `${l.speaker === 'client' ? 'CLIENT' : 'REP'}: ${l.text}`)
    .join('\n')
  const raw = await chat(
    key,
    PROMPT,
    `The call took place ${local} (${ctx.timeZone}). Write free text (needs, pains, action items, fact labels) in ${ctx.reviewIn === 'he' ? 'Hebrew' : 'English'}.\nWhat the CRM already has on this client: ${ctx.known}\n\nTranscript:\n${transcript}`,
    'lead_intel',
    SCHEMA,
    'low',
  )
  return CallIntel.parse(raw)
}

// ─── the profile on the lead ─────────────────────────────────────────────────

export interface Sourced<T> {
  value: T
  callId: string
  at: string
}
export interface ProfileMeeting {
  id: string
  when: string
  timeZone: string
  durationMin: number
  kind: string
  topic: string | null
  quote: string | null
  callId: string
  /** calendar entry made from it */
  entryId?: string | null
}
export interface ProfileItem {
  id: string
  text: string
  owner: 'rep' | 'client'
  due: string | null
  kind: string
  callId: string
  at: string
  status: 'open' | 'tasked' | 'done' | 'dismissed'
}
export interface LeadProfile {
  updatedAt: string
  calls: string[]
  fields: Partial<Record<'name' | 'role' | 'email' | 'otherPhone' | 'company' | 'industry' | 'location' | 'size' | 'website' | 'platform' | 'siteNotes' | 'budget' | 'timeline' | 'decisionMaker', Sourced<string>>>
  lists: { needs: Sourced<string>[]; pains: Sourced<string>[]; competitors: Sourced<string>[]; socials: Sourced<string>[] }
  facts: (Sourced<string> & { label: string; quote: string | null })[]
  meetings: ProfileMeeting[]
  actionItems: ProfileItem[]
  /** the website check (platform from its pages, not just what was said) */
  siteCheck?: { url: string; platform: string; version: string | null; kind: string; opener: string | null; at: string } | null
}

const emptyProfile = (): LeadProfile => ({ updatedAt: new Date().toISOString(), calls: [], fields: {}, lists: { needs: [], pains: [], competitors: [], socials: [] }, facts: [], meetings: [], actionItems: [] })

export function readProfile(v: unknown): LeadProfile | null {
  if (!v || typeof v !== 'object') return null
  const p = v as Partial<LeadProfile>
  const base = emptyProfile()
  return { ...base, ...p, lists: { ...base.lists, ...(p.lists ?? {}) }, fields: p.fields ?? {}, facts: p.facts ?? [], meetings: p.meetings ?? [], actionItems: p.actionItems ?? [], calls: p.calls ?? [] }
}

const shortId = (): string => Math.random().toString(36).slice(2, 10)

/** Merge one call's intel into the profile. A call read again replaces its earlier contribution. */
export function mergeIntel(profile: LeadProfile | null, intel: CallIntel, callId: string, at: Date, timeZone: string): LeadProfile {
  const p = profile ? structuredClone(profile) : emptyProfile()
  const when = at.toISOString()
  // drop what this call said before (a re-review)
  for (const k of Object.keys(p.fields) as (keyof LeadProfile['fields'])[]) if (p.fields[k]?.callId === callId) delete p.fields[k]
  for (const k of Object.keys(p.lists) as (keyof LeadProfile['lists'])[]) p.lists[k] = p.lists[k].filter((x) => x.callId !== callId)
  p.facts = p.facts.filter((f) => f.callId !== callId)
  const keptMeetings = p.meetings.filter((m) => m.callId !== callId || m.entryId)
  const keptItems = p.actionItems.filter((i) => i.callId !== callId || i.status !== 'open')

  const set = (k: keyof LeadProfile['fields'], v: string | null): void => {
    if (!v) return
    const cur = p.fields[k]
    // the newest call wins; an older call doesn't replace a newer fact
    if (!cur || cur.at <= when) p.fields[k] = { value: v, callId, at: when }
  }
  const name = [intel.person.firstName, intel.person.lastName].filter(Boolean).join(' ')
  set('name', name || null)
  set('role', intel.person.role)
  set('email', intel.person.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(intel.person.email) ? intel.person.email.toLowerCase() : null)
  set('otherPhone', intel.person.otherPhone)
  set('company', intel.company.name)
  set('industry', intel.company.industry)
  set('location', intel.company.location)
  set('size', intel.company.size)
  set('website', intel.company.website ? normalizeSiteUrl(intel.company.website) : null)
  set('platform', intel.site.platform)
  set('siteNotes', intel.site.notes)
  set('budget', intel.budget)
  set('timeline', intel.timeline)
  set('decisionMaker', intel.decisionMaker)
  const add = (k: keyof LeadProfile['lists'], values: string[]): void => {
    for (const v of values) if (!p.lists[k].some((x) => x.value.toLowerCase() === v.toLowerCase())) p.lists[k].push({ value: v, callId, at: when })
  }
  add('needs', intel.needs)
  add('pains', intel.pains)
  add('competitors', intel.competitors)
  add('socials', intel.company.socials)
  for (const f of intel.facts) p.facts.push({ label: f.label!, value: f.value!, quote: f.quote, callId, at: when })

  p.meetings = keptMeetings
  if (intel.meeting.booked && intel.meeting.when && !keptMeetings.some((m) => m.when === intel.meeting.when)) {
    p.meetings.push({ id: shortId(), when: intel.meeting.when, timeZone, durationMin: intel.meeting.durationMin ?? 30, kind: intel.meeting.kind, topic: intel.meeting.topic, quote: intel.meeting.quote, callId, entryId: null })
  }
  p.actionItems = [...keptItems, ...intel.actionItems.filter((i) => !keptItems.some((k) => k.text === i.text)).map((i) => ({ id: shortId(), text: i.text, owner: i.owner, due: i.due, kind: i.kind, callId, at: when, status: 'open' as const }))]
  if (!p.calls.includes(callId)) p.calls.push(callId)
  p.updatedAt = new Date().toISOString()
  return p
}

const looksUnnamed = (first: string | null, last: string | null): boolean => {
  const n = [first, last].filter(Boolean).join(' ').trim()
  return !n || /^\+?[\d\s()-]+$/.test(n) || /^unnamed/i.test(n)
}

/**
 * After a call's review: read it for client facts, update the lead's profile, fill the lead's empty fields, and check
 * a website we just learned about. Never throws (a failure here must not undo the review).
 */
export async function enrichLeadFromCall(callId: string, lines: TranscriptLine[], reviewIn: 'he' | 'en'): Promise<void> {
  const key = process.env.OPENAI_API_KEY
  if (!key || lines.length < 2) return
  try {
    const call = await prisma.call.findUnique({ where: { id: callId }, select: { id: true, leadId: true, startedAt: true, user: { select: { timeZone: true } } } })
    if (!call?.leadId) return
    const lead = await prisma.lead.findUnique({ where: { id: call.leadId }, select: { id: true, firstName: true, lastName: true, email: true, company: true, website: true, budget: true, profile: true } })
    if (!lead) return
    const timeZone = call.user?.timeZone || 'Asia/Jerusalem'
    const known = JSON.stringify({ name: [lead.firstName, lead.lastName].filter(Boolean).join(' ') || null, company: lead.company, website: lead.website, email: lead.email })
    const intel = await extractIntel(key, lines, { startedAt: call.startedAt, timeZone, reviewIn, known })
    await prisma.call.update({ where: { id: callId }, data: { intel: intel as unknown as Prisma.InputJsonValue } })
    const profile = mergeIntel(readProfile(lead.profile), intel, callId, call.startedAt, timeZone)

    // fill what the lead is missing (never overwrite)
    const fill: Prisma.LeadUpdateInput = {}
    const filled: string[] = []
    if (looksUnnamed(lead.firstName, lead.lastName) && (intel.person.firstName || intel.person.lastName)) {
      fill.firstName = intel.person.firstName
      fill.lastName = intel.person.lastName
      filled.push('name')
    }
    if (!lead.company && intel.company.name) (fill.company = intel.company.name), filled.push('company')
    const site = profile.fields.website?.value
    if (!lead.website && site) (fill.website = site), filled.push('website')
    if (!lead.budget && intel.budget) (fill.budget = intel.budget), filled.push('budget')
    const email = profile.fields.email?.value
    if (!lead.email && email && !(await prisma.lead.findUnique({ where: { email }, select: { id: true } }))) (fill.email = email), filled.push('email')

    await prisma.lead.update({ where: { id: lead.id }, data: { ...fill, profile: profile as unknown as Prisma.InputJsonValue } })
    if (filled.length) await logActivity({ entityType: 'LEAD', entityId: lead.id, actorId: null, action: 'lead.autofilled', metadata: { callId, fields: filled } })

    // check the website (platform and version from the site itself), once per address
    const url = lead.website ? normalizeSiteUrl(lead.website) : site
    if (url && profile.siteCheck?.url !== url) await checkProfileSite(lead.id, url)
  } catch (err) {
    console.error('[lead-intel] failed', callId, err instanceof Error ? err.message : err)
  }
}

/** Look at the lead's website and keep its platform on the profile. */
export async function checkProfileSite(leadId: string, url: string): Promise<void> {
  const report = await auditSite(url).catch(() => null)
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { profile: true } })
  const p = readProfile(lead?.profile) ?? emptyProfile()
  p.siteCheck = report ? { url, platform: report.platform.name, version: report.platform.version, kind: report.platform.kind, opener: report.opener, at: new Date().toISOString() } : { url, platform: 'Unreachable', version: null, kind: 'custom', opener: 'We couldn’t open the site.', at: new Date().toISOString() }
  await prisma.lead.update({ where: { id: leadId }, data: { profile: p as unknown as Prisma.InputJsonValue } })
}
