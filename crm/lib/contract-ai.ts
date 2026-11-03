import 'server-only'
import { IGANI_STANDARD_TERMS, parseContractDoc, type ContractDoc, type ContractLang } from './contract'

/** Drafts a contract from Igani's standard terms + the offer's facts (OpenAI). An admin reviews and edits before approval. */

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'subtitle', 'intro', 'sections'],
  properties: {
    title: { type: 'string' },
    subtitle: { type: 'string' },
    intro: { type: 'string' },
    sections: {
      type: 'array',
      items: { type: 'object', additionalProperties: false, required: ['heading', 'clauses'], properties: { heading: { type: 'string' }, clauses: { type: 'array', items: { type: 'string' } } } },
    },
  },
} as const

const PROMPT = (lang: ContractLang): string => `You are Igani's contracts lawyer-paralegal. Draft a clear, professional services agreement for the offer in the facts,
based on Igani's standard terms below. Return JSON matching the schema.

Rules:
- Language: ${lang === 'he' ? 'Hebrew (formal, plain legal Hebrew as used in Israeli service agreements). Keep brand and product names as they are.' : 'English (plain, professional legal English).'}
- 8 to 12 sections. Each clause is one complete paragraph. Do NOT number headings or clauses yourself (numbering is automatic).
- Keep the substance of every standard term. Adapt the details to this offer: describe the scope from the agreed modules and the offer
  summary, the timeline/phases, client responsibilities that matter for this project (e.g. content, third-party accounts it mentions),
  and anything explicitly out of scope.
- NEVER write prices, amounts or totals in the text. Refer to the fees schedule, which is generated from the modules, as
  ${lang === 'he' ? '"נספח א׳ (תמורה)" (never in English)' : '"Schedule A (Fees)"'}. You may say that
  recurring fees, if listed in Schedule A, start at launch.
- Never invent facts (no names, dates, numbers, providers) that are not in the facts.
- Don't write the parties' contact details or signature blocks (they are generated). The intro names the parties: Igani and the client.
- title: e.g. "${lang === 'he' ? 'הסכם למתן שירותי פיתוח' : 'Services Agreement'}"; subtitle: the project in a few words.
- No markdown, no em dashes.

${IGANI_STANDARD_TERMS}`

export async function draftContract(facts: object, lang: ContractLang): Promise<ContractDoc> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI is not set up (OPENAI_API_KEY is missing).')
  const model = process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      ...(reasoning ? { reasoning_effort: 'medium' } : { temperature: 0.2 }),
      response_format: { type: 'json_schema', json_schema: { name: 'contract', strict: true, schema: SCHEMA } },
      messages: [
        { role: 'system', content: PROMPT(lang) },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    }),
    signal: AbortSignal.timeout(170_000),
  })
  if (!res.ok) throw new Error(res.status === 429 ? 'OpenAI is busy or out of credit. Try again shortly.' : `OpenAI error ${res.status}.`)
  const body = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] }
  const msg = body.choices?.[0]?.message
  if (msg?.refusal) throw new Error(`OpenAI declined: ${msg.refusal}`)
  const doc = parseContractDoc(JSON.parse(msg?.content ?? '{}'))
  if (!doc) throw new Error('OpenAI returned an empty contract. Try again.')
  return doc
}
