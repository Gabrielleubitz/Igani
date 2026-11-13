import 'server-only'
import type { Prisma } from '@prisma/client'
import { openaiFetch } from './ai-usage'
import { prisma } from './prisma'
import { SOCIAL_VISUALS, type SocialDraft, type SocialVisual } from './social-draft'

/**
 * What "Post now" posts. A research brief on what works on Instagram (and TikTok) is made once with OpenAI's web
 * search and saved; every post after that is written from the saved brief, so it isn't redone each time. An admin can
 * refresh or edit the brief in Admin → Settings. Recent posts are remembered so topics rotate.
 */
const RESEARCH_KEY = 'social.research'
const HISTORY_KEY = 'social.history'

export type SocialResearch = { text: string; createdAt: number; source: 'ai' | 'admin'; updatedBy?: string }
type HistoryItem = { topic: string; hook: string; visual: SocialVisual; platform: string; at: number }

const IGANI = `Igani makes a sales CRM for small businesses. Its features: a custom CRM (every lead in one place, pipeline),
call recording, automatic call analysis (each call gets a score and coaching notes) and a manager view (the whole team's
calls and scores at a glance).`

const RULES = `Content rules (always):
- Never invent claims: no customer counts, revenue, percentages that imply results, awards or testimonials.
- Names and numbers shown in the video are made up and come from the video template, not from you.
- Never mention Jordan Belfort, a course, "three tens" or "Straight Line". Say "control of the call" if needed.
- Less detail, more legitimacy: short, human, confident lines. No em dashes. No emoji in the video text.
- Hashtags: exactly four, well known and relevant. The default set is #CRM #Sales #SalesTips #SmallBusiness; change one or
  two to fit the post (for example #SalesCoaching for call analysis, #B2B, #Startups) when the research supports it.`

const json = (v: unknown): Prisma.InputJsonValue => v as Prisma.InputJsonValue

export async function getResearch(): Promise<SocialResearch | null> {
  const row = await prisma.siteSetting.findUnique({ where: { key: RESEARCH_KEY } })
  const v = row?.value as SocialResearch | undefined
  return v?.text ? v : null
}

async function putResearch(r: SocialResearch): Promise<SocialResearch> {
  await prisma.siteSetting.upsert({ where: { key: RESEARCH_KEY }, create: { key: RESEARCH_KEY, value: json(r) }, update: { value: json(r) } })
  return r
}

/** An admin's own edits to the brief (or pasted research). */
export async function saveResearch(text: string, adminId: string): Promise<SocialResearch> {
  return putResearch({ text: text.trim().slice(0, 20_000), createdAt: Date.now(), source: 'admin', updatedBy: adminId })
}

function openaiKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OpenAI is not set up (OPENAI_API_KEY is missing).')
  return key
}
const model = (): string => process.env.OPENAI_SOCIAL_MODEL || process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
const openaiError = (status: number): Error => new Error(status === 429 ? 'OpenAI is busy or out of credit. Try again shortly.' : `OpenAI error ${status}.`)

/** Text of a Responses API answer (the raw HTTP body has no output_text shortcut). */
export function responseText(body: unknown): string {
  const out = (body as { output?: { type?: string; content?: { type?: string; text?: string }[] }[] })?.output ?? []
  return out
    .filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === 'output_text' && c.text)
    .map((c) => c.text)
    .join('\n')
    .trim()
}

/** Researches what works on Instagram Reels and TikTok for a product like Igani right now, and saves the brief. */
export async function refreshResearch(): Promise<SocialResearch> {
  const res = await openaiFetch('social-research', 'https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${openaiKey()}` },
    body: JSON.stringify({
      model: model(),
      tools: [{ type: 'web_search' }],
      input: `${IGANI}

Research, using the web, what performs on Instagram Reels and TikTok right now for B2B software, CRM and sales tools aimed at
small business owners and sales teams. Write a practical brief (under 700 words, plain text, no markdown tables) that a
writer will reuse for many short posts. Sections:
1. Audience: who to talk to and what they care about.
2. Hooks: patterns for the first line and the first 2 seconds that work now, with 6 to 8 example hooks for Igani.
3. Formats: what short product videos (about 7 seconds, no sound, on-screen text) should do.
4. Captions: length, structure, call to action.
5. Hashtags: current practice (how many, broad vs niche) and a shortlist of relevant, well known tags.
6. Topic ideas: 12 to 15 post ideas tied to Igani's four features, to rotate through.
7. Sources: the main pages you used, one line each.
Only report what the sources support; say when something is a general practice rather than measured. ${RULES.split('\n')[1]}`,
    }),
    signal: AbortSignal.timeout(240_000),
  })
  if (!res.ok) throw openaiError(res.status)
  const text = responseText(await res.json())
  if (!text) throw new Error('The research came back empty. Try again.')
  return putResearch({ text, createdAt: Date.now(), source: 'ai' })
}

/** The saved brief, or a new one the first time. */
export async function ensureResearch(): Promise<SocialResearch> {
  return (await getResearch()) ?? refreshResearch()
}

export async function recentPosts(): Promise<HistoryItem[]> {
  const row = await prisma.siteSetting.findUnique({ where: { key: HISTORY_KEY } })
  return ((row?.value as HistoryItem[] | undefined) ?? []).slice(0, 20)
}
export async function rememberPost(item: Omit<HistoryItem, 'at'>): Promise<void> {
  const list = [{ ...item, at: Date.now() }, ...(await recentPosts())].slice(0, 20)
  await prisma.siteSetting.upsert({ where: { key: HISTORY_KEY }, create: { key: HISTORY_KEY, value: json(list) }, update: { value: json(list) } })
}

const DRAFT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['topic', 'visual', 'hook', 'sub', 'points', 'cta', 'caption', 'hashtags'],
  properties: {
    topic: { type: 'string', description: 'What this post is about, in a few words (used to avoid repeating topics).' },
    visual: { type: 'string', enum: [...SOCIAL_VISUALS], description: 'pipeline = custom CRM, recording = call recording, analysis = automatic call analysis, manager = manager view' },
    hook: { type: 'string', description: 'The big headline on the video: 2 to 6 words.' },
    sub: { type: 'string', description: 'One short line under the headline: at most 10 words.' },
    points: { type: 'array', items: { type: 'string' }, description: 'Exactly 3 short benefit lines, 2 to 5 words each.' },
    cta: { type: 'string', description: 'Closing call to action on the video: 2 to 4 words.' },
    caption: { type: 'string', description: 'The post caption without hashtags: a strong first line, then 1 to 3 short lines, then a call to action. Under 400 characters.' },
    hashtags: { type: 'array', items: { type: 'string' }, description: 'Exactly 4 hashtags, each starting with #.' },
  },
} as const

const clean = (s: unknown, max: number): string => String(s ?? '').replace(/[—–]/g, ',').replace(/\s+/g, ' ').trim().slice(0, max)

/** Turns the model's answer into a safe draft (lengths, four hashtags, a known visual). */
export function toDraft(raw: Record<string, unknown>): SocialDraft {
  const visual = (SOCIAL_VISUALS as readonly string[]).includes(String(raw.visual)) ? (raw.visual as SocialVisual) : 'analysis'
  const points = (Array.isArray(raw.points) ? raw.points : []).map((p) => clean(p, 40)).filter(Boolean).slice(0, 3)
  const tags = (Array.isArray(raw.hashtags) ? raw.hashtags : [])
    .map((h) => '#' + String(h).replace(/[^\p{L}\p{N}_]/gu, ''))
    .filter((h) => h.length > 1)
  const hashtags = [...new Set([...tags, '#CRM', '#Sales', '#SalesTips', '#SmallBusiness'])].slice(0, 4)
  const caption = String(raw.caption ?? '').replace(/[—–]/g, ',').replace(/#[\p{L}\p{N}_]+/gu, '').replace(/[ \t]+\n/g, '\n').trim().slice(0, 1200)
  return { topic: clean(raw.topic, 80), visual, hook: clean(raw.hook, 60), sub: clean(raw.sub, 80), points, cta: clean(raw.cta, 30) || 'Try Igani', caption, hashtags }
}

/** A new post (video script, caption, hashtags) written from the saved research. */
export async function writePost(platform: 'instagram' | 'tiktok'): Promise<{ draft: SocialDraft; researchAt: number }> {
  const [research, recent] = await Promise.all([ensureResearch(), recentPosts()])
  const m = model()
  const res = await openaiFetch('social-post', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${openaiKey()}` },
    body: JSON.stringify({
      model: m,
      ...(/^(gpt-5|o\d)/.test(m) ? { reasoning_effort: 'low' } : { temperature: 0.8 }),
      response_format: { type: 'json_schema', json_schema: { name: 'social_post', strict: true, schema: DRAFT_SCHEMA } },
      messages: [
        {
          role: 'system',
          content: `You write Igani's short ${platform === 'tiktok' ? 'TikTok' : 'Instagram Reels'} posts. ${IGANI}

The video is 7 seconds, no sound, dark and premium: a big headline (hook), a short line under it, an animated product
card for one feature (the visual), three short benefit lines, then a call to action. Write the words for it, plus the
caption and hashtags. Use the research brief for the hook style, caption and hashtags. Pick a topic and feature that
were not used in the recent posts, and don't reuse a recent hook.

${RULES}

Research brief (saved ${new Date(research.createdAt).toISOString().slice(0, 10)}):
${research.text}`,
        },
        { role: 'user', content: JSON.stringify({ platform, recentPosts: recent.map((r) => ({ topic: r.topic, hook: r.hook, visual: r.visual })) }) },
      ],
    }),
    signal: AbortSignal.timeout(100_000),
  })
  if (!res.ok) throw openaiError(res.status)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = body.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI returned nothing. Try again.')
  return { draft: toDraft(JSON.parse(content) as Record<string, unknown>), researchAt: research.createdAt }
}
