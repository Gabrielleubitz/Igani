import { beforeEach, describe, expect, it, vi } from 'vitest'

const insert = vi.fn()
const del = vi.fn()
const calendarForHost = vi.fn()
const findUnique = vi.fn()
const update = vi.fn()

vi.mock('@/lib/google', () => ({ calendarForHost: (...a: unknown[]) => calendarForHost(...a) }))
vi.mock('@/lib/prisma', () => ({ prisma: { calendarEntry: { findUnique: (...a: unknown[]) => findUnique(...a), update: (...a: unknown[]) => update(...a), findMany: vi.fn() } } }))

import { pushEntryToGoogle, removeEntryFromGoogle } from '@/lib/calendar-entry-sync'

const entry = {
  id: 'e1', ownerId: 'u1', title: 'Haircut', notes: 'n', allDay: false, googleEventId: null,
  startTime: new Date('2026-11-02T10:00:00Z'), endTime: new Date('2026-11-02T11:00:00Z'), owner: { timeZone: 'Asia/Jerusalem' },
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  calendarForHost.mockResolvedValue({ events: { insert, delete: del } })
})

describe('calendar-entry-sync', () => {
  it('pushes the entry to the primary calendar and stores the Google event id', async () => {
    findUnique.mockResolvedValue(entry)
    insert.mockResolvedValue({ data: { id: 'g123' } })
    expect(await pushEntryToGoogle('e1')).toBe(true)
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      calendarId: 'primary',
      requestBody: expect.objectContaining({ summary: 'Haircut', start: { dateTime: '2026-11-02T10:00:00.000Z' }, end: { dateTime: '2026-11-02T11:00:00.000Z' } }),
    }))
    expect(update).toHaveBeenCalledWith({ where: { id: 'e1' }, data: { googleEventId: 'g123' } })
  })

  it('does not insert twice when already synced', async () => {
    findUnique.mockResolvedValue({ ...entry, googleEventId: 'g9' })
    expect(await pushEntryToGoogle('e1')).toBe(true)
    expect(insert).not.toHaveBeenCalled()
  })

  it('returns false and keeps the entry untouched when Google is not connected', async () => {
    findUnique.mockResolvedValue(entry)
    calendarForHost.mockRejectedValue(new Error('not connected'))
    expect(await pushEntryToGoogle('e1')).toBe(false)
    expect(update).not.toHaveBeenCalled()
  })

  it('delete removes the Google event; no id means no call; failures do not throw', async () => {
    del.mockResolvedValue({})
    await removeEntryFromGoogle('u1', 'g123')
    expect(del).toHaveBeenCalledWith({ calendarId: 'primary', eventId: 'g123', sendUpdates: 'none' })
    del.mockClear()
    await removeEntryFromGoogle('u1', null)
    expect(del).not.toHaveBeenCalled()
    del.mockRejectedValue(new Error('410'))
    await expect(removeEntryFromGoogle('u1', 'g1')).resolves.toBeUndefined()
  })
})
