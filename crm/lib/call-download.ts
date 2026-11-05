/** Names and text for downloading a call: the recording (.mp3) and the transcript (.txt). Pure, so it can be unit-tested. */

export interface DownloadLine {
  start: number
  speaker: 'rep' | 'client'
  text: string
}

/** A safe file name: letters, digits, dashes; no path or header characters; never empty. */
export function safeFileName(parts: (string | null | undefined)[], ext: string): string {
  const base = parts
    .filter((p): p is string => Boolean(p && p.trim()))
    .join('-')
    .normalize('NFKD')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return `${base || 'call'}.${ext.replace(/[^a-z0-9]/gi, '')}`
}

export const mmss = (sec: number): string => `${Math.floor(Math.max(0, sec) / 60)}:${String(Math.floor(Math.max(0, sec) % 60)).padStart(2, '0')}`

/** The transcript as plain text, one line per turn: "[2:14] Rep: …". */
export function transcriptText(lines: DownloadLine[], header: { title: string; when: string; rep: string; who: string | null }): string {
  const head = [header.title, `Date: ${header.when}`, `Rep: ${header.rep}`, header.who ? `With: ${header.who}` : null, ''].filter((l): l is string => l !== null)
  return [...head, ...lines.map((l) => `[${mmss(l.start)}] ${l.speaker === 'client' ? (header.who ?? 'Client') : header.rep}: ${l.text.trim()}`), ''].join('\n')
}
