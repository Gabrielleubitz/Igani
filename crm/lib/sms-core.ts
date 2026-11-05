/**
 * Text messages, the parts the browser needs too: how many SMS a message costs (Hebrew and emoji switch to the
 * 70-character unicode encoding), and Twilio's statuses in words.
 */

const GSM = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà^{}\\[~\]|€]*$/

/** Longest text the CRM sends (Twilio's limit is 1600 characters). */
export const SMS_MAX = 1600

export function smsSegments(body: string): { segments: number; unicode: boolean; perSegment: number } {
  const unicode = !GSM.test(body)
  const len = unicode ? [...body].length : body.length + (body.match(/[\^{}\\[~\]|€]/g)?.length ?? 0)
  const single = unicode ? 70 : 160
  const multi = unicode ? 67 : 153
  return { segments: len === 0 ? 0 : len <= single ? 1 : Math.ceil(len / multi), unicode, perSegment: len <= single ? single : multi }
}

export const SMS_STATUS_LABEL: Record<string, string> = {
  queued: 'Sending…',
  accepted: 'Sending…',
  sending: 'Sending…',
  sent: 'Sent',
  delivered: 'Delivered',
  undelivered: 'Not delivered',
  failed: 'Failed',
  received: 'Received',
}

/** Twilio's message status, kept only when it's one we know. */
export function smsStatus(s: string | null | undefined): string | null {
  return s && s in SMS_STATUS_LABEL ? s : null
}

/** Status moves forward only (Twilio's callbacks can arrive out of order). */
const RANK: Record<string, number> = { queued: 0, accepted: 0, sending: 1, sent: 2, delivered: 3, undelivered: 3, failed: 3 }
export function smsStatusAdvances(from: string, to: string): boolean {
  return (RANK[to] ?? -1) > (RANK[from] ?? -1)
}
