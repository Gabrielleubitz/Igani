/** Shared Igani email styling (dark / minimalist). */
export const colors = {
  bg: '#001429',
  card: '#002040',
  border: '#204060',
  text: '#f5f5f5',
  muted: '#9fb3c8',
  accent: '#4080E0',
  accentText: '#ffffff',
} as const

export const font =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

export function formatWhen(start: Date, end: Date, timeZone: string): { date: string; time: string } {
  const date = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(start)
  const t = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' })
  const zone =
    new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' }).formatToParts(start).find((p) => p.type === 'timeZoneName')
      ?.value ?? timeZone
  return { date, time: `${t.format(start)} – ${t.format(end)} (${zone})` }
}
