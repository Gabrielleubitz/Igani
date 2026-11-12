/**
 * The chat chime on the web CRM (the same bell the iPhone app plays, /public/sounds/igani-chat*.wav). Browsers keep
 * audio silent until the person has clicked or typed on the page, so the first gesture wakes an AudioContext that
 * then stays usable, even once the tab is in the background. Off/on is this browser's choice (localStorage).
 */

const PREF_KEY = 'igani-chat-sound'
const FILES = { chime: '/sounds/igani-chat.wav', soft: '/sounds/igani-chat-soft.wav' } as const
export type ChatSoundKind = keyof typeof FILES

let ctx: AudioContext | null = null
const buffers = new Map<ChatSoundKind, Promise<AudioBuffer | null>>()
let listening = false
let lastPlayed = 0

export function chatSoundEnabled(): boolean {
  try {
    return window.localStorage.getItem(PREF_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setChatSoundEnabled(on: boolean): void {
  try {
    if (on) window.localStorage.removeItem(PREF_KEY)
    else window.localStorage.setItem(PREF_KEY, 'off')
  } catch {
    /* storage blocked: stays on */
  }
}

/** Audio can play right now (the page has been clicked or typed on since it loaded). */
export const chatSoundReady = (): boolean => ctx?.state === 'running'

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = typeof window === 'undefined' ? undefined : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  if (!Ctor) return null
  ctx = new Ctor()
  return ctx
}

function load(kind: ChatSoundKind): Promise<AudioBuffer | null> {
  let p = buffers.get(kind)
  if (!p) {
    p = (async () => {
      const c = context()
      if (!c) return null
      try {
        const res = await fetch(FILES[kind])
        return await c.decodeAudioData(await res.arrayBuffer())
      } catch {
        return null
      }
    })()
    buffers.set(kind, p)
  }
  return p
}

async function wake(): Promise<boolean> {
  const c = context()
  if (!c) return false
  if (c.state !== 'running') await c.resume().catch(() => undefined)
  return c.state === 'running'
}

/** Call once on a page that may chime: the first click or key wakes the audio and fetches the sounds. */
export function unlockChatSound(): void {
  if (listening || typeof window === 'undefined') return
  listening = true
  const onGesture = (): void => {
    void wake().then((ok) => {
      if (!ok) return
      for (const k of Object.keys(FILES) as ChatSoundKind[]) void load(k)
      for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.removeEventListener(ev, onGesture, true)
    })
  }
  for (const ev of ['pointerdown', 'keydown', 'touchstart']) window.addEventListener(ev, onGesture, { capture: true, passive: true })
  // some browsers allow audio straight away (a site played sound here before): then nothing is waiting on a click
  onGesture()
}

/**
 * Play the chime (a new message while you're away) or the softer note (one on screen, elsewhere in the CRM).
 * Resolves true when it actually sounded. `force` ignores the on/off choice (the settings preview).
 */
export async function playChatSound(kind: ChatSoundKind, opts: { force?: boolean } = {}): Promise<boolean> {
  if (!opts.force && !chatSoundEnabled()) return false
  if (!(await wake())) return false
  const c = ctx!
  const buf = await load(kind)
  if (!buf) return false
  // a burst of messages is one sound, not a drum roll
  if (!opts.force && performance.now() - lastPlayed < 1500) return false
  lastPlayed = performance.now()
  const src = c.createBufferSource()
  src.buffer = buf
  const gain = c.createGain()
  gain.gain.value = kind === 'soft' ? 0.6 : 1
  src.connect(gain).connect(c.destination)
  src.start()
  return true
}
