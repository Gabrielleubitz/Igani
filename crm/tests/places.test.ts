import { describe, expect, it, vi } from 'vitest'
import { placesQuery, searchPlaces, toPlaceResult, websiteHost } from '@/lib/places'

describe('Google Places finder', () => {
  it('builds the query in the language typed', () => {
    expect(placesQuery(' real  estate ', 'Jerusalem')).toBe('real estate in Jerusalem')
    expect(placesQuery('נדל"ן', 'ירושלים')).toBe('נדל"ן בירושלים')
    expect(placesQuery('נדל"ן', 'בירושלים')).toBe('נדל"ן בירושלים')
    expect(placesQuery('dentist', '')).toBe('dentist')
  })

  it('keeps open businesses with their listed contact details', () => {
    const p = toPlaceResult({
      id: 'abc',
      displayName: { text: 'Zion Realty' },
      nationalPhoneNumber: '02-123-4567',
      internationalPhoneNumber: '+972 2-123-4567',
      websiteUri: 'https://www.zion.co.il/',
      googleMapsUri: 'https://maps.google.com/?cid=1',
      rating: 4.6,
      userRatingCount: 31,
    })
    expect(p).toMatchObject({ placeId: 'abc', name: 'Zion Realty', phone: '+972 2-123-4567', website: 'https://www.zion.co.il/', rating: 4.6, reviews: 31 })
    expect(toPlaceResult({ id: 'x', displayName: { text: 'Gone' }, businessStatus: 'CLOSED_PERMANENTLY' })).toBeNull()
    expect(toPlaceResult({ id: 'y' })).toBeNull()
    // only real web links survive
    expect(toPlaceResult({ id: 'z', displayName: { text: 'A' }, websiteUri: 'javascript:alert(1)', googleMapsUri: 'https://evil.example' })).toMatchObject({ website: null, mapsUrl: null })
  })

  it('dedupes on a business’s own site, never on shared social pages', () => {
    expect(websiteHost('https://www.zion.co.il/about')).toBe('zion.co.il')
    expect(websiteHost('https://www.facebook.com/zion')).toBeNull()
    expect(websiteHost('https://instagram.com/zion')).toBeNull()
    expect(websiteHost('not a url')).toBeNull()
  })

  it('asks Google for only the fields it needs, and explains failures', async () => {
    vi.stubEnv('GOOGLE_MAPS_API_KEY', 'test-key')
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const headers = init?.headers as Record<string, string>
      expect(headers['X-Goog-Api-Key']).toBe('test-key')
      expect(headers['X-Goog-FieldMask']).toContain('places.internationalPhoneNumber')
      expect(JSON.parse(String(init?.body))).toMatchObject({ textQuery: 'real estate in Jerusalem', pageSize: 20, pageToken: 'tok' })
      return new Response(JSON.stringify({ places: [{ id: 'a', displayName: { text: 'A' } }], nextPageToken: 'tok2' }))
    })
    await expect(searchPlaces('real estate in Jerusalem', 'tok', fetcher as unknown as typeof fetch)).resolves.toMatchObject({ places: [{ placeId: 'a' }], nextPageToken: 'tok2' })
    const limited = vi.fn(async () => new Response('{}', { status: 429 }))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    await expect(searchPlaces('x', null, limited as unknown as typeof fetch)).rejects.toThrow(/limit/)
    vi.stubEnv('GOOGLE_MAPS_API_KEY', '')
    await expect(searchPlaces('x', null, limited as unknown as typeof fetch)).rejects.toThrow(/GOOGLE_MAPS_API_KEY/)
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })
})
