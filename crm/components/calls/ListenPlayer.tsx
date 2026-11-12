'use client'

import { Ear, EarOff, Send } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { listenStart, listenStop, sendCallNote, type ListenRoles, type LiveCall } from '@/app/actions/calls'
import { TeamNotes, useTeamNotes } from '@/components/dialer/CallNotes'
import { cn } from '@/lib/utils'

/*
 * Listening to a live call in the browser. The relay (relay/) sends the call's audio as small binary frames: one byte
 * saying which track (0 = the call's inbound side, 1 = outbound), then 20 ms of 8 kHz μ-law. Each frame is decoded
 * here (lookup table) and handed to an AudioWorklet that keeps a short jitter buffer per side, resamples to the
 * device's rate and plays the rep in the left ear and the client in the right (or both mixed). It's a listener, not a
 * call: no microphone, nothing sent back, nothing stored.
 */

/** G.711 μ-law byte → linear sample in [-1, 1]. */
const MULAW = new Float32Array(256)
for (let i = 0; i < 256; i++) {
  const u = ~i & 0xff
  const sign = u & 0x80
  const exp = (u >> 4) & 7
  const mant = u & 0x0f
  const s = (((mant << 3) + 0x84) << exp) - 0x84
  MULAW[i] = (sign ? -s : s) / 32768
}

const PREFILL_SAMPLES = 960 // ~120 ms at 8 kHz before a side starts playing (absorbs network jitter)
const MAX_BACKLOG = 8000 // a side more than a second behind catches up by skipping ahead

/**
 * The mixer, as plain JavaScript so it can run inside an AudioWorklet (loaded from a blob) and, in browsers without
 * worklets, on the main thread behind a ScriptProcessorNode. `side` 0 = left, 1 = right.
 */
const MIXER_SRC = `
function createMixer(rate) {
  var q = [[], []], buffered = [0, 0], primed = [false, false], pos = [0, 0], mix = 0, ratio = 8000 / rate, sq = [0, 0], n = 0
  function push(side, samples) {
    q[side].push(samples); buffered[side] += samples.length
    while (buffered[side] > ${MAX_BACKLOG} && q[side].length > 1) { buffered[side] -= q[side].shift().length; pos[side] = 0 }
  }
  function read(side) {
    var list = q[side]
    if (!primed[side]) { if (buffered[side] >= ${PREFILL_SAMPLES}) primed[side] = true; else return 0 }
    if (!list.length) { primed[side] = false; return 0 }
    var chunk = list[0], p = pos[side], i = Math.floor(p), frac = p - i
    var a = chunk[i], b = i + 1 < chunk.length ? chunk[i + 1] : (list[1] ? list[1][0] : a)
    p += ratio
    if (p >= chunk.length) { p -= chunk.length; buffered[side] -= chunk.length; list.shift() }
    pos[side] = p
    return a + (b - a) * frac
  }
  function render(L, R, frames) {
    for (var i = 0; i < frames; i++) {
      var l = read(0), r = read(1)
      sq[0] += l * l; sq[1] += r * r
      if (mix) { var m = (l + r) * 0.7; L[i] = m; R[i] = m } else { L[i] = l; R[i] = r }
    }
    n += frames
    if (n >= rate / 12) { var out = [Math.sqrt(sq[0] / n), Math.sqrt(sq[1] / n)]; sq[0] = sq[1] = 0; n = 0; return out }
    return null
  }
  return { push: push, render: render, setMix: function (m) { mix = m } }
}
`
const WORKLET_SRC = `${MIXER_SRC}
class ListenProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.m = createMixer(sampleRate)
    this.port.onmessage = (e) => { var d = e.data; if (d.type === 'audio') this.m.push(d.side, d.samples); else if (d.type === 'mix') this.m.setMix(d.mix) }
  }
  process(inputs, outputs) {
    var out = outputs[0]
    var levels = this.m.render(out[0], out[1] || out[0], out[0].length)
    if (levels) this.port.postMessage({ type: 'level', levels: levels })
    return true
  }
}
registerProcessor('igani-listen', ListenProcessor)
`

type Mixer = { push: (side: number, samples: Float32Array) => void; render: (L: Float32Array, R: Float32Array, frames: number) => number[] | null; setMix: (m: number) => void }

interface Player {
  push(side: number, samples: Float32Array): void
  setMix(mono: boolean): void
  close(): void
}

/** Starts audio output (must be called from a click, so the browser allows sound). Reports levels per side ~12×/s. */
async function openPlayer(onLevels: (l: number, r: number) => void): Promise<Player> {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new Ctx()
  await ctx.resume().catch(() => undefined)
  if (ctx.audioWorklet) {
    const url = URL.createObjectURL(new Blob([WORKLET_SRC], { type: 'application/javascript' }))
    try {
      await ctx.audioWorklet.addModule(url)
    } finally {
      URL.revokeObjectURL(url)
    }
    const node = new AudioWorkletNode(ctx, 'igani-listen', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] })
    node.port.onmessage = (e: MessageEvent<{ type: string; levels: number[] }>) => {
      if (e.data.type === 'level') onLevels(e.data.levels[0] ?? 0, e.data.levels[1] ?? 0)
    }
    node.connect(ctx.destination)
    return {
      push: (side, samples) => node.port.postMessage({ type: 'audio', side, samples }, [samples.buffer]),
      setMix: (mono) => node.port.postMessage({ type: 'mix', mix: mono ? 1 : 0 }),
      close: () => {
        node.disconnect()
        void ctx.close().catch(() => undefined)
      },
    }
  }
  // Old browsers: the same mixer on the main thread
  const mixer = (new Function(`${MIXER_SRC}; return createMixer`)() as (rate: number) => Mixer)(ctx.sampleRate)
  const node = ctx.createScriptProcessor(2048, 0, 2)
  node.onaudioprocess = (e) => {
    const levels = mixer.render(e.outputBuffer.getChannelData(0), e.outputBuffer.getChannelData(1), e.outputBuffer.length)
    if (levels) onLevels(levels[0] ?? 0, levels[1] ?? 0)
  }
  node.connect(ctx.destination)
  return {
    push: (side, samples) => mixer.push(side, samples),
    setMix: (mono) => mixer.setMix(mono ? 1 : 0),
    close: () => {
      node.disconnect()
      void ctx.close().catch(() => undefined)
    },
  }
}

type Phase = 'starting' | 'connecting' | 'waiting' | 'live' | 'ended' | 'error'

const PHASE_TEXT: Record<Phase, string> = {
  starting: 'Starting…',
  connecting: 'Connecting to the relay…',
  waiting: 'Connected. Waiting for the call’s audio…',
  live: 'Listening. Neither side can hear you or see that you’re there.',
  ended: 'The call has ended.',
  error: 'Couldn’t listen in.',
}

/** The player an admin opens from Live now: audio, level meters per side, and a composer for notes to the rep. */
export function ListenPlayer({ call, onClose }: { call: LiveCall; onClose: () => void }): React.ReactElement {
  const [phase, setPhase] = useState<Phase>('starting')
  const [error, setError] = useState<string | null>(null)
  const [mono, setMono] = useState(false)
  const [levels, setLevels] = useState<[number, number]>([0, 0])
  const [names, setNames] = useState({ rep: call.rep.name, contact: call.contact })
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const player = useRef<Player | null>(null)
  const socket = useRef<WebSocket | null>(null)
  const startedAt = useRef(0)
  const closed = useRef(false)
  /** listenStart succeeded (so a stop is worth logging) */
  const listening = useRef(false)
  const notes = useTeamNotes(call.callId)

  const teardown = useCallback((reason: Phase, message?: string): void => {
    if (closed.current) return
    closed.current = true
    socket.current?.close()
    socket.current = null
    player.current?.close()
    player.current = null
    setPhase(reason)
    if (message) setError(message)
    if (listening.current) {
      listening.current = false
      void listenStop(call.callId, (Date.now() - startedAt.current) / 1000)
    }
  }, [call.callId])

  useEffect(() => {
    let cancelled = false
    closed.current = false
    const run = async (): Promise<void> => {
      const r = await listenStart(call.callId)
      if (cancelled) return
      if (!r.ok) {
        setPhase('error')
        setError(r.error)
        closed.current = true
        return
      }
      listening.current = true
      setNames({ rep: r.data.rep, contact: r.data.contact })
      const roles: ListenRoles = r.data.roles
      const sideOf = (track: number): number => ((track === 0 ? roles.inbound : roles.outbound) === 'rep' ? 0 : 1)
      try {
        player.current = await openPlayer((l, rr) => setLevels([l, rr]))
      } catch (e) {
        setPhase('error')
        setError(`Your browser couldn’t play audio: ${e instanceof Error ? e.message : 'unknown error'}`)
        closed.current = true
        return
      }
      startedAt.current = Date.now()
      setPhase('connecting')
      const ws = new WebSocket(`${r.data.relayUrl}/listen?token=${encodeURIComponent(r.data.token)}`)
      ws.binaryType = 'arraybuffer'
      socket.current = ws
      ws.onopen = () => setPhase((p) => (p === 'connecting' ? 'waiting' : p))
      ws.onmessage = (ev: MessageEvent<ArrayBuffer | string>) => {
        if (typeof ev.data === 'string') {
          try {
            const msg = JSON.parse(ev.data) as { type?: string; streaming?: boolean }
            if (msg.type === 'ended') teardown('ended')
            else if (msg.type === 'stream' || (msg.type === 'hello' && msg.streaming)) setPhase((p) => (p === 'waiting' || p === 'connecting' ? 'live' : p))
          } catch {}
          return
        }
        const u8 = new Uint8Array(ev.data)
        if (u8.length < 2) return
        const samples = new Float32Array(u8.length - 1)
        for (let i = 1; i < u8.length; i++) samples[i - 1] = MULAW[u8[i]!]!
        player.current?.push(sideOf(u8[0]!), samples)
        setPhase((p) => (p === 'waiting' ? 'live' : p))
      }
      ws.onerror = () => teardown('error', 'The connection to the relay failed.')
      ws.onclose = (e) => {
        if (closed.current) return
        teardown(e.code === 1000 || e.code === 1001 ? 'ended' : 'error', e.code === 1008 ? 'The relay refused the session (expired or invalid token). Try again.' : e.code === 1000 || e.code === 1001 ? undefined : 'The relay closed the connection.')
      }
    }
    void run()
    return () => {
      cancelled = true
      teardown('ended')
    }
  }, [call.callId, teardown])

  useEffect(() => player.current?.setMix(mono), [mono])

  const send = async (): Promise<void> => {
    const body = draft.trim()
    if (!body || sending) return
    setSending(true)
    setSent(null)
    const r = await sendCallNote(call.callId, body)
    setSending(false)
    if (r.ok) {
      setDraft('')
      setSent(`Sent to ${names.rep}`)
      window.setTimeout(() => setSent(null), 3000)
    } else setSent(r.error)
  }

  const over = phase === 'ended' || phase === 'error'
  return (
    <div className="mt-3 rounded-xl border border-emerald-500/30 bg-card/80 p-3" aria-label="Listening in">
      <div className="flex flex-wrap items-center gap-2">
        <Ear className={cn('h-4 w-4', phase === 'live' ? 'animate-pulse text-emerald-300' : 'text-muted-foreground')} aria-hidden />
        <span className="text-sm font-medium">
          {names.rep} <span className="text-muted-foreground">→</span> {names.contact}
        </span>
        <span role="status" className={cn('text-xs', phase === 'error' ? 'text-rose-300' : phase === 'live' ? 'text-emerald-200' : 'text-muted-foreground')}>
          {error ?? PHASE_TEXT[phase]}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {!over ? (
            <button type="button" onClick={() => setMono((m) => !m)} aria-pressed={mono} className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground hover:text-foreground">
              {mono ? 'Mixed' : 'Rep left · client right'}
            </button>
          ) : null}
          <button type="button" onClick={() => (over ? onClose() : teardown('ended'))} className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-emerald-950 hover:bg-emerald-400">
            <EarOff className="h-3.5 w-3.5" aria-hidden /> {over ? 'Close' : 'Stop'}
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Meter label={names.rep} side={mono ? 'both' : 'left'} level={levels[0]} muted={over} />
        <Meter label={names.contact} side={mono ? 'both' : 'right'} level={levels[1]} muted={over} />
      </div>
      {!over ? (
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={200}
            dir="auto"
            placeholder={`A note to ${names.rep} (they see it on their call screen; the client doesn’t)`}
            aria-label={`Note to ${names.rep}`}
            className="h-9 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm"
          />
          <button type="submit" disabled={!draft.trim() || sending} className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
            <Send className="h-3.5 w-3.5" aria-hidden /> Send
          </button>
        </form>
      ) : null}
      {sent ? <p className="mt-1.5 text-xs text-muted-foreground">{sent}</p> : null}
      <TeamNotes state={{ notes: notes.notes, fresh: [] }} className="mt-3" />
    </div>
  )
}

function Meter({ label, side, level, muted }: { label: string; side: 'left' | 'right' | 'both'; level: number; muted: boolean }): React.ReactElement {
  // speech RMS is small; map it so a normal voice fills most of the bar
  const pct = muted ? 0 : Math.min(100, Math.round(Math.sqrt(Math.min(1, level * 6)) * 100))
  return (
    <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
      <div className="flex items-center justify-between text-xs">
        <span className="truncate font-medium">{label}</span>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{side === 'both' ? 'both ears' : `${side} ear`}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-foreground/10" role="meter" aria-label={`${label} level`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
