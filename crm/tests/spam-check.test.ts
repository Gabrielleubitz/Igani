import { describe, expect, it } from 'vitest'
import { checkSubmission, gibberishWord, gmailDotTrick } from '@/lib/spam-check'

describe('fake sign-up detection', () => {
  it('blocks the real spam we are getting', () => {
    expect(checkSubmission({ firstName: 'Cprf', lastName: 'Fxivwxq', email: 'u.j.e.s.uy.ov.e.j.96.1@gmail.com', message: 'Landing Page: Yoyhdabg LLC' })).toMatchObject({ spam: true })
    // the dotted Gmail alone is enough
    expect(checkSubmission({ name: 'Daniel Cohen', email: 'd.a.n.i.e.l.c@gmail.com' }).spam).toBe(true)
    // a mash name with another sign
    expect(checkSubmission({ name: 'Xqzvb Pltkr', email: 'xqzvb@outlook.com', company: 'Yoyhdabg LLC' }).spam).toBe(true)
  })

  it('lets real people through, including unusual and non-English names', () => {
    for (const [name, email] of [
      ['Mike Amory', 'info@cryotherapyrejuvenate.com'],
      ['Gabriel Leubitz', 'gabriel.leubitz@gmail.com'],
      ['Dana', 'dana@acme.com'],
      ['Krzysztof Wojcik', 'kw@firm.pl'],
      ['Jonathan Schwartz', 'j.schwartz@gmail.com'],
      ['Thanh Nguyen', 'thanh@nguyen.io'],
      ['שלמה צבי', 'shlomo@walla.co.il'],
      ['Bjørn Ødegård', 'bjorn@mail.no'],
      ['Lynn Wynn', 'lynn@wynn.com'],
      ['Bogdan Abdullah', 'bogdan@firm.ro'],
      ['Yitzchak Mordechai', 'yitzchak@gmail.com'],
      ['Yehudah Shmuel', 'yehudah.shmuel@gmail.com'],
    ]) {
      expect(checkSubmission({ name, email, message: 'We need a new website with online booking.' }), name).toMatchObject({ spam: false })
    }
  })

  it('honeypot and too-fast submissions are bots', () => {
    expect(checkSubmission({ name: 'Dana Levi', email: 'dana@acme.com', honeypot: 'http://spam.example' }).spam).toBe(true)
    expect(checkSubmission({ name: 'Dana Levi', email: 'dana@acme.com', elapsedMs: 800 }).spam).toBe(true)
    expect(checkSubmission({ name: 'Dana Levi', email: 'dana@acme.com', elapsedMs: 14_000 }).spam).toBe(false)
  })

  it('throwaway email domains', () => {
    expect(checkSubmission({ name: 'Dana Levi', email: 'dana@mailinator.com' }).spam).toBe(true)
  })

  it('word and address checks', () => {
    expect(gmailDotTrick('u.j.e.s.uy.ov.e.j.96.1@gmail.com')).toBe(true)
    expect(gmailDotTrick('first.last@gmail.com')).toBe(false)
    expect(gmailDotTrick('a.b.c.d@company.com')).toBe(false) // only Gmail ignores dots
    for (const w of ['Cprf', 'Fxivwxq', 'Yoyhdabg']) expect(gibberishWord(w), w).toBe(true)
    for (const w of ['Amory', 'Leubitz', 'Nguyen', 'Krzysztof', 'Lynn', 'Rhythm']) expect(gibberishWord(w), w).toBe(false)
  })
})
