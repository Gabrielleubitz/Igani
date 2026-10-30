/** Shared Igani email styling (dark / minimalist). */
export const colors = {
  bg: '#0a0a0a',
  card: '#141414',
  border: '#262626',
  text: '#fafafa',
  muted: '#a3a3a3',
  accent: '#ffffff',
  accentText: '#0a0a0a',
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
