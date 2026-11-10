import { describe, expect, it } from 'vitest'
import { callLanguage, coachingLanguage, hebrewShare, hintLanguageRule, reviewLanguageRule } from '@/lib/call-language'
import { cleanSpeech } from '@/lib/live-hints-core'

describe('call language', () => {
  it('tells Hebrew, English and switching calls apart', () => {
    expect(callLanguage('שלום, מדבר גבריאל מאיגני. ראיתי שיש לכם אתר ישן, יש לך דקה?')).toBe('he')
    expect(callLanguage('Hi, this is Gabriel from Igani, do you have a minute?')).toBe('en')
    expect(callLanguage('כן, אז נבנה לך landing page חדש with online booking and payments, ונחבר את זה ל-CRM שלך')).toBe('mixed')
    expect(hebrewShare('123 ...')).toBeNull()
    expect(callLanguage('')).toBe('en')
  })

  it('coaches mostly-Hebrew calls in Hebrew, mostly-English ones in English', () => {
    expect(coachingLanguage('שלום, אנחנו בונים אתרים ומערכות הזמנות לעסקים קטנים, נדבר על website?')).toBe('he')
    expect(coachingLanguage('We build websites and booking systems, תודה')).toBe('en')
    expect(reviewLanguageRule('he', 'mixed')).toContain('Hebrew')
    expect(reviewLanguageRule('he', 'mixed')).toContain('השליטה בשיחה')
    expect(reviewLanguageRule('he', 'mixed')).toContain('in both languages')
    expect(reviewLanguageRule('en', 'en')).toContain('English')
  })

  it('live hints follow the language the client is speaking now', () => {
    expect(hintLanguageRule('REP: Hi, this is Igani\nCLIENT: כן, מי זה?')).toContain('Hebrew')
    expect(hintLanguageRule('REP: שלום\nCLIENT: Sorry, I only speak English')).toContain('English')
  })

  it('drops Whisper’s Hebrew silence phrases', () => {
    for (const t of ['תודה רבה.', 'תודה שצפיתם!', 'כתוביות: עמית', 'תרגום ותמלול']) expect(cleanSpeech(t)).toBe('')
    expect(cleanSpeech('תודה רבה, אז מתי נוח לך?')).toBe('תודה רבה, אז מתי נוח לך?')
  })
})
