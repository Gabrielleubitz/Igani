import { parseCsv } from '@/lib/csv-parse'
import { dialProblem, toE164, type DialCountry } from '@/lib/phone-numbers'

/** Limits for one upload: a call list is worked by hand, so a few thousand rows is plenty. */
export const IMPORT_MAX_ROWS = 5000
export const IMPORT_MAX_CHARS = 1_000_000

export interface PreparedRow {
  /** line number in the file (the header is line 1) */
  line: number
  name: string
  /** E.164 */
  phone: string
  website: string | null
}

export interface RejectedRow {
  line: number
  reason: string
}

export interface PreparedImport {
  /** which columns were found (header text), for the preview */
  columns: { name: string | null; phone: string; company: string | null; website: string | null }
  rows: PreparedRow[]
  rejected: RejectedRow[]
  /** the same number twice in the file (the first one is kept) */
  duplicatesInFile: number
  /** data lines in the file (without the header) */
  total: number
}

const ALIASES = {
  phone: ['phone', 'phone number', 'phonenumber', 'mobile', 'mobile phone', 'cell', 'cell phone', 'tel', 'telephone', 'number', 'טלפון', 'נייד', 'פלאפון', 'מספר', 'מספר טלפון', 'טלפון נייד'],
  name: ['name', 'full name', 'fullname', 'contact', 'contact name', 'first name', 'שם', 'שם מלא', 'איש קשר', 'שם איש קשר'],
  company: ['company', 'company name', 'business', 'business name', 'organization', 'organisation', 'חברה', 'שם חברה', 'עסק', 'שם העסק'],
  website: ['website', 'web site', 'site', 'url', 'web', 'אתר', 'אתר אינטרנט', 'כתובת אתר'],
} as const

const norm = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()

function findColumn(header: string[], names: readonly string[]): number {
  const wanted = new Set(names.map(norm))
  return header.findIndex((h) => wanted.has(norm(h)))
}

function cleanWebsite(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`
  try {
    const u = new URL(withProto)
    return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.toString().slice(0, 500) : null
  } catch {
    return null
  }
}

export class ImportFileError extends Error {}

/** Read a CSV: find the columns from the header, check every phone, drop repeats. Throws ImportFileError for a file we can't use. */
export function prepareImport(text: string, allowed: readonly DialCountry[] = ['IL', 'US']): PreparedImport {
  if (text.length > IMPORT_MAX_CHARS) throw new ImportFileError('That file is too big (1 MB at most). Split it in two.')
  const table = parseCsv(text)
  if (table.length < 2) throw new ImportFileError('The file needs a header row and at least one person.')
  const header = table[0]!
  const phoneCol = findColumn(header, ALIASES.phone)
  if (phoneCol < 0) throw new ImportFileError('Couldn’t find a phone column. Name it “phone” (or “טלפון”) in the first row.')
  const nameCol = findColumn(header, ALIASES.name)
  const companyCol = findColumn(header, ALIASES.company)
  const websiteCol = findColumn(header, ALIASES.website)
  const data = table.slice(1)
  if (data.length > IMPORT_MAX_ROWS) throw new ImportFileError(`Too many rows (${IMPORT_MAX_ROWS} at most). Split the file.`)

  const rows: PreparedRow[] = []
  const rejected: RejectedRow[] = []
  const seen = new Set<string>()
  let duplicatesInFile = 0
  data.forEach((cells, i) => {
    const line = i + 2
    const cell = (c: number): string => (c >= 0 ? (cells[c] ?? '').trim() : '')
    const rawPhone = cell(phoneCol)
    if (!rawPhone) return void rejected.push({ line, reason: 'No phone number' })
    const e164 = toE164(rawPhone)
    if (!e164) return void rejected.push({ line, reason: `“${rawPhone.slice(0, 30)}” isn’t a phone number we can dial` })
    const problem = dialProblem(e164, allowed)
    if (problem) return void rejected.push({ line, reason: problem })
    const key = e164.replace(/\D/g, '').slice(-8)
    if (seen.has(key)) {
      duplicatesInFile += 1
      return
    }
    seen.add(key)
    const name = (cell(nameCol) || cell(companyCol) || 'Unnamed').slice(0, 200)
    rows.push({ line, name, phone: e164, website: cleanWebsite(cell(websiteCol)) })
  })
  return {
    columns: { phone: header[phoneCol]!, name: nameCol >= 0 ? header[nameCol]! : null, company: companyCol >= 0 ? header[companyCol]! : null, website: websiteCol >= 0 ? header[websiteCol]! : null },
    rows,
    rejected,
    duplicatesInFile,
    total: data.length,
  }
}

/** The file people can start from. */
export const EXAMPLE_CSV = 'name,phone,company,website\nDana Levi,050-123-4567,Acme Studio,acme.example\nYoni Cohen,+972 52 765 4321,Bluebird,\n'
