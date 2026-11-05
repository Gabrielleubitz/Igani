import 'server-only'
import { LIVE_HINT_RULES, HINT_SCHEMA, acceptHint, cleanSpeech, trimContext, type HintStep, type HintTone, type LiveHint } from './live-hints-core'

/** One window of one speaker's audio (webm/opus from the browser) to text. Returns '' for silence. */
export async function transcribeWindow(audio: Blob, name: string, key: string): Promise<string> {
  const form = new FormData()
  form.append('file', audio, name)
  form.append('model', process.env.OPENAI_TRANSCRIBE_MODEL || 'whisper-1')
  form.append('response_format', 'json')
  form.append('temperature', '0')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Transcription failed (${res.status})`)
  const body = (await res.json()) as { text?: string }
  return cleanSpeech(body.text ?? '')
}

/** The live coach: the conversation so far in, at most one short hint out. */
export async function liveHint(context: string, recent: string[], elapsedSec: number, key: string): Promise<LiveHint | null> {
  const model = process.env.OPENAI_HINT_MODEL || 'gpt-4o-mini'
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 120,
      response_format: { type: 'json_schema', json_schema: { name: 'live_hint', strict: true, schema: HINT_SCHEMA } },
      messages: [
        { role: 'system', content: LIVE_HINT_RULES },
        { role: 'user', content: `Time into the call: ${Math.round(elapsedSec)}s.\nHints already shown: ${recent.length ? recent.map((r) => `"${r}"`).join('; ') : 'none'}\n\nConversation (latest last):\n${trimContext(context) || '(nothing said yet)'}` },
      ],
    }),
    signal: AbortSignal.timeout(15_000),
  })
  if (!res.ok) throw new Error(`Hint failed (${res.status})`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const raw = JSON.parse(body.choices?.[0]?.message?.content ?? '{}') as { hint?: string | null; step?: string | null; tone?: string }
  if (!raw.hint) return null
  return acceptHint({ text: raw.hint, step: (raw.step as HintStep | null) ?? null, tone: (raw.tone as HintTone) ?? 'do' }, recent)
}
