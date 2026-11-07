import 'server-only'
import { TRANSCRIBE_PROMPT, hintLanguageRule } from './call-language'
import { LIVE_HINT_RULES, HINT_SCHEMA, acceptHint, cleanSpeech, trimContext, type HintStep, type HintTone, type LiveHint } from './live-hints-core'

/** OpenAI's own explanation of a failed request (short), for the logs. */
export async function openAiReason(res: Response): Promise<string> {
  const text = await res.text().catch(() => '')
  try {
    return ((JSON.parse(text) as { error?: { message?: string } }).error?.message ?? text).slice(0, 200)
  } catch {
    return text.slice(0, 200)
  }
}

/** One window of one speaker's audio (webm/opus from the browser) to text. Returns '' for silence. */
export async function transcribeWindow(audio: Blob, name: string, key: string): Promise<string> {
  // live windows are short and often switch language mid-sentence: the newer model handles that best (Whisper if it isn't available)
  const preferred = process.env.OPENAI_LIVE_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe'
  const send = (model: string): Promise<Response> => {
    const form = new FormData()
    form.append('file', audio, name)
    form.append('model', model)
    form.append('response_format', 'json')
    form.append('prompt', TRANSCRIBE_PROMPT)
    if (/^whisper/.test(model)) form.append('temperature', '0')
    return fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(20_000) })
  }
  let res = await send(preferred)
  if (!res.ok && [400, 403, 404].includes(res.status) && preferred !== 'whisper-1') res = await send('whisper-1')
  // OpenAI hiccups (busy / 5xx): one quick retry before giving up on this window
  if (!res.ok && (res.status === 429 || res.status >= 500)) {
    await new Promise((r) => setTimeout(r, process.env.VITEST ? 0 : 600))
    res = await send(preferred)
  }
  if (!res.ok) throw new Error(`Transcription failed (${res.status}): ${await openAiReason(res)}`)
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
        { role: 'user', content: `Time into the call: ${Math.round(elapsedSec)}s.\n${hintLanguageRule(context)}\nHints already shown: ${recent.length ? recent.map((r) => `"${r}"`).join('; ') : 'none'}\n\nConversation (latest last):\n${trimContext(context) || '(nothing said yet)'}` },
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
