/** Shared Igani email styling (white cards, navy brand). Logo rule: white bg -> "igani-logo 2.png" (dark wordmark), shown bare with no box. */
export const colors = {
  bg: '#f1f4f8',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0b1f3a',
  muted: '#5b6b7f',
  accent: '#2f6fd6',
  accentText: '#ffffff',
  brand: '#001429',
  panel: '#f6f8fb',
  danger: '#d64545',
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
