'use client'

import { simulateCallProgress } from '@/app/actions/calls'

/**
 * The dialer talks to a VoiceEngine: Twilio's Voice SDK in real use, or a demo engine (development without Twilio)
 * that walks a call through the same states. The UI never knows which one it has.
 */
export interface ActiveCall {
  on(event: 'ringing' | 'accept' | 'disconnect' | 'cancel' | 'error', cb: (err?: { message: string; code?: number }) => void): void
  mute(on: boolean): void
  sendDigits(digits: string): void
  hangup(): void
  /** The audio of both sides (rep's microphone, the client's voice), for live hints. Null where the engine cannot provide it. */
  streams(): { local: MediaStream | null; remote: MediaStream | null }
}
/** A call ringing in this browser. accept() answers it; reject() sends the caller to voicemail. */
export interface IncomingCall {
  callId: string
  from: string
  accept(): ActiveCall
  reject(): void
  /** the caller hung up (or another tab answered) before we did */
  onGone(cb: () => void): void
}
export interface VoiceEngine {
  kind: 'twilio' | 'demo'
  connect(callId: string, to: string): Promise<ActiveCall>
  /** start receiving calls (rings with the Igani ringtone) */
  listen(onIncoming: (call: IncomingCall) => void): Promise<void>
  /** false once the session can't be trusted (token refresh failed, device error): build a new one */
  healthy(): boolean
  destroy(): void
}

type TokenReply = { token: string; ttlSec: number } | { demo: true } | { error: string }

export async function fetchVoiceToken(): Promise<TokenReply> {
  const res = await fetch('/api/voice/token', { cache: 'no-store' })
  const body = (await res.json().catch(() => ({ error: 'Could not reach the phone service.' }))) as TokenReply
  return res.ok ? body : { error: 'error' in body ? body.error : 'Calling is not available right now.' }
}

/** Twilio error codes → plain words. */
export function voiceErrorText(err: { message?: string; code?: number } | undefined): string {
  const code = err?.code
  if (code === 31208 || code === 31401 || code === 31402 || /permission|notallowed/i.test(err?.message ?? '')) return 'Your browser blocked the microphone. Allow it for app.igani.co (the icon in the address bar) and try again.'
  if (code === 31005 || code === 31009 || code === 53000 || code === 53405) return 'The connection to the phone service dropped. Check your internet and try again.'
  if (code === 20101 || code === 20104 || code === 31204 || code === 31205) return 'Your phone session expired. Try the call again.'
  if (code === 31486) return 'The line is busy.'
  return err?.message ? `The call failed: ${err.message}` : 'The call failed. Please try again.'
}

/** Real calls through Twilio. The Device is created once and reused; its token is refreshed before it expires. */
export async function twilioEngine(token: string): Promise<VoiceEngine> {
  const { Device } = await import('@twilio/voice-sdk')
  // SDK 2.x: ringing state is always on and Opus is preferred by default
  const device = new Device(token, { closeProtection: 'You’re on a call. Leave and hang up?', logLevel: 'error', sounds: { incoming: '/sounds/igani-ring.wav' } })
  let ok = true
  device.on('tokenWillExpire', async () => {
    try {
      const t = await fetchVoiceToken()
      if ('token' in t) device.updateToken(t.token)
      else ok = false // signed out or line removed: the next call asks again and shows why
    } catch {
      ok = false
    }
  })
  device.on('error', () => {
    ok = false
  })
  type TwilioCall = Awaited<ReturnType<typeof device.connect>>
  const wrap = (call: TwilioCall): ActiveCall => ({
    on: (event, cb) => {
      call.on(event, (e?: { message?: string; code?: number }) => cb(event === 'error' && e ? { message: e.message ?? 'error', code: e.code } : undefined))
    },
    mute: (on) => call.mute(on),
    sendDigits: (d) => call.sendDigits(d),
    hangup: () => call.disconnect(),
    streams: () => ({ local: (call.getLocalStream?.() as MediaStream | undefined) ?? null, remote: (call.getRemoteStream?.() as MediaStream | undefined) ?? null }),
  })
  return {
    kind: 'twilio',
    async connect(callId, to) {
      return wrap(await device.connect({ params: { callId, To: to } }))
    },
    async listen(onIncoming) {
      device.on('incoming', (call: TwilioCall) => {
        const callId = call.customParameters.get('callId') ?? ''
        onIncoming({
          callId,
          from: call.parameters.From ?? '',
          accept: () => {
            call.accept()
            return wrap(call)
          },
          reject: () => call.reject(),
          onGone: (cb) => {
            call.on('cancel', cb)
            call.on('disconnect', cb)
          },
        })
      })
      await device.register()
    },
    healthy: () => ok && device.state !== 'destroyed',
    destroy: () => device.destroy(),
  }
}

/**
 * Demo engine (development only, when Twilio isn't configured): rings for a moment, then "answers". Numbers ending
 * in 0000 never answer, numbers ending in 1111 are busy, so the wrap-up's suggestions can be seen too.
 */
export function demoEngine(): VoiceEngine {
  return {
    kind: 'demo',
    async connect(callId, to) {
      const handlers: Record<string, ((e?: { message: string }) => void)[]> = {}
      const emit = (e: string, arg?: { message: string }): void => (handlers[e] ?? []).forEach((h) => h(arg))
      const progress = (status: 'RINGING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_ANSWER' | 'BUSY'): void => void simulateCallProgress({ callId, status })
      let state: 'connecting' | 'ringing' | 'live' | 'over' = 'connecting'
      const timers: number[] = []
      const end = (status: 'COMPLETED' | 'CANCELED' | 'NO_ANSWER' | 'BUSY', event: 'disconnect' | 'cancel' = 'disconnect'): void => {
        if (state === 'over') return
        state = 'over'
        timers.forEach((t) => window.clearTimeout(t))
        progress(status)
        emit(event)
      }
      timers.push(
        window.setTimeout(() => {
          if (state !== 'connecting') return
          state = 'ringing'
          progress('RINGING')
          emit('ringing')
        }, 700),
      )
      timers.push(
        window.setTimeout(() => {
          if (state !== 'ringing') return
          if (to.endsWith('1111')) return end('BUSY')
          if (to.endsWith('0000')) return
          state = 'live'
          progress('IN_PROGRESS')
          emit('accept')
        }, 3200),
      )
      timers.push(window.setTimeout(() => state === 'ringing' && end('NO_ANSWER'), 12000))
      return {
        on: (event, cb) => void (handlers[event] = [...(handlers[event] ?? []), cb]),
        mute: () => undefined,
        sendDigits: () => undefined,
        hangup: () => end(state === 'live' ? 'COMPLETED' : 'CANCELED'),
        streams: () => ({ local: null, remote: null }),
      }
    },
    // Demo: "Simulate incoming call" (development only) rings this browser with a fake caller
    async listen(onIncoming) {
      window.addEventListener('igani:demo-incoming', ((e: CustomEvent<{ callId: string; from: string }>) => {
        let gone: (() => void) | null = null
        // the same Igani ringtone Twilio plays for real calls
        const ring = new Audio('/sounds/igani-ring.wav')
        ring.loop = true
        void ring.play().catch(() => undefined)
        const stopRing = (): void => {
          ring.pause()
          ring.currentTime = 0
        }
        const timer = window.setTimeout(() => {
          stopRing()
          gone?.()
        }, 20000) // caller gives up after 20 s
        onIncoming({
          callId: e.detail.callId,
          from: e.detail.from,
          accept: () => {
            window.clearTimeout(timer)
            stopRing()
            void simulateCallProgress({ callId: e.detail.callId, status: 'IN_PROGRESS' })
            const handlers: Record<string, (() => void)[]> = {}
            return {
              on: (event, cb) => void (handlers[event] = [...(handlers[event] ?? []), cb as () => void]),
              mute: () => undefined,
              sendDigits: () => undefined,
              hangup: () => {
                void simulateCallProgress({ callId: e.detail.callId, status: 'COMPLETED' })
                ;(handlers.disconnect ?? []).forEach((h) => h())
              },
              streams: () => ({ local: null, remote: null }),
            }
          },
          reject: () => {
            window.clearTimeout(timer)
            stopRing()
            void simulateCallProgress({ callId: e.detail.callId, status: 'NO_ANSWER' })
          },
          onGone: (cb) => {
            gone = () => {
              void simulateCallProgress({ callId: e.detail.callId, status: 'NO_ANSWER' })
              cb()
            }
          },
        })
      }) as EventListener)
    },
    healthy: () => true,
    destroy: () => undefined,
  }
}
