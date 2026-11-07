/**
 * Reading the call's connection health from 8x8's connection stats (api.getConnectionStats()), without trusting its
 * exact shape: every field is optional and checked. Used to show a signal indicator and to protect the audio when a
 * connection struggles (lower video first, then pause incoming video).
 */

export interface NetSample {
  /** % of packets lost going out (our upload) and coming in */
  lossUp: number
  lossDown: number
  /** round trip to the media server (or the other person, in a 1:1 call), ms */
  rtt: number | null
  upKbps: number | null
  downKbps: number | null
  /** 8x8's own 0–100 score, when it gives one */
  score: number | null
}

export type NetLevel = 'good' | 'weak' | 'poor'

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v)) ? Number(v) : null)
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

export function readNet(raw: unknown): NetSample {
  const o = obj(raw)
  const loss = obj(o.packetLoss)
  const bitrate = obj(o.bitrate)
  const transport = Array.isArray(o.transport) ? o.transport.map(obj) : []
  const rtts = [num(o.jvbRTT), num(o.rtt), ...transport.map((t) => num(t.rtt))].filter((x): x is number => x !== null && x > 0)
  return {
    lossUp: num(loss.upload) ?? 0,
    lossDown: num(loss.download) ?? 0,
    rtt: rtts.length ? Math.max(...rtts) : null,
    upKbps: num(bitrate.upload),
    downKbps: num(bitrate.download),
    score: num(o.connectionQuality) ?? num(o.quality),
  }
}

export function netLevel(s: NetSample): NetLevel {
  if (s.lossUp >= 12 || s.lossDown >= 15 || (s.rtt ?? 0) >= 800 || (s.score !== null && s.score < 30)) return 'poor'
  if (s.lossUp >= 4 || s.lossDown >= 6 || (s.rtt ?? 0) >= 350 || (s.score !== null && s.score < 60)) return 'weak'
  return 'good'
}
