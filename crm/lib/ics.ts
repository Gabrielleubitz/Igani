/** RFC 5545 calendar file for email attachments. */

export interface IcsEvent {
  uid: string
  start: Date
  end: Date
  title: string
  description?: string
  location?: string
  url?: string
  organizerName: string
  organizerEmail: string
  attendeeName: string
  attendeeEmail: string
  method?: 'REQUEST' | 'PUBLISH'
}

function stamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function escapeText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Fold lines at 75 octets as required by RFC 5545 §3.1. */
function fold(line: string): string {
  const bytes = Buffer.from(line, 'utf8')
  if (bytes.length <= 75) return line
  const chunks: string[] = []
  let current = ''
  let size = 0
  for (const ch of line) {
    const len = Buffer.byteLength(ch, 'utf8')
    const limit = chunks.length === 0 ? 75 : 74
    if (size + len > limit) {
      chunks.push(current)
      current = ''
      size = 0
    }
    current += ch
    size += len
  }
  chunks.push(current)
  return chunks.join('\r\n ')
}

function cn(name: string): string {
  return `"${name.replace(/"/g, "'")}"`
}

export function buildIcs(e: IcsEvent, now: Date = new Date()): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Igani//CRM//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${e.method ?? 'REQUEST'}`,
    'BEGIN:VEVENT',
    `UID:${e.uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${escapeText(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
    ...(e.location ? [`LOCATION:${escapeText(e.location)}`] : []),
    ...(e.url ? [`URL:${e.url}`] : []),
    `ORGANIZER;CN=${cn(e.organizerName)}:mailto:${e.organizerEmail}`,
    `ATTENDEE;CN=${cn(e.attendeeName)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;RSVP=FALSE:mailto:${e.attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}
