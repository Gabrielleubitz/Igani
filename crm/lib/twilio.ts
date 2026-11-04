import 'server-only'
import twilio from 'twilio'
import { appUrl } from './env'

/**
 * Twilio for the dialer (docs/DIALER.md). Credentials come from the environment only. Nothing here is reachable
 * without either a CRM session (token) or a valid Twilio signature (webhooks).
 */
const KEYS = ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_API_KEY_SID', 'TWILIO_API_KEY_SECRET', 'TWILIO_TWIML_APP_SID'] as const
export type TwilioKey = (typeof KEYS)[number]

export interface TwilioConfig {
  accountSid: string
  authToken: string
  apiKeySid: string
  apiKeySecret: string
  appSid: string
}

/** Which settings are present (names only, never values) — for the admin setup checklist. */
export function twilioSetup(): { key: TwilioKey; present: boolean }[] {
  return KEYS.map((key) => ({ key, present: Boolean(process.env[key]?.trim()) }))
}

export function twilioConfig(): TwilioConfig | null {
  const v = (k: TwilioKey): string => process.env[k]?.trim() ?? ''
  const c = { accountSid: v('TWILIO_ACCOUNT_SID'), authToken: v('TWILIO_AUTH_TOKEN'), apiKeySid: v('TWILIO_API_KEY_SID'), apiKeySecret: v('TWILIO_API_KEY_SECRET'), appSid: v('TWILIO_TWIML_APP_SID') }
  return Object.values(c).every(Boolean) ? c : null
}

/**
 * Demo mode: the whole dialer works without Twilio (fake call progress, real call rows marked `simulated`).
 * Development only, and only while Twilio isn't configured — production can never make simulated calls.
 */
export const dialerDemo = (): boolean => process.env.NODE_ENV !== 'production' && !twilioConfig()

/** The Twilio client identity for a CRM user (what the browser registers as, and what Twilio sends back as From). */
export const identityFor = (userId: string): string => `u_${userId}`
export function userIdFromClient(from: string | null | undefined): string | null {
  const m = (from ?? '').match(/^client:u_([a-z0-9]{20,40})$/i)
  return m ? m[1]! : null
}

/** Short-lived browser token: outgoing calls through our TwiML app (incoming is allowed for step 2). */
export function voiceToken(c: TwilioConfig, userId: string, ttlSec = 3600): string {
  const { AccessToken } = twilio.jwt
  const token = new AccessToken(c.accountSid, c.apiKeySid, c.apiKeySecret, { identity: identityFor(userId), ttl: ttlSec })
  token.addGrant(new AccessToken.VoiceGrant({ outgoingApplicationSid: c.appSid, incomingAllow: true }))
  return token.toJwt()
}

/** Public URL of one of our voice webhooks (what Twilio calls, and what its signature is computed over). */
export function voiceUrl(path: 'twiml' | 'status' | 'dial-done' | 'recording' | 'whisper', callId?: string): string {
  // appUrl() resolves the path itself (appUrl() alone ends in '/', which would make '//api' and break signatures)
  return `${appUrl(`/api/public/voice/${path}`)}${callId ? `?callId=${encodeURIComponent(callId)}` : ''}`
}

/**
 * Reads a Twilio webhook (form-encoded) and checks its X-Twilio-Signature against our auth token and the exact public
 * URL. Returns the params, or null when it isn't genuinely from Twilio.
 */
export async function readTwilioWebhook(req: Request, path: 'twiml' | 'status' | 'dial-done' | 'recording' | 'whisper'): Promise<Record<string, string> | null> {
  const c = twilioConfig()
  if (!c) return null
  const signature = req.headers.get('x-twilio-signature')
  if (!signature) return null
  const body = await req.text().catch(() => '')
  if (body.length > 20_000) return null
  const params = Object.fromEntries(new URLSearchParams(body))
  const callId = new URL(req.url).searchParams.get('callId') ?? undefined
  const url = voiceUrl(path, callId)
  return twilio.validateRequest(c.authToken, signature, url, params) ? params : null
}

/** Numbers on the Twilio account, for assigning to teammates. */
export async function listTwilioNumbers(c: TwilioConfig): Promise<{ sid: string; number: string; name: string; voice: boolean }[]> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const rows = await client.incomingPhoneNumbers.list({ limit: 200 })
  return rows.map((r) => ({ sid: r.sid, number: r.phoneNumber, name: r.friendlyName, voice: r.capabilities?.voice !== false }))
}

export const twiml = (): InstanceType<typeof twilio.twiml.VoiceResponse> => new twilio.twiml.VoiceResponse()
