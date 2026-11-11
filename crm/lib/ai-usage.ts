import { prisma } from './prisma'

/**
 * What every OpenAI request used, so Admin → Phone can show the monthly token usage per feature. Requests go through
 * openaiFetch(), which behaves exactly like fetch() and notes the usage from a copy of the answer in the background.
 * Recording never slows down or breaks the request it watches.
 */

export const AI_FEATURES = {
  'call-review': 'Call reviews',
  transcription: 'Call transcription',
  tonality: 'Voice tone check',
  'live-hints': 'Live hints',
  'live-transcription': 'Live hints (listening)',
  contract: 'Contracts',
  offer: 'Offers',
  'offer-transcript': 'Offers from calls',
  meeting: 'Meeting notes',
  'site-audit': 'Site audits',
  'lead-intel': 'Lead insights from calls',
  'lead-brief': 'Brief me',
  'follow-up': 'Follow-up drafts',
  prospect: 'Prospect details',
} as const
export type AiFeature = keyof typeof AI_FEATURES

export interface AiUsageNote {
  model: string
  inputTokens: number
  outputTokens: number
  cachedTokens: number
  audioSeconds: number
}

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : 0)

/**
 * The usage in an OpenAI answer. Chat answers report prompt/completion tokens; transcriptions report either tokens
 * (gpt-4o models) or seconds of audio (whisper-1, which also gives the audio length as `duration`). Null when the
 * answer has nothing to count.
 */
export function usageFromBody(body: unknown, model: string): AiUsageNote | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const u = (b.usage && typeof b.usage === 'object' ? b.usage : {}) as Record<string, unknown>
  const details = (u.prompt_tokens_details ?? u.input_token_details ?? {}) as Record<string, unknown>
  const note: AiUsageNote = {
    model: (typeof b.model === 'string' && b.model) || model || 'unknown',
    inputTokens: num(u.prompt_tokens) || num(u.input_tokens),
    outputTokens: num(u.completion_tokens) || num(u.output_tokens),
    cachedTokens: num(details.cached_tokens),
    audioSeconds: u.type === 'duration' ? num(u.seconds) : num(b.duration),
  }
  return note.inputTokens || note.outputTokens || note.audioSeconds ? note : null
}

/** The model a request asks for: from a JSON body (chat) or a form (transcription). */
export function modelOfRequest(body: unknown): string {
  try {
    if (typeof body === 'string') return String((JSON.parse(body) as { model?: unknown }).model ?? '')
    if (typeof FormData !== 'undefined' && body instanceof FormData) return String(body.get('model') ?? '')
  } catch {
    // not JSON: no model to read
  }
  return ''
}

async function note(feature: AiFeature, requestModel: string, res: Response): Promise<void> {
  try {
    const usage = usageFromBody(await res.json(), requestModel)
    if (usage) await prisma.aiUsage.create({ data: { feature, ...usage } })
  } catch (err) {
    console.error('[ai-usage] could not record', feature, err instanceof Error ? err.message : err)
  }
}

/** fetch() for OpenAI that also records the request's token usage under a feature. */
export async function openaiFetch(feature: AiFeature, url: string, init: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  // tests mock fetch with bare objects; a real answer can be copied and read twice
  if (res.ok && typeof res.clone === 'function' && !process.env.VITEST) void note(feature, modelOfRequest(init.body), res.clone())
  return res
}

export interface AiMonthRow {
  feature: string
  label: string
  requests: number
  inputTokens: number
  outputTokens: number
  audioMinutes: number
}

export interface AiMonth {
  month: string
  rows: AiMonthRow[]
  requests: number
  tokens: number
  audioMinutes: number
}

/** Usage per month (newest first), split by feature (busiest first). */
export function aiUsageByMonth(rows: { month: string; feature: string; inputTokens: number; outputTokens: number; audioSeconds: number }[]): AiMonth[] {
  const months = new Map<string, Map<string, AiMonthRow>>()
  for (const r of rows) {
    const m = months.get(r.month) ?? new Map<string, AiMonthRow>()
    months.set(r.month, m)
    const label = (AI_FEATURES as Record<string, string>)[r.feature] ?? r.feature
    const f = m.get(r.feature) ?? { feature: r.feature, label, requests: 0, inputTokens: 0, outputTokens: 0, audioMinutes: 0 }
    m.set(r.feature, f)
    f.requests += 1
    f.inputTokens += r.inputTokens
    f.outputTokens += r.outputTokens
    f.audioMinutes += r.audioSeconds / 60
  }
  return [...months.entries()]
    .map(([month, m]) => {
      const list = [...m.values()].sort((a, b) => b.inputTokens + b.outputTokens - (a.inputTokens + a.outputTokens) || b.audioMinutes - a.audioMinutes)
      return {
        month,
        rows: list,
        requests: list.reduce((s, r) => s + r.requests, 0),
        tokens: list.reduce((s, r) => s + r.inputTokens + r.outputTokens, 0),
        audioMinutes: list.reduce((s, r) => s + r.audioMinutes, 0),
      }
    })
    .sort((a, b) => b.month.localeCompare(a.month))
}

/** Token counts people can read: 950, 12.4k, 3.1M. */
export function fmtTokens(n: number): string {
  if (n < 1000) return String(Math.round(n))
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0)}k`
  return `${(n / 1_000_000).toFixed(1)}M`
}

/**
 * The real OpenAI bill per month (UTC months, US dollars), read with an admin key (OPENAI_ADMIN_KEY, made under
 * Organization → Admin keys). Null when there's no admin key; throws with a short reason when OpenAI refuses.
 */
export async function openaiBillByMonth(since: Date): Promise<Map<string, number> | null> {
  const key = process.env.OPENAI_ADMIN_KEY?.trim()
  if (!key) return null
  const out = new Map<string, number>()
  let page: string | undefined
  for (let i = 0; i < 6; i++) {
    const q = new URLSearchParams({ start_time: String(Math.floor(since.getTime() / 1000)), bucket_width: '1d', limit: '180' })
    if (page) q.set('page', page)
    const res = await fetch(`https://api.openai.com/v1/organization/costs?${q}`, { headers: { authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15_000), cache: 'no-store' })
    if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'OpenAI refused the admin key.' : `OpenAI costs ${res.status}`)
    const body = (await res.json()) as { data?: { start_time: number; results?: { amount?: { value?: number } }[] }[]; has_more?: boolean; next_page?: string }
    for (const b of body.data ?? []) {
      const month = new Date(b.start_time * 1000).toISOString().slice(0, 7)
      const sum = (b.results ?? []).reduce((s, r) => s + num(r.amount?.value), 0)
      out.set(month, (out.get(month) ?? 0) + sum)
    }
    if (!body.has_more || !body.next_page) break
    page = body.next_page
  }
  return out
}
