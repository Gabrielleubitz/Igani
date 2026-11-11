import 'server-only'
import { openaiFetch } from './ai-usage'
import { z } from 'zod'
import { MODULE_GROUPS, slugify } from './offer-modules'

/**
 * Call transcript → suggested offer modules (OpenAI). Suggestions only: an admin picks which to add and sets
 * every price. The model is told never to price anything, and prices are not part of the output at all.
 */

export const transcriptAiEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY)

export const MAX_TRANSCRIPT_CHARS = 120_000

const PROMPT = `You are a senior product consultant at Igani, a software studio. You read a sales or discovery call transcript
and break what the CLIENT actually wants built into priced modules for a proposal. An admin will set the prices.

Return JSON matching the schema. Rules:
- A module is a coherent, separately priceable piece of work (e.g. "Back office", "Customer mobile app", "Payments", "Reports").
  Merge requests that are really the same thing. Split only when the client could reasonably buy one without the other.
- group: "core" = foundations everything else needs (infrastructure, hosting, environments, core database/API, auth) - always required.
  "main" = what the client clearly wants in this project. "addons" = optional extras, nice-to-haves, later phases, things Igani suggested
  that the client did not clearly accept.
- included: true only when the client clearly wants it in this project. Postponed ("phase 2", "later", "maybe next year") -> addons, included false.
- People change their minds. Later statements override earlier ones. If the client dropped something, do NOT make it a module: put it in excluded.
- Things the client already has, or that another vendor/partner/in-house team will do, are excluded (say who does it).
- Ignore small talk, jokes, scheduling, and tangents. Ignore things only mentioned as an example or about a competitor.
- If the call quotes budgets or prices, ignore them for the modules (mention a budget constraint in openQuestions if it matters).
  NEVER output a price anywhere.
- Speakers may be mislabeled, interrupt each other, or mix Hebrew and English. Infer who is the client from context.
- evidence: a SHORT exact quote (max ~20 words) from the transcript that justifies the module. Never invent quotes.
- confidence: "high" when the client asked for it explicitly and it was not contradicted later; "medium" when implied or partly agreed;
  "low" when ambiguous, contradicted, or only Igani suggested it.
- name: 2-5 words. summary: one plain sentence on what the module does for this client. name, summary, excluded and openQuestions all
  in the SAME language as most of the client's speech (Hebrew call -> Hebrew everything; keep product names like PWA or WhatsApp as is).
- Read to the END before deciding. The final decision on each topic wins: if the client first wants X and later settles on Y now and X later,
  the module is Y (main, included) and X is a separate addon (included false). Don't put X in main.
- If something was first dismissed and later agreed (or the reverse), follow the later statement and don't also list it as excluded.
- Cover the whole scope, not just the headline asks: customer notifications (and their channel), sign-in method, delivery areas/fees,
  data migration, admin roles, reports, integrations to other vendors (the integration is ours even when their system is not).
- Igani suggestions the client found interesting but did not commit to ("send me something", "I'll think about it") -> addons,
  included false, confidence low. Future expansions the client says to prepare for -> addons, included false.
- Things explicitly dropped by the client (e.g. a channel they said not to use) go in excluded with the reason.
- key: short lowercase id with dashes (e.g. "back-office").
- openQuestions: specific decisions still open that affect scope or price, naming the topic and who must answer (e.g. the client, a named
  vendor, a regulator). No generic questions like "what are the requirements". Max 8.
- clientSummary: 1-2 sentences on what the client is trying to achieve.
Use only what the transcript says. No markdown.`

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['clientSummary', 'modules', 'excluded', 'openQuestions'],
  properties: {
    clientSummary: { type: 'string' },
    modules: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['key', 'name', 'group', 'included', 'summary', 'evidence', 'confidence'],
        properties: {
          key: { type: 'string' },
          name: { type: 'string' },
          group: { type: 'string', enum: [...MODULE_GROUPS] },
          included: { type: 'boolean' },
          summary: { type: 'string' },
          evidence: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    excluded: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['topic', 'reason'], properties: { topic: { type: 'string' }, reason: { type: 'string' } } },
    },
    openQuestions: { type: 'array', items: { type: 'string' } },
  },
} as const

const Result = z.object({
  clientSummary: z.string(),
  modules: z.array(
    z.object({
      key: z.string(),
      name: z.string().min(1),
      group: z.enum(MODULE_GROUPS),
      included: z.boolean(),
      summary: z.string(),
      evidence: z.string(),
      confidence: z.enum(['high', 'medium', 'low']),
    }),
  ),
  excluded: z.array(z.object({ topic: z.string(), reason: z.string() })),
  openQuestions: z.array(z.string()),
})

export type TranscriptModules = z.infer<typeof Result>

/** Throws a readable error; the caller shows it to the admin. */
export async function modulesFromTranscript(transcript: string, existing: { id: string; name: string }[]): Promise<TranscriptModules> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI is not set up (OPENAI_API_KEY is missing).')
  const text = transcript.replace(/\r\n/g, '\n').trim()
  if (text.length < 200) throw new Error('That transcript is too short to work from.')
  const context = existing.length ? `\n\nModules already on this offer (do not repeat them; you may refine around them): ${existing.map((m) => `${m.id} (${m.name})`).join(', ')}` : ''

  // Breaking a messy call into scope needs a strong model; the cheap default used for note tidying misses the traps
  const model = process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await openaiFetch('offer-transcript', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      // Reasoning models (gpt-5.x, o-series) only accept the default temperature; they take a reasoning effort instead
      ...(reasoning ? { reasoning_effort: 'medium' } : { temperature: 0.1 }),
      response_format: { type: 'json_schema', json_schema: { name: 'offer_modules', strict: true, schema: SCHEMA } },
      messages: [
        { role: 'system', content: PROMPT + context },
        { role: 'user', content: `TRANSCRIPT:\n${text.slice(0, MAX_TRANSCRIPT_CHARS)}` },
      ],
    }),
    signal: AbortSignal.timeout(150_000),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    console.error('[offer-ai] OpenAI', res.status, detail.slice(0, 500))
    throw new Error(res.status === 401 ? 'OpenAI rejected the API key.' : res.status === 429 ? 'OpenAI is rate-limiting or out of credit. Try again shortly.' : `OpenAI error ${res.status}.`)
  }
  const body = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] }
  const msg = body.choices?.[0]?.message
  if (msg?.refusal) throw new Error(`OpenAI declined: ${msg.refusal}`)
  const parsed = Result.safeParse(JSON.parse(msg?.content ?? '{}'))
  if (!parsed.success) throw new Error('OpenAI returned an unexpected answer. Try again.')

  // Clean keys: slug form, unique, never clashing with modules already on the offer
  const taken = new Set(existing.map((m) => m.id))
  const modules = parsed.data.modules.map((m) => {
    const base = slugify(m.key || m.name).slice(0, 40) || 'module'
    let id = base
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`
    taken.add(id)
    return { ...m, key: id, name: m.name.trim().slice(0, 120), summary: m.summary.trim().slice(0, 500), included: m.group === 'core' ? true : m.included }
  })
  return { ...parsed.data, modules, openQuestions: parsed.data.openQuestions.slice(0, 8) }
}
