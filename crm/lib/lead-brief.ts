import 'server-only'
import { z } from 'zod'
import { chat, reviewModelName } from './call-analysis'
import { coachingLanguage } from './call-language'
import { historyText, loadLeadHistory } from './lead-history'

/**
 * "Brief me": a short recap of a whole relationship from every channel (emails, texts, calls, meetings, notes), for
 * before a call or when a contact changes hands. Nothing is stored; each click reads the latest history.
 */

export const LeadBrief = z.object({
  standing: z.string().transform((s) => s.trim().slice(0, 600)),
  decided: z.array(z.string()).transform((a) =>
    a
      .map((s) => s.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 6),
  ),
  objections: z.array(z.string()).transform((a) =>
    a
      .map((s) => s.trim().slice(0, 200))
      .filter(Boolean)
      .slice(0, 6),
  ),
  openPromises: z.array(z.object({ who: z.enum(['us', 'client']), text: z.string() })).transform((a) =>
    a
      .map((p) => ({ who: p.who, text: p.text.trim().slice(0, 200) }))
      .filter((p) => p.text)
      .slice(0, 6),
  ),
  nextStep: z
    .string()
    .nullable()
    .transform((s) => (s?.trim() ? s.trim().slice(0, 300) : null)),
})
export type LeadBrief = z.infer<typeof LeadBrief> & { lang: 'he' | 'en'; items: number; generatedAt: string }

const STR = { type: 'string' }
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['standing', 'decided', 'objections', 'openPromises', 'nextStep'],
  properties: {
    standing: STR,
    decided: { type: 'array', items: STR },
    objections: { type: 'array', items: STR },
    openPromises: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['who', 'text'], properties: { who: { type: 'string', enum: ['us', 'client'] }, text: STR } } },
    nextStep: { type: ['string', 'null'] },
  },
}

const PROMPT = `You brief a salesperson on one client before they get in touch. You get the whole history with the client
(emails, texts, calls with their AI summaries, meetings, internal notes), oldest first. Return:
- standing: 2 to 3 plain sentences: who they are, what they want, where the deal stands right now, and how warm they seem.
- decided: what has been agreed or settled (prices, scope, dates, tools), each a short line. Empty if nothing.
- objections: concerns or doubts the client raised that still matter. Empty if none.
- openPromises: things someone said they would do that haven't visibly happened yet (who: us or client).
- nextStep: the single most useful next action for the salesperson, specific (what, how, when). Null only if the deal is closed.
Base every line on the history. Never invent facts, prices or dates. Be brief: a busy rep reads this in 20 seconds.
No markdown, no em dashes.`

/** Brief one contact. Throws when OpenAI isn't set up or refuses. */
export async function briefLead(leadId: string, timeZone: string): Promise<LeadBrief> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI is not set up (OPENAI_API_KEY is missing).')
  const h = await loadLeadHistory(leadId, 30)
  const text = historyText(h, timeZone)
  const lang = coachingLanguage(text)
  const today = new Intl.DateTimeFormat('en-GB', { timeZone, day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())
  const facts = [`Client: ${h.lead.name}`, h.lead.company ? `Company: ${h.lead.company}` : '', `Stage in the CRM: ${h.lead.status.replace(/_/g, ' ').toLowerCase()}`, h.lead.budget ? `Budget given: ${h.lead.budget}` : ''].filter(Boolean).join('. ')
  const open = h.openItems.length ? `\nOpen action items from calls: ${h.openItems.map((i) => `${i.owner === 'rep' ? 'us' : 'client'}: ${i.text}`).join('; ')}` : ''
  const raw = await chat(key, PROMPT, `Today is ${today}. Write in ${lang === 'he' ? 'Hebrew' : 'English'}.\n${facts}${open}\n\nHistory:\n${text || '(nothing yet: no emails, texts, calls or meetings)'}`, 'lead_brief', SCHEMA, 'low', await reviewModelName(), 'lead-brief')
  return { ...LeadBrief.parse(raw), lang, items: h.items.length, generatedAt: new Date().toISOString() }
}
