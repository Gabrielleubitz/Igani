'use client'

/**
 * Igani Meet's own sounds, played by the browser (no files): soft bell tones in D major, the same "voice" for every cue
 * so the call sounds like one product. Jitsi's own join/leave sounds are switched off.
 */

type Cue = 'ready' | 'join' | 'leave' | 'recStart' | 'recStop' | 'message' | 'test'

/** [frequency Hz, start offset s, length s, loudness 0..1] */
type Note = [number, number, number, number]
const D5 = 587.33
const Fs5 = 739.99
const A5 = 880
const D6 = 1174.66

const CUES: Record<Cue, Note[]> = {
  // you're in: a rising four-note Igani arpeggio
  ready: [
    [D5, 0, 0.5, 0.55],
    [Fs5, 0.09, 0.5, 0.5],
    [A5, 0.18, 0.55, 0.5],
    [D6, 0.27, 0.9, 0.45],
  ],
  // someone joined: two bright notes up
  join: [
    [A5, 0, 0.45, 0.5],
    [D6, 0.11, 0.8, 0.45],
  ],
  // someone left: the same two notes, down and quieter
  leave: [
    [A5, 0, 0.4, 0.35],
    [D5, 0.12, 0.7, 0.3],
  ],
  recStart: [
    [D6, 0, 0.18, 0.4],
    [D6, 0.2, 0.35, 0.4],
  ],
  recStop: [
    [A5, 0, 0.18, 0.35],
    [D5, 0.16, 0.45, 0.35],
  ],
  message: [[D6, 0, 0.35, 0.28]],
  test: [
    [D5, 0, 0.5, 0.55],
    [A5, 0.14, 0.5, 0.5],
    [D6, 0.28, 0.9, 0.45],
  ],
}

let ctx: AudioContext | null = null
let sinkId = ''
let muted = false

function context(): AudioContext | null {
  if (typeof window === 'undefined' || typeof AudioContext === 'undefined') return null
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined)
  return ctx
}

/** Call from a click (browsers only allow sound after the person has interacted). */
export function unlockSounds(): void {
  context()
}

/** Plays cues on the chosen speaker where the browser allows it (Chrome, Edge). */
export function setSoundOutput(id: string): void {
  sinkId = id
  const c = context() as (AudioContext & { setSinkId?: (id: string) => Promise<void> }) | null
  if (c?.setSinkId && id) void c.setSinkId(id).catch(() => undefined)
}

export function setSoundsMuted(v: boolean): void {
  muted = v
}

export function playCue(cue: Cue): void {
  if (muted) return
  const c = context()
  if (!c) return
  if (sinkId) setSoundOutput(sinkId)
  const master = c.createGain()
  master.gain.value = 0.22
  // a touch of warmth: roll off the harsh top
  const tone = c.createBiquadFilter()
  tone.type = 'lowpass'
  tone.frequency.value = 5200
  master.connect(tone).connect(c.destination)
  const t0 = c.currentTime + 0.02
  for (const [freq, at, len, vol] of CUES[cue]) {
    // a bell: the note plus a quiet octave-and-a-fifth partial that fades faster
    for (const [mult, part, decay] of [
      [1, 1, 1],
      [3, 0.12, 0.45],
    ] as const) {
      const osc = c.createOscillator()
      const g = c.createGain()
      osc.type = 'sine'
      osc.frequency.value = freq * mult
      const start = t0 + at
      const end = start + len * decay
      g.gain.setValueAtTime(0, start)
      g.gain.linearRampToValueAtTime(vol * part, start + 0.012)
      g.gain.exponentialRampToValueAtTime(0.0001, end)
      osc.connect(g).connect(master)
      osc.start(start)
      osc.stop(end + 0.05)
    }
  }
}

