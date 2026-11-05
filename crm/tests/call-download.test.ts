import { describe, expect, it } from 'vitest'
import { mmss, safeFileName, transcriptText } from '@/lib/call-download'

describe('call downloads', () => {
  it('makes a safe file name', () => {
    expect(safeFileName(['2026-11-05', 'Dana Levi'], 'mp3')).toBe('2026-11-05-Dana-Levi.mp3')
    expect(safeFileName(['2026-11-05', '../../etc/passwd"\r\n'], 'mp3')).toBe('2026-11-05-etc-passwd.mp3')
    expect(safeFileName([null, ''], 'txt')).toBe('call.txt')
    expect(safeFileName(['2026-11-05', 'דנה לוי'], 'mp3')).toContain('דנה')
    expect(safeFileName(['x'.repeat(300)], 'mp3').length).toBeLessThanOrEqual(84)
  })
  it('formats time', () => {
    expect(mmss(0)).toBe('0:00')
    expect(mmss(134.7)).toBe('2:14')
  })
  it('writes the transcript as readable lines', () => {
    const t = transcriptText([{ start: 3, speaker: 'rep', text: ' Hi Dana ' }, { start: 134, speaker: 'client', text: 'Hello' }], { title: 'Call transcript', when: '2026-11-05 10:00 UTC', rep: 'Gabriel', who: 'Dana Levi' })
    expect(t).toContain('[0:03] Gabriel: Hi Dana')
    expect(t).toContain('[2:14] Dana Levi: Hello')
    expect(t.startsWith('Call transcript\nDate: 2026-11-05 10:00 UTC\nRep: Gabriel\nWith: Dana Levi\n')).toBe(true)
  })
})
