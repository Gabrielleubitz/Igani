import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
import { judgeTonality } from '@/lib/call-tonality'

const lines = [
  { start: 0, end: 20, speaker: 'rep' as const, text: 'Hi Dana, Gabriel from Igani' },
  { start: 20, end: 30, speaker: 'client' as const, text: 'Hi' },
]
const audio = new Blob([new Uint8Array(64 * 1024)], { type: 'audio/mpeg' })
const reply = (content: string) => Response.json({ choices: [{ message: { content } }] })

describe('tonality from the recording', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('sends the audio, reads the JSON (even wrapped in text) and clamps the grades', async () => {
    const seen: { model: string; audio: boolean }[] = []
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as { model: string; messages: { content: unknown }[] }
      seen.push({ model: body.model, audio: JSON.stringify(body.messages[1]!.content).includes('input_audio') })
      return reply('Here you go:\n{"dims":{"certainty":7,"enthusiasm":2,"warmth":null,"pace":3,"variety":4,"composure":4},"summary":" Flat start. ","clientMood":"warming","moments":[{"at":3.6,"note":"Low energy on the name","tryThis":"Lift on Igani"}]}')
    })
    const t = await judgeTonality(audio, lines, { key: 'k', durationSec: 30, reviewLanguage: 'en' })
    expect(seen).toEqual([{ model: 'gpt-audio', audio: true }])
    expect(t).toMatchObject({ dims: { certainty: 5, enthusiasm: 2, warmth: null }, summary: 'Flat start.', clientMood: 'warming', moments: [{ at: 4, note: 'Low energy on the name' }] })
  })

  it('falls back to the older audio model, and gives up quietly on errors or nonsense', async () => {
    const models: string[] = []
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      const m = (JSON.parse(String(init.body)) as { model: string }).model
      models.push(m)
      return m === 'gpt-audio' ? new Response('no such model', { status: 404 }) : reply('I cannot tell.')
    })
    expect(await judgeTonality(audio, lines, { key: 'k', durationSec: 30, reviewLanguage: 'en' })).toBeNull()
    expect(models).toEqual(['gpt-audio', 'gpt-4o-audio-preview'])
  })

  it('skips recordings with too little of the rep to judge', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('should not be called')
    })
    expect(await judgeTonality(new Blob([new Uint8Array(1000)]), lines, { key: 'k', durationSec: 30, reviewLanguage: 'en' })).toBeNull()
    expect(await judgeTonality(audio, [{ start: 0, end: 5, speaker: 'rep', text: 'hi' }], { key: 'k', durationSec: 5, reviewLanguage: 'en' })).toBeNull()
  })
})
