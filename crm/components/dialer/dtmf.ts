/**
 * Keypad tones: each key plays its real touch-tone (DTMF) pair, one low (row) and one high (column) frequency, the
 * same sound a phone makes. Played in the browser with Web Audio; nothing is sent anywhere.
 */

const ROW = [697, 770, 852, 941] as const
const COL = [1209, 1336, 1477] as const
const LAYOUT = ['123', '456', '789', '*0#'] as const

/** The [low, high] frequencies (Hz) for a key, or null for anything that isn't a keypad key. */
export function dtmfPair(key: string): [number, number] | null {
  const k = key === '+' ? '0' : key
  for (let r = 0; r < LAYOUT.length; r++) {
    const c = LAYOUT[r]!.indexOf(k)
    if (c >= 0) return [ROW[r]!, COL[c]!]
  }
  return null
}

let ctx: AudioContext | null = null

/** Play a key's tone (about 130 ms, soft edges so it never clicks). Silent where audio isn't available. */
export function playDtmf(key: string, ms = 130): void {
  const pair = dtmfPair(key)
  if (!pair || typeof window === 'undefined') return
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return
    ctx ??= new AC()
    if (ctx.state === 'suspended') void ctx.resume()
    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.09, now + 0.006)
    gain.gain.setValueAtTime(0.09, now + ms / 1000 - 0.012)
    gain.gain.linearRampToValueAtTime(0, now + ms / 1000)
    gain.connect(ctx.destination)
    for (const f of pair) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = f
      osc.connect(gain)
      osc.start(now)
      osc.stop(now + ms / 1000 + 0.02)
    }
  } catch {
    // no audio (autoplay rules, old browser): the keypad still works
  }
}
