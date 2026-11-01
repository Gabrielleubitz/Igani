import 'server-only'
import { organizedSchema, type OrganizedNotes } from './organize-notes'

/** True when an OpenAI key is configured (optional: without it the free tidy-up is used). */
export const aiTidyEnabled = (): boolean => Boolean(process.env.OPENAI_API_KEY)

const PROMPT = `You tidy meeting notes for a CRM. Return ONLY JSON: {"overview": string[], "decisions": string[], "actions": string[], "topics": [{"title": string, "points": string[]}]}.
- overview: 2-4 short plain sentences on what the call was about.
- decisions: what was agreed, one short line each (empty if none).
- actions: next steps as "Who: task" when the owner is known, one short line each.
- topics: the main subjects discussed, each with a short title and 1-4 brief points.
Use only facts in the notes. Never invent names, dates or numbers. Plain text, no markdown, same language as the notes.`

/** Rewrites raw notes into the organized shape with OpenAI. Returns null on any problem (the caller keeps the free tidy-up). */
export async function tidyWithAI(text: string): Promise<OrganizedNotes | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key || !text.trim()) return null
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: text.slice(0, 30_000) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    })
    if (!res.ok) {
      console.error('[meeting-ai] OpenAI', res.status)
      return null
    }
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
    const parsed = organizedSchema.safeParse(JSON.parse(body.choices?.[0]?.message?.content ?? '{}'))
    return parsed.success ? parsed.data : null
  } catch (err) {
    console.error('[meeting-ai] failed', err instanceof Error ? err.message : err)
    return null
  }
}
