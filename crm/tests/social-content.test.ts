import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/prisma', () => ({ prisma: {} }))
vi.mock('@/lib/ai-usage', () => ({ openaiFetch: vi.fn() }))

describe('social posts', async () => {
  const { toDraft, responseText } = await import('@/lib/social-content')
  const { fullCaption } = await import('@/lib/social-draft')

  it('keeps exactly four clean hashtags, topping up from the house set', () => {
    const d = toDraft({ topic: 't', visual: 'analysis', hook: 'h', sub: 's', points: ['a', 'b', 'c', 'd'], cta: 'Go', caption: 'Hi #CRM there', hashtags: ['SalesCoaching', '#B2B ', '#Sales Tips'] })
    expect(d.hashtags).toEqual(['#SalesCoaching', '#B2B', '#SalesTips', '#CRM'])
    expect(d.points).toHaveLength(3)
    expect(d.caption).not.toContain('#')
  })
  it('falls back to a known visual and strips em dashes', () => {
    const d = toDraft({ visual: 'something', hook: 'Fast — clear', caption: 'One — two', hashtags: [] })
    expect(d.visual).toBe('analysis')
    expect(d.hook).not.toMatch(/[—–]/)
    expect(d.caption).not.toMatch(/[—–]/)
    expect(d.hashtags).toEqual(['#CRM', '#Sales', '#SalesTips', '#SmallBusiness'])
    expect(d.cta).toBe('Try Igani')
  })
  it('reads the text out of a Responses API answer', () => {
    expect(responseText({ output: [{ type: 'web_search_call' }, { type: 'message', content: [{ type: 'output_text', text: 'Brief' }] }] })).toBe('Brief')
    expect(responseText({})).toBe('')
  })
  it('puts the hashtags under the caption', () => {
    expect(fullCaption({ caption: 'Line\n', hashtags: ['#CRM', '#Sales'] })).toBe('Line\n\n#CRM #Sales')
  })
})
