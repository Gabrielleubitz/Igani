/**
 * Find businesses on Google Maps (Places API (New), Text Search) to add as leads.
 * Only Text Search is used: it returns the listed phone number directly, so one search page = one request
 * (the key's quota is 500 Text Search requests a day). Only the business's own listed contact details are kept.
 */

export const PLACES_PAGE_SIZE = 20
/** Text Search returns at most 3 pages (60 places) per query. */
export const PLACES_MAX_PAGES = 3
/** Limits so one person (or a stuck button) can't burn the day's Google quota. */
export const PLACES_LIMITS = { perUserHour: 40, perUserDay: 150, teamDay: 450 } as const

const FIELDS = [
  'places.id',
  'places.displayName',
  'places.nationalPhoneNumber',
  'places.internationalPhoneNumber',
  'places.websiteUri',
  'places.formattedAddress',
  'places.rating',
  'places.userRatingCount',
  'places.googleMapsUri',
  'places.businessStatus',
  'places.primaryTypeDisplayName',
  'nextPageToken',
].join(',')

export interface PlaceResult {
  placeId: string
  name: string
  phone: string | null
  website: string | null
  address: string | null
  rating: number | null
  reviews: number | null
  mapsUrl: string | null
  category: string | null
}

export interface PlacesPage {
  places: PlaceResult[]
  nextPageToken: string | null
}

export class PlacesError extends Error {}

export function placesKey(): string | null {
  return process.env.GOOGLE_MAPS_API_KEY?.trim() || null
}

const HEBREW = /[֐-׿]/

/** "real estate" + "jerusalem" → "real estate in jerusalem" (the city is optional). */
export function placesQuery(what: string, where: string): string {
  const w = what.trim().replace(/\s+/g, ' ')
  const c = where.trim().replace(/\s+/g, ' ')
  if (!c) return w
  return HEBREW.test(w + c) ? `${w} ב${c.replace(/^ב/, '')}` : `${w} in ${c}`
}

interface RawPlace {
  id?: string
  displayName?: { text?: string }
  nationalPhoneNumber?: string
  internationalPhoneNumber?: string
  websiteUri?: string
  formattedAddress?: string
  rating?: number
  userRatingCount?: number
  googleMapsUri?: string
  businessStatus?: string
  primaryTypeDisplayName?: { text?: string }
}

/** Google's place → what we show and import. Closed businesses and places without a name are dropped. */
export function toPlaceResult(p: RawPlace): PlaceResult | null {
  if (!p.id || !p.displayName?.text) return null
  if (p.businessStatus === 'CLOSED_PERMANENTLY') return null
  const website = p.websiteUri && /^https?:\/\//i.test(p.websiteUri) ? p.websiteUri.slice(0, 500) : null
  const mapsUrl = p.googleMapsUri && /^https:\/\/(maps\.google\.com|www\.google\.com\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(p.googleMapsUri) ? p.googleMapsUri : null
  return {
    placeId: p.id,
    name: p.displayName.text.slice(0, 200),
    phone: (p.internationalPhoneNumber || p.nationalPhoneNumber || '').trim().slice(0, 40) || null,
    website,
    address: p.formattedAddress?.slice(0, 300) ?? null,
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviews: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    mapsUrl,
    category: p.primaryTypeDisplayName?.text?.slice(0, 80) ?? null,
  }
}

/** The site's host without "www." — used to spot a business that's already a lead. */
export function websiteHost(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '')
    // Social and link-in-bio pages are shared by many businesses: never dedupe on them.
    if (/(^|\.)(facebook|instagram|linktr|linkedin|wa|whatsapp|tiktok|youtube|google|yad2|madlan|business\.site)\.(com|me|co\.il|ee|site|co)$/.test(h)) return null
    return h
  } catch {
    return null
  }
}

/** One page of Text Search. `pageToken` continues the same query. */
export async function searchPlaces(query: string, pageToken?: string | null, fetcher: typeof fetch = fetch): Promise<PlacesPage> {
  const key = placesKey()
  if (!key) throw new PlacesError('Google search isn’t set up yet: add GOOGLE_MAPS_API_KEY to the CRM’s environment variables.')
  const he = HEBREW.test(query)
  const res = await fetcher('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key, 'X-Goog-FieldMask': FIELDS },
    body: JSON.stringify({ textQuery: query, pageSize: PLACES_PAGE_SIZE, languageCode: he ? 'he' : 'en', regionCode: 'IL', ...(pageToken ? { pageToken } : {}) }),
    signal: AbortSignal.timeout(15_000),
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[places] search failed', res.status, body.slice(0, 500))
    if (res.status === 429) throw new PlacesError('Google’s daily search limit is used up. Try again tomorrow.')
    if (res.status === 403) throw new PlacesError('Google refused the search: check the API key and that Places API (New) is enabled.')
    throw new PlacesError('Google search failed. Try again in a minute.')
  }
  const json = (await res.json()) as { places?: RawPlace[]; nextPageToken?: string }
  return {
    places: (json.places ?? []).map(toPlaceResult).filter((p): p is PlaceResult => p !== null),
    nextPageToken: json.nextPageToken || null,
  }
}
