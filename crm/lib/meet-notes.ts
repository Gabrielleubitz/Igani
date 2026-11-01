/** Pure helpers for Meet tracking + Gemini notes (no I/O, unit-tested). */

/** Only hosts on this Workspace domain have Gemini taking notes; their notes are pulled into the CRM. */
export const GEMINI_NOTES_DOMAIN = 'igani.co'

/** Max characters of a notes Doc kept in the CRM (the Doc stays the source of truth). */
export const NOTES_TEXT_CAP = 100_000

export function hostHasGeminiNotes(email: string | null | undefined): boolean {
  return Boolean(email && email.trim().toLowerCase().endsWith(`@${GEMINI_NOTES_DOMAIN}`))
}

/** "https://meet.google.com/abc-defg-hij?authuser=0" → "abc-defg-hij" (null if not a Meet link). */
export function meetingCodeFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/meet\.google\.com\/([a-z]{3}-[a-z]{4}-[a-z]{3})(?:[/?#]|$)/i)
  return m ? m[1]!.toLowerCase() : null
}

/** Doc id from any docs.google.com/document link. */
export function docIdFromUrl(url: string | null | undefined): string | null {
  const m = url?.match(/docs\.google\.com\/document\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]{20,})/)
  return m ? m[1]! : null
}

export function docUrl(docId: string): string {
  return `https://docs.google.com/document/d/${docId}/edit`
}

export interface ConferenceRec {
  name: string
  startTime: string
  endTime?: string | null
}

/**
 * The conference record(s) for this booking: Meet makes a new record each time the room is re-opened after everyone left,
 * so all records that started near the booking count as one call (first start, last end). Old reuses of the same link are ignored.
 */
export function pickConference(
  records: ConferenceRec[],
  booking: { startTime: Date; endTime: Date },
): { names: string[]; start: Date; end: Date | null; live: boolean } | null {
  const from = booking.startTime.getTime() - 2 * 3600_000
  const to = booking.endTime.getTime() + 3 * 3600_000
  const hits = records
    .filter((r) => {
      const t = Date.parse(r.startTime)
      return Number.isFinite(t) && t >= from && t <= to
    })
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))
  if (hits.length === 0) return null
  const live = hits.some((r) => !r.endTime)
  const ends = hits.flatMap((r) => (r.endTime ? [Date.parse(r.endTime)] : []))
  return { names: hits.map((r) => r.name), start: new Date(hits[0]!.startTime), end: live || ends.length === 0 ? null : new Date(Math.max(...ends)), live }
}

/** Retry schedule while waiting for notes (minutes after each attempt). Notes usually land 3-10 min after the call. */
export function nextNotesCheck(attempts: number, now: Date): Date {
  const steps = [3, 5, 10, 15, 30]
  const min = steps[attempts] ?? 60
  return new Date(now.getTime() + min * 60_000)
}

/** Stop waiting for notes this long after the call ended. */
export const NOTES_GIVE_UP_MS = 24 * 3600_000

// ─── Google Docs → text ──────────────────────────────────────────────────────

interface DocsParagraph {
  elements?: { textRun?: { content?: string | null }; person?: { personProperties?: { name?: string | null; email?: string | null } }; richLink?: { richLinkProperties?: { title?: string | null; uri?: string | null } }; dateElement?: { dateElementProperties?: { displayText?: string | null } } }[]
  paragraphStyle?: { namedStyleType?: string | null }
  bullet?: unknown
}
interface DocsElement {
  paragraph?: DocsParagraph
  table?: { tableRows?: { tableCells?: { content?: DocsElement[] }[] }[] }
}
interface DocsTab {
  tabProperties?: { title?: string | null }
  documentTab?: { body?: { content?: DocsElement[] } }
  childTabs?: DocsTab[]
}
export interface DocsDocument {
  title?: string | null
  body?: { content?: DocsElement[] }
  tabs?: DocsTab[]
}

function contentToLines(content: DocsElement[] | undefined, out: string[]): void {
  for (const el of content ?? []) {
    if (el.paragraph) {
      const p = el.paragraph
      const text = (p.elements ?? [])
        .map((e) => e.textRun?.content ?? e.person?.personProperties?.name ?? e.person?.personProperties?.email ?? e.richLink?.richLinkProperties?.title ?? e.dateElement?.dateElementProperties?.displayText ?? '')
        .join('')
        .replace(/[\u000b\r]/g, '\n')
        .replace(/\n+$/, '')
      if (!text.trim()) {
        out.push('')
        continue
      }
      const style = p.paragraphStyle?.namedStyleType ?? ''
      if (style === 'TITLE') out.push(`# ${text.trim()}`)
      else if (style.startsWith('HEADING_')) out.push(`## ${text.trim()}`)
      else if (p.bullet) out.push(`• ${text.trim()}`)
      else out.push(text)
    } else if (el.table) {
      for (const row of el.table.tableRows ?? []) {
        const cells = (row.tableCells ?? []).map((c) => {
          const inner: string[] = []
          contentToLines(c.content, inner)
          return inner.filter(Boolean).join(' ').trim()
        })
        out.push(cells.join(' | '))
      }
    }
  }
}

/** Plain text (light markdown: # title, ## headings, • bullets) of a Docs API document, every tab included. */
export function docToText(doc: DocsDocument): string {
  const out: string[] = []
  const walk = (tabs: DocsTab[], top: boolean): void => {
    for (const t of tabs) {
      // The verbatim transcript can be hundreds of thousands of characters; the Doc link keeps it one click away.
      if (/transcript/i.test(t.tabProperties?.title ?? '')) continue
      if (!top || tabs.length > 1) out.push('', `# ${t.tabProperties?.title ?? 'Tab'}`)
      contentToLines(t.documentTab?.body?.content, out)
      walk(t.childTabs ?? [], false)
    }
  }
  if (doc.tabs?.length) walk(doc.tabs, true)
  else contentToLines(doc.body?.content, out)
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const SECTION = /^(?:#+\s*)?(summary|details|suggested next steps|next steps|action items|transcript)\s*:?\s*$/i

/** Splits Gemini notes into the summary and the next steps (best effort; the full text is always kept). */
export function parseGeminiNotes(text: string): { summary: string | null; nextSteps: string | null } {
  const sections = new Map<string, string[]>()
  let current: string | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    const m = line.match(SECTION)
    if (m) {
      const key = m[1]!.toLowerCase().replace('suggested ', '').replace('action items', 'next steps')
      current = sections.has(key) ? null : key
      if (current) sections.set(current, [])
      continue
    }
    // A new top-level heading (e.g. the next tab) ends the section.
    if (/^#\s/.test(line)) {
      current = null
      continue
    }
    if (current) sections.get(current)!.push(raw)
  }
  const clean = (k: string): string | null => {
    const v = sections.get(k)?.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    return v ? v.slice(0, 8000) : null
  }
  return { summary: clean('summary'), nextSteps: clean('next steps') }
}

/** Gemini notes attachment / email subject check ("Notes by Gemini", "Notes: …"). Transcript-only docs don't count. */
export function looksLikeGeminiNotes(title: string | null | undefined): boolean {
  if (!title) return false
  return /gemini/i.test(title) || /^notes\b/i.test(title.trim()) || (/\bnotes\b/i.test(title) && !/transcript/i.test(title))
}

/** Lowercase, punctuation-free form for loose title matching (email subjects quote the meeting title). */
export function normTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/[“”"'’]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

/**
 * Is this calendar event a call hosted by `hostEmail` with other guests, not already a CRM contact booking?
 * (Guests may be outside the team's domain: a team call can include an advisor or partner.)
 */
export function teamEventAttendees(
  ev: { status?: string | null; organizer?: { email?: string | null; self?: boolean | null } | null; attendees?: { email?: string | null; self?: boolean | null; resource?: boolean | null }[] | null; extendedProperties?: { private?: Record<string, string> | null } | null },
  hostEmail: string,
): string[] | null {
  if (ev.status === 'cancelled' || ev.extendedProperties?.private?.iganiBookingId) return null
  const host = hostEmail.trim().toLowerCase()
  if (ev.organizer?.email && ev.organizer.email.toLowerCase() !== host && !ev.organizer.self) return null
  const people = (ev.attendees ?? []).filter((a) => !a.resource).map((a) => (a.email ?? '').trim().toLowerCase()).filter(Boolean)
  const others = people.filter((e) => e !== host)
  if (others.length === 0) return null
  return [host, ...new Set(others)]
}

/** Why `teamEventAttendees` rejects an event (null when it is accepted). Shown to the admin so "0 calls" is explainable. */
export function teamEventSkipReason(
  ev: Parameters<typeof teamEventAttendees>[0],
  hostEmail: string,
): string | null {
  if (ev.status === 'cancelled') return 'cancelled'
  if (ev.extendedProperties?.private?.iganiBookingId) return 'is a CRM contact booking'
  const host = hostEmail.trim().toLowerCase()
  if (ev.organizer?.email && ev.organizer.email.toLowerCase() !== host && !ev.organizer.self) return `organised by ${ev.organizer.email}, not you`
  if (!teamEventAttendees(ev, hostEmail)) return 'no other guests on the event'
  return null
}
