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

/** Short-lived browser token: outgoing calls through our TwiML app, and incoming calls to this user's browser. */
export function voiceToken(c: TwilioConfig, userId: string, ttlSec = 3600): string {
  const { AccessToken } = twilio.jwt
  const token = new AccessToken(c.accountSid, c.apiKeySid, c.apiKeySecret, { identity: identityFor(userId), ttl: ttlSec })
  token.addGrant(new AccessToken.VoiceGrant({ outgoingApplicationSid: c.appSid, incomingAllow: true }))
  return token.toJwt()
}

export type VoicePath = 'twiml' | 'status' | 'dial-done' | 'recording' | 'incoming' | 'incoming-done' | 'voicemail-done' | 'sms' | 'sms-status'

/** Public URL of one of our voice webhooks (what Twilio calls, and what its signature is computed over). */
export function voiceUrl(path: VoicePath, callId?: string): string {
  // appUrl() resolves the path itself (appUrl() alone ends in '/', which would make '//api' and break signatures)
  return `${appUrl(`/api/public/voice/${path}`)}${callId ? `?callId=${encodeURIComponent(callId)}` : ''}`
}

/**
 * Reads a Twilio webhook (form-encoded) and checks its X-Twilio-Signature against our auth token and the exact public
 * URL. Returns the params, or null when it isn't genuinely from Twilio.
 */
export async function readTwilioWebhook(req: Request, path: VoicePath): Promise<Record<string, string> | null> {
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
export interface TwilioNumberInfo {
  sid: string
  number: string
  name: string
  voice: boolean
  /** can receive text messages */
  sms: boolean
  voiceUrl: string
  voiceAppSid: string
  smsUrl: string
  smsAppSid: string
}

export async function listTwilioNumbers(c: TwilioConfig): Promise<TwilioNumberInfo[]> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const rows = await client.incomingPhoneNumbers.list({ limit: 200 })
  return rows.map((r) => ({
    sid: r.sid,
    number: r.phoneNumber,
    name: r.friendlyName,
    voice: r.capabilities?.voice !== false,
    sms: Boolean(r.capabilities?.sms),
    voiceUrl: r.voiceUrl ?? '',
    voiceAppSid: r.voiceApplicationSid ?? '',
    smsUrl: r.smsUrl ?? '',
    smsAppSid: r.smsApplicationSid ?? '',
  }))
}

/** Incoming calls ring in the CRM, and (when the number takes texts) incoming texts land in the Messages tab. */
export function routedToCrm(n: Pick<TwilioNumberInfo, 'sms' | 'voiceUrl' | 'voiceAppSid' | 'smsUrl' | 'smsAppSid'>): boolean {
  return n.voiceUrl === incomingUrl() && !n.voiceAppSid && (!n.sms || (n.smsUrl === smsUrl() && !n.smsAppSid))
}

/** Where a number's incoming calls go: our CRM webhook, or something else (kept so it can be restored). */
export const incomingUrl = (): string => voiceUrl('incoming')
export const smsUrl = (): string => voiceUrl('sms')

/** A number's routing before the CRM took it over (the sms fields are missing in routings saved before texting existed). */
export type NumberRouting = {
  voiceUrl: string
  voiceMethod: string
  voiceAppSid: string
  smsUrl?: string
  smsMethod?: string
  smsAppSid?: string
}

/** Point a number's incoming calls (and texts, if it takes them) at the CRM, returning what it was set to before (for undo). */
export async function routeNumberToCrm(c: TwilioConfig, numberSid: string): Promise<NumberRouting> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const before = await client.incomingPhoneNumbers(numberSid).fetch()
  const sms = Boolean(before.capabilities?.sms)
  await client.incomingPhoneNumbers(numberSid).update({ voiceUrl: incomingUrl(), voiceMethod: 'POST', voiceApplicationSid: '', ...(sms ? { smsUrl: smsUrl(), smsMethod: 'POST', smsApplicationSid: '' } : {}) })
  return {
    voiceUrl: before.voiceUrl ?? '',
    voiceMethod: before.voiceMethod ?? 'POST',
    voiceAppSid: before.voiceApplicationSid ?? '',
    ...(sms ? { smsUrl: before.smsUrl ?? '', smsMethod: before.smsMethod ?? 'POST', smsAppSid: before.smsApplicationSid ?? '' } : {}),
  }
}

export async function restoreNumberRouting(c: TwilioConfig, numberSid: string, prev: NumberRouting): Promise<void> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  await client.incomingPhoneNumbers(numberSid).update({
    voiceUrl: prev.voiceUrl,
    voiceMethod: prev.voiceMethod === 'GET' ? 'GET' : 'POST',
    voiceApplicationSid: prev.voiceAppSid,
    ...(prev.smsUrl !== undefined ? { smsUrl: prev.smsUrl, smsMethod: prev.smsMethod === 'GET' ? 'GET' : 'POST', smsApplicationSid: prev.smsAppSid ?? '' } : {}),
  })
}

/** Send a text from one of our numbers. Twilio reports delivery to the status URL. */
export async function sendTwilioSms(c: TwilioConfig, msg: { from: string; to: string; body: string; statusCallback: string }): Promise<{ sid: string; status: string }> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const m = await client.messages.create({ from: msg.from, to: msg.to, body: msg.body, statusCallback: msg.statusCallback })
  return { sid: m.sid, status: m.status }
}

/** Twilio's own record of a call (the truth when one of our callbacks went missing). Null if it can't be read. */
export async function fetchTwilioCall(c: TwilioConfig, callSid: string): Promise<{ status: string; duration: number | null } | null> {
  if (!/^CA[0-9a-f]{32}$/i.test(callSid)) return null
  try {
    const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
    const call = await client.calls(callSid).fetch()
    const d = Number.parseInt(String(call.duration ?? ''), 10)
    return { status: call.status, duration: Number.isFinite(d) ? d : null }
  } catch {
    return null
  }
}

export const twiml = (): InstanceType<typeof twilio.twiml.VoiceResponse> => new twilio.twiml.VoiceResponse()
