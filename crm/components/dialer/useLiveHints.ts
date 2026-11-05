'use client'

import { useEffect, useRef, useState } from 'react'
import { HINT_WINDOW_MS, acceptHint, type LiveHint } from '@/lib/live-hints-core'

type Streams = { local: MediaStream | null; remote: MediaStream | null }

/** Records one window of a stream and resolves with the audio (or null when there is nothing to record). */
function recordWindow(stream: MediaStream | null, ms: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (!stream || !stream.getAudioTracks().some((t) => t.readyState === 'live')) return resolve(null)
    let rec: MediaRecorder
    try {
      rec = new MediaRecorder(new MediaStream(stream.getAudioTracks()), { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : undefined, audioBitsPerSecond: 24_000 })
    } catch {
      return resolve(null)
    }
    const parts: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && parts.push(e.data)
    rec.onstop = () => resolve(parts.length ? new Blob(parts, { type: 'audio/webm' }) : null)
    rec.onerror = () => resolve(null)
    rec.start()
    window.setTimeout(() => rec.state !== 'inactive' && rec.stop(), ms)
  })
}

/**
 * Live Straight Line hints. While a call is live, every few seconds the rep's microphone and the client's voice (two separate
 * streams) are recorded for a short window, sent to the server for transcription and a coaching hint, and the latest hint is shown.
 * Audio is not stored. Failures are silent: hints are a bonus and must never get in the way of the call.
 */
export function useLiveHints(opts: { enabled: boolean; callId: string; answeredAt: number | null; getStreams: () => Streams | null }): { hint: LiveHint | null; active: boolean } {
  const { enabled, callId, answeredAt, getStreams } = opts
  const [hint, setHint] = useState<LiveHint | null>(null)
  const [active, setActive] = useState(false)
  const getRef = useRef(getStreams)
  getRef.current = getStreams

  useEffect(() => {
    if (!enabled || !answeredAt) return
    let stop = false
    let context = ''
    const shown: string[] = []
    let fails = 0
    const loop = async (): Promise<void> => {
      await new Promise((r) => window.setTimeout(r, 1500))
      while (!stop) {
        const s = getRef.current()
        if (!s || (!s.local && !s.remote)) return // this engine gives no audio (demo)
        setActive(true)
        const [rep, client] = await Promise.all([recordWindow(s.local, HINT_WINDOW_MS), recordWindow(s.remote, HINT_WINDOW_MS)])
        if (stop) return
        if (!rep && !client) continue
        const form = new FormData()
        if (rep) form.append('rep', rep, 'rep.webm')
        if (client) form.append('client', client, 'client.webm')
        form.append('context', context)
        form.append('recent', JSON.stringify(shown.slice(-4)))
        form.append('elapsed', String(Math.round((Date.now() - answeredAt) / 1000)))
        try {
          const res = await fetch(`/api/calls/${callId}/hint`, { method: 'POST', body: form })
          if (res.status === 403 || res.status === 503 || res.status === 404) return // switched off or call over
          if (!res.ok) throw new Error('hint failed')
          fails = 0
          const j = (await res.json()) as { lines: { speaker: 'rep' | 'client'; text: string }[]; hint: LiveHint | null }
          if (j.lines.length) context = `${context}${context ? '\n' : ''}${j.lines.map((l) => `${l.speaker === 'rep' ? 'REP' : 'CLIENT'}: ${l.text}`).join('\n')}`.slice(-3000)
          const h = acceptHint(j.hint, shown)
          if (h && !stop) {
            shown.push(h.text)
            setHint(h)
          }
        } catch {
          if (++fails >= 4) return // give up quietly after repeated failures
        }
      }
    }
    void loop()
    return () => {
      stop = true
      setActive(false)
      setHint(null)
    }
  }, [enabled, callId, answeredAt])

  return { hint, active }
}
