/** Pure helpers for turning Gmail API messages into CRM email rows (no server deps, unit-tested). */

export interface Address {
  email: string
  name: string | null
}

/** Parse an RFC 5322 address list header ("Dana <dana@x.com>, b@y.com, \"Levi, Dana\" <d@z.com>"). */
export function parseAddressList(header: string | null | undefined): Address[] {
  if (!header) return []
  const out: Address[] = []
  // Split on commas that are not inside quotes or angle brackets.
  let cur = ''
  let quoted = false
  let angle = 0
  for (const ch of header) {
    if (ch === '"') quoted = !quoted
    else if (!quoted && ch === '<') angle++
    else if (!quoted && ch === '>') angle = Math.max(0, angle - 1)
    if (ch === ',' && !quoted && angle === 0) {
      out.push(...parseOne(cur))
      cur = ''
    } else cur += ch
  }
  out.push(...parseOne(cur))
  return out
}

function parseOne(raw: string): Address[] {
  const s = raw.trim()
  if (!s) return []
  const m = /^(.*)<([^>]+)>\s*$/.exec(s)
  const email = (m ? m[2]! : s).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return []
  const name = m ? m[1]!.trim().replace(/^"|"$/g, '').trim() || null : null
  return [{ email, name }]
}

export interface GmailPart {
  mimeType?: string | null
  filename?: string | null
  body?: { data?: string | null } | null
  parts?: GmailPart[] | null
}

function decode(data: string): string {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

/** Very small HTML → text (enough for email bodies: block tags become line breaks, entities decoded). */
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li|tr|h[1-6]|blockquote)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Best plain-text body of a Gmail message payload: text/plain if present, else converted text/html. Attachments skipped. */
export function extractBody(payload: GmailPart | null | undefined): string {
  let plain = ''
  let html = ''
  const walk = (p: GmailPart | null | undefined): void => {
    if (!p) return
    if (p.filename) return
    if (p.mimeType === 'text/plain' && p.body?.data && !plain) plain = decode(p.body.data)
    else if (p.mimeType === 'text/html' && p.body?.data && !html) html = decode(p.body.data)
    p.parts?.forEach(walk)
  }
  walk(payload)
  return (plain || htmlToText(html)).replace(/\r\n/g, '\n').trim()
}

/**
 * Remove quoted history so the CRM shows only what this email added:
 * cuts at "On … wrote:" lines, Outlook "From: … Sent:" headers, "-----Original Message-----", and drops "> " lines.
 */
export function stripQuoted(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const next = lines[i + 1] ?? ''
    if (/^\s*On .{3,200}wrote:\s*$/i.test(line) || (/^\s*On .{3,200}$/i.test(line) && /wrote:\s*$/i.test(next))) break
    if (/^\s*-{2,}\s*Original Message\s*-{2,}/i.test(line)) break
    if (/^\s*From:\s.+/i.test(line) && /^\s*(Sent|Date):\s.+/i.test(next)) break
    if (/^\s*>/.test(line)) continue
    out.push(line)
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export const header = (headers: { name?: string | null; value?: string | null }[] | null | undefined, name: string): string | null =>
  headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? null
