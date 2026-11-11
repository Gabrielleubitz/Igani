import 'server-only'
import twilio from 'twilio'
import type { TwilioConfig } from './twilio'

/**
 * What Twilio actually billed, read from the account (Usage Records), and what each phone number costs a month
 * (the number's type from the account, its price from Twilio's price list). Server only.
 */

export interface TwilioMonthBill {
  /** YYYY-MM (Twilio bills in UTC months) */
  month: string
  numbers: number
  /** numbers billed that month */
  numberCount: number
  calls: number
  callMinutes: number
  recordings: number
  texts: number
  textCount: number
  other: number
  total: number
}

export type UsageRecord = { category: string; startDate: Date | string; price: number | string | null; count?: number | string | null; usage?: number | string | null }

const n = (v: unknown): number => {
  const x = typeof v === 'string' ? Number(v) : typeof v === 'number' ? v : 0
  return Number.isFinite(x) ? x : 0
}
const monthOf = (d: Date | string): string => (typeof d === 'string' ? d : d.toISOString()).slice(0, 7)

/**
 * Monthly bills from usage records (newest first). Only the top-level categories are added up (they already include
 * their sub-categories); "Other" is whatever the total holds beyond numbers, calls, recordings and texts.
 */
export function billsFromUsage(records: UsageRecord[]): TwilioMonthBill[] {
  const months = new Map<string, TwilioMonthBill>()
  for (const r of records) {
    const month = monthOf(r.startDate)
    const b = months.get(month) ?? { month, numbers: 0, numberCount: 0, calls: 0, callMinutes: 0, recordings: 0, texts: 0, textCount: 0, other: 0, total: 0 }
    months.set(month, b)
    const price = n(r.price)
    switch (r.category) {
      case 'phonenumbers':
        b.numbers += price
        b.numberCount += n(r.count)
        break
      case 'calls':
        b.calls += price
        b.callMinutes += n(r.usage)
        break
      case 'recordings':
      case 'recordingstorage':
        b.recordings += price
        break
      case 'sms':
      case 'mms':
        b.texts += price
        b.textCount += n(r.count)
        break
      case 'totalprice':
        b.total += price
        break
    }
  }
  for (const b of months.values()) {
    const known = b.numbers + b.calls + b.recordings + b.texts
    if (b.total < known) b.total = known
    b.other = Math.max(0, b.total - known)
  }
  return [...months.values()].filter((b) => b.total > 0).sort((a, b) => b.month.localeCompare(a.month))
}

const CATEGORIES = ['totalprice', 'phonenumbers', 'calls', 'recordings', 'recordingstorage', 'sms', 'mms']

/** The real Twilio bill for each month since `since` (this month so far included). */
export async function twilioBills(c: TwilioConfig, since: Date): Promise<TwilioMonthBill[]> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const start = new Date(Date.UTC(since.getUTCFullYear(), since.getUTCMonth(), 1))
  const lists = await Promise.all(CATEGORIES.map((category) => client.usage.records.monthly.list({ category, startDate: start, endDate: new Date(), limit: 24 })))
  return billsFromUsage(lists.flat().map((r) => ({ category: r.category, startDate: r.startDate, price: r.price, count: r.count, usage: r.usage })))
}

export type NumberType = 'local' | 'mobile' | 'toll free' | 'unknown'

export interface NumberCost {
  sid: string
  number: string
  type: NumberType
  country: string | null
  /** US dollars a month, null when Twilio's price list doesn't say */
  monthly: number | null
}

/** The ISO country of a number, for the price list. Only the countries the CRM dials need to be exact. */
export function isoCountryOf(e164: string): string | null {
  if (e164.startsWith('+972')) return 'IL'
  if (e164.startsWith('+44')) return 'GB'
  if (e164.startsWith('+1')) return 'US'
  return null
}

/** Twilio writes number types a few ways ("toll free", "tollfree", "Toll Free"). */
const typeKey = (t: string | undefined): string => (t ?? '').toLowerCase().replace(/[^a-z]/g, '')

/** A number's monthly price from a country's price list. */
export function priceFor(type: NumberType, prices: { numberType?: string; currentPrice?: number; basePrice?: number }[]): number | null {
  const want = typeKey(type)
  const p = prices.find((x) => typeKey(x.numberType) === want) ?? (type === 'unknown' ? prices.find((x) => typeKey(x.numberType) === 'local') : undefined)
  const v = p?.currentPrice ?? p?.basePrice
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

/** Every number on the account with its type and monthly price. */
export async function numberCosts(c: TwilioConfig): Promise<NumberCost[]> {
  const client = twilio(c.apiKeySid, c.apiKeySecret, { accountSid: c.accountSid })
  const [all, local, mobile, tollFree] = await Promise.all([
    client.incomingPhoneNumbers.list({ limit: 200 }),
    client.incomingPhoneNumbers.local.list({ limit: 200 }).catch(() => []),
    client.incomingPhoneNumbers.mobile.list({ limit: 200 }).catch(() => []),
    client.incomingPhoneNumbers.tollFree.list({ limit: 200 }).catch(() => []),
  ])
  const typeOf = new Map<string, NumberType>()
  for (const r of local) typeOf.set(r.sid, 'local')
  for (const r of mobile) typeOf.set(r.sid, 'mobile')
  for (const r of tollFree) typeOf.set(r.sid, 'toll free')
  const countries = [...new Set(all.map((r) => isoCountryOf(r.phoneNumber)).filter((x): x is string => Boolean(x)))]
  type Prices = Parameters<typeof priceFor>[1]
  const priceLists = new Map<string, Prices>(
    await Promise.all(
      countries.map(async (iso): Promise<[string, Prices]> => {
        try {
          const country = await client.pricing.v1.phoneNumbers.countries(iso).fetch()
          return [iso, country.phoneNumberPrices ?? []]
        } catch {
          return [iso, []]
        }
      }),
    ),
  )
  return all.map((r) => {
    const type = typeOf.get(r.sid) ?? 'unknown'
    const country = isoCountryOf(r.phoneNumber)
    return { sid: r.sid, number: r.phoneNumber, type, country, monthly: country ? priceFor(type, priceLists.get(country) ?? []) : null }
  })
}
