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
}
export interface VoiceEngine {
  kind: 'twilio' | 'demo'
  connect(callId: string, to: string): Promise<ActiveCall>
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
  const device = new Device(token, { closeProtection: 'You’re on a call. Leave and hang up?', logLevel: 'error' })
  device.on('tokenWillExpire', async () => {
    const t = await fetchVoiceToken()
    if ('token' in t) device.updateToken(t.token)
  })
  return {
    kind: 'twilio',
    async connect(callId, to) {
      const call = await device.connect({ params: { callId, To: to } })
      return {
        on: (event, cb) => {
          call.on(event, (e?: { message?: string; code?: number }) => cb(event === 'error' && e ? { message: e.message ?? 'error', code: e.code } : undefined))
        },
        mute: (on) => call.mute(on),
        sendDigits: (d) => call.sendDigits(d),
        hangup: () => call.disconnect(),
      }
    },
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
      }
    },
    destroy: () => undefined,
  }
}
