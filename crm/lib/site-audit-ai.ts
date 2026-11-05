import 'server-only'
import { acceptAiPoints, factsText, type Finding, type RawAiPoint, type SiteReport } from './site-audit-core'

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['points'],
  properties: {
    points: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'detail', 'say', 'quote', 'level'],
        properties: {
          title: { type: 'string', description: 'Short: what is weak about the site, in plain words.' },
          detail: { type: 'string', description: 'One or two sentences on why it costs the business customers.' },
          say: { type: 'string', description: 'One sentence the salesperson can say on the call, friendly, not an attack.' },
          quote: { type: 'string', description: 'A phrase copied EXACTLY from the page text that shows what you are pointing at.' },
          level: { type: 'string', enum: ['medium', 'low'] },
        },
      },
    },
  },
} as const

const PROMPT = `You help a salesperson who sells websites and web services prepare to call a business.
You get the visible text of the business's home page and a list of problems already found by software.
Find what is weak about the site from a customer's point of view: unclear offer, nothing that says why choose them,
no prices or next step, thin or outdated content, no proof (reviews, results, clients), confusing or contradictory text,
broken-looking sections. Do NOT repeat the already-found list and do NOT talk about security or technology.
Rules: only use what the text shows; never guess; every point must include a quote copied exactly from the text.
Write in the same language as the site. Be polite and specific. Return an empty list if the site is genuinely good.`

/** AI points for one site. [] if the key is missing, the text is too short or the call fails (the rule-based report still stands). */
export async function aiPoints(report: SiteReport, pageText: string): Promise<Finding[]> {
  const key = process.env.OPENAI_API_KEY
  const text = pageText.slice(0, 9000)
  if (!key || text.length < 200) return []
  const model = process.env.OPENAI_ENRICH_MODEL || process.env.OPENAI_CALL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        ...(reasoning ? { reasoning_effort: 'low' } : { temperature: 0 }),
        response_format: { type: 'json_schema', json_schema: { name: 'site_points', strict: true, schema: SCHEMA } },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: `${factsText(report)}\n\nHome page text:\n${text}` },
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!res.ok) throw new Error(`AI read failed (${res.status})`)
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const parsed = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { points?: RawAiPoint[] }
    return acceptAiPoints(Array.isArray(parsed.points) ? parsed.points : [], text)
  } catch (err) {
    console.error('[site-audit] AI read failed', err instanceof Error ? err.message : err)
    return []
  }
}
