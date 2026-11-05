/**
 * Hebrew, English, or both: which language a call was in, and which one to coach it in. Pure (shared by the recorded
 * call review and the live hints). Israeli sales calls often switch mid-sentence ("נבנה לך landing page עם booking"),
 * so the decision is by share of letters, not by the first words.
 */

export type CallLang = 'he' | 'en' | 'mixed'

const HE = /[א-ת]/g
const LATIN = /[A-Za-z]/g

/** Share of Hebrew among the Hebrew and Latin letters (0 = all English, 1 = all Hebrew); null when there's no text. */
export function hebrewShare(text: string): number | null {
  const he = text.match(HE)?.length ?? 0
  const en = text.match(LATIN)?.length ?? 0
  return he + en === 0 ? null : he / (he + en)
}

export function callLanguage(text: string): CallLang {
  const s = hebrewShare(text)
  if (s === null) return 'en'
  if (s >= 0.85) return 'he'
  if (s <= 0.15) return 'en'
  return 'mixed'
}

/** The language the coaching is written in: Hebrew for Hebrew and mostly-Hebrew mixed calls. */
export function coachingLanguage(text: string): 'he' | 'en' {
  const s = hebrewShare(text)
  return s !== null && s >= 0.4 ? 'he' : 'en'
}

export const CALL_LANG_LABEL: Record<CallLang, string> = { he: 'Hebrew', en: 'English', mixed: 'Hebrew + English' }

/**
 * What Whisper hears first: a bilingual sample in our call's vocabulary. It keeps each language as spoken (instead of
 * translating English words into Hebrew or the reverse) and spells our product words the way we write them.
 */
export const TRANSCRIBE_PROMPT =
  'שלום, מדבר מ-Igani. אנחנו בונים אתרים, landing pages, מערכות booking, חנויות e-commerce, CRM, dashboards ואוטומציות. ' +
  'Hi, this is Igani, we build websites, booking systems and online stores. כן, בטח, אז מה הכי חשוב לך? Sounds good, נדבר ביום ראשון.'

/** The Straight Line's terms as we say them in Hebrew (so the Hebrew coaching uses one vocabulary). */
export const HEBREW_TERMS = `Straight Line terms in Hebrew (use these exactly): the Straight Line = הקו הישר; on/off the line = על הקו / יצא מהקו;
the first four seconds = ארבע השניות הראשונות; sharp, enthusiastic, an authority = חד, נלהב, סמכותי; rapport = חיבור (rapport);
intelligence gathering = איסוף מידע; big-picture questions = שאלות תמונה רחבה; keep your powder dry = לשמור את התחמושת;
the bridge / transition = המעבר; the presentation = ההצגה; the three tens = שלוש העשיריות (המוצר, אתה, החברה);
the first no = ה"לא" הראשון; a stall = התחמקות; looping = לולאה; deflect = להסיט; the soft close = סגירה רכה ("נשמע הוגן?");
the action threshold = סף הפעולה; tonality = טונאליות; future pacing = הצגת העתיד; ethics = אתיקה.`

/** The instruction appended to a review request: which language to write in. */
export function reviewLanguageRule(lang: 'he' | 'en', spoken: CallLang): string {
  const mixed = spoken === 'mixed' ? ' The call switches between Hebrew and English: keep every quote exactly as spoken, in both languages.' : ''
  if (lang === 'en') return `Review language: English. Quotes and suggested lines stay in the call's own words.${mixed}`
  return `Review language: Hebrew. Write EVERY free-text field in natural, professional Hebrew (summary, outcome label, needs, notes, strengths,
improvements, focus, drills, why, verdict, lesson reasons, stage notes, questions, action items): the rep reads it in Hebrew. Keep the
schema's fixed values (ids, enums like rep/client, good/shaky, yes/no) exactly as given in English. Product and tech words people say in
English (website, landing page, booking, CRM) may stay in English. Suggested lines ("better", "sayThis") are in Hebrew as the rep would
say them on a call.${mixed}
${HEBREW_TERMS}`
}

/** Live hints: which language the next hint should be in, from the recent conversation. */
export function hintLanguageRule(context: string): string {
  const last = context.split('\n').filter((l) => /^CLIENT:/i.test(l)).slice(-3).join(' ') || context.slice(-600)
  const lang = callLanguage(last)
  if (lang === 'he') return 'The client is speaking Hebrew: write the hint in short, natural Hebrew.'
  if (lang === 'mixed') return 'The call mixes Hebrew and English: write the hint in Hebrew (English product words are fine).'
  return 'The client is speaking English: write the hint in English.'
}
