/**
 * Igani email design tokens. White card on a soft blue-grey canvas, navy ink, Igani blue accent.
 * Logo rule: white backgrounds use "igani-logo 2.png" (dark wordmark, transparent PNG), shown bare — never in a box.
 */
export const colors = {
  bg: '#eef2f7',
  card: '#ffffff',
  border: '#e3e8ef',
  hairline: '#eef1f5',
  text: '#0b1f3a',
  body: '#3d4b5f',
  muted: '#6b7a8f',
  faint: '#98a4b5',
  accent: '#2f6fd6',
  accentSoft: '#e9f1fd',
  accentText: '#ffffff',
  brand: '#001429',
  panel: '#f7f9fc',
  danger: '#d64545',
  dangerSoft: '#fdecec',
  warning: '#c7810b',
  warningSoft: '#fdf4e3',
  success: '#17905a',
  successSoft: '#e4f6ed',
} as const

export const font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export type Tone = 'brand' | 'success' | 'danger' | 'warning'

export const TONES: Record<Tone, { fg: string; bg: string }> = {
  brand: { fg: colors.accent, bg: colors.accentSoft },
  success: { fg: colors.success, bg: colors.successSoft },
  danger: { fg: colors.danger, bg: colors.dangerSoft },
  warning: { fg: colors.warning, bg: colors.warningSoft },
}

export function formatWhen(start: Date, end: Date, timeZone: string): { date: string; time: string; month: string; day: string; weekday: string; zone: string } {
  const date = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start)
  const t = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(start).find((p) => p.type === 'timeZoneName')?.value ?? timeZone
  return {
    date,
    time: `${t.format(start)} – ${t.format(end)} (${zone})`,
    month: new Intl.DateTimeFormat('en-US', { timeZone, month: 'short' }).format(start).toUpperCase(),
    day: new Intl.DateTimeFormat('en-US', { timeZone, day: 'numeric' }).format(start),
    weekday: new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(start).toUpperCase(),
    zone,
  }
}

/** "Add to Google Calendar" template link (works without the guest signing in to anything). */
export function googleCalendarUrl(e: { title: string; start: Date; end: Date; details?: string; location?: string }): string {
  const fmt = (d: Date): string => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, dates: `${fmt(e.start)}/${fmt(e.end)}` })
  if (e.details) q.set('details', e.details)
  if (e.location) q.set('location', e.location)
  return `https://calendar.google.com/calendar/render?${q.toString()}`
}

/** "Add to Outlook.com" deeplink. */
export function outlookCalendarUrl(e: { title: string; start: Date; end: Date; details?: string; location?: string }): string {
  const q = new URLSearchParams({ path: '/calendar/action/compose', rru: 'addevent', subject: e.title, startdt: e.start.toISOString(), enddt: e.end.toISOString() })
  if (e.details) q.set('body', e.details)
  if (e.location) q.set('location', e.location)
  return `https://outlook.live.com/calendar/0/deeplink/compose?${q.toString()}`
}
