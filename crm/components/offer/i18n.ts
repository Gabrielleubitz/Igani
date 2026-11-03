import type { L, Lang } from '@/offers/types'

export const t = (l: L | undefined, lang: Lang): string => (l ? l[lang] || l.en || l.he : '')

/** Fixed labels of the offer template (the content itself comes from offers/<slug>/content.tsx). */
const UI = {
  offer: { he: 'הצעת פרויקט', en: 'Project offer' },
  overview: { he: 'סקירה', en: 'Overview' },
  screens: { he: 'מסכים', en: 'Screens' },
  modules: { he: 'מודולים ותמחור', en: 'Modules & pricing' },
  modulesShort: { he: 'מודולים', en: 'Modules' },
  phases: { he: 'שלבים', en: 'Phases' },
  sign: { he: 'חתימה', en: 'Sign' },
  seeModules: { he: 'מה בהצעה', en: "What's in the offer" },
  talk: { he: 'דברו איתנו', en: 'Talk to us' },
  preparedFor: { he: 'הוכן עבור', en: 'Prepared for' },
  date: { he: 'תאריך', en: 'Date' },
  oneTime: { he: 'עלות חד-פעמית', en: 'One-time' },
  monthly: { he: 'עלות חודשית', en: 'Monthly' },
  timeline: { he: 'לוח זמנים', en: 'Timeline' },
  months: { he: 'חודשים', en: 'months' },
  scope: { he: 'היקף', en: 'Scope' },
  modulesCount: { he: 'מודולים', en: 'modules' },
  screensCount: { he: 'מסכים', en: 'screens' },
  perMonth: { he: 'לחודש', en: '/ month' },
  need: { he: 'הצורך', en: 'The need' },
  system: { he: 'המערכת', en: 'The system' },
  howItConnects: { he: 'איך הכול מתחבר', en: 'How it all connects' },
  gallery: { he: 'מהשטח', en: 'From the field' },
  required: { he: 'חובה', en: 'Required' },
  recommended: { he: 'מומלץ', en: 'Recommended' },
  optional: { he: 'אופציונלי', en: 'Optional' },
  yourPackage: { he: 'החבילה שלכם', en: 'Your package' },
  allModules: { he: 'כל המודולים', en: 'All modules' },
  setupTotal: { he: 'סה״כ הקמה', en: 'Setup total' },
  plusMonthly: { he: 'ובנוסף', en: 'plus' },
  saved: { he: 'הבחירה נשמרה', en: 'Choice saved' },
  saving: { he: 'שומר…', en: 'Saving…' },
  decisions: { he: 'החלטות פתוחות', en: 'Open decisions' },
  question: { he: 'שאלה', en: 'Question' },
  impact: { he: 'משפיע על', en: 'Affects' },
  due: { he: 'עד', en: 'By' },
  about: { he: 'מי אנחנו', en: 'About us' },
  nextSteps: { he: 'הצעד הבא', en: 'Next step' },
  step: { he: 'שלב', en: 'Step' },
  of: { he: 'מתוך', en: 'of' },
  next: { he: 'הבא', en: 'Next' },
  prev: { he: 'הקודם', en: 'Back' },
  fullScreen: { he: 'מסך מלא', en: 'Full screen' },
  phone: { he: 'טלפון', en: 'Phone' },
  desktop: { he: 'מחשב', en: 'Desktop' },
  backToOffer: { he: 'חזרה להצעה', en: 'Back to the offer' },
  draft: { he: 'טיוטה: רק צוות Igani רואה את העמוד הזה. החתימה כבויה עד הפרסום.', en: 'Draft: only the Igani team can see this page. Signing is off until it is published.' },
  contract: { he: 'הסכם ההתקשרות', en: 'The agreement' },
  readContract: { he: 'לקריאת ההסכם (PDF)', en: 'Read the agreement (PDF)' },
  noContract: { he: 'ההסכם יצורף בקרוב.', en: 'The agreement will be attached shortly.' },
  fullName: { he: 'שם מלא', en: 'Full name' },
  email: { he: 'אימייל', en: 'Email' },
  signHere: { he: 'חתמו כאן', en: 'Sign here' },
  clear: { he: 'ניקוי', en: 'Clear' },
  agree: { he: 'קראתי את ההסכם ואני מאשר/ת אותו, כולל המודולים שנבחרו למעלה.', en: 'I have read the agreement and accept it, including the modules chosen above.' },
  signButton: { he: 'חתימה על ההסכם', en: 'Sign the agreement' },
  signing: { he: 'חותם…', en: 'Signing…' },
  signedTitle: { he: 'ההסכם נחתם', en: 'Agreement signed' },
  signedBody: { he: 'עותק חתום נשלח לאימייל שלכם. נחזור אליכם עם חשבונית למקדמה.', en: 'A signed copy was emailed to you. We will follow up with the down-payment invoice.' },
  signedBy: { he: 'נחתם על ידי', en: 'Signed by' },
  on: { he: 'בתאריך', en: 'on' },
  youSign: { he: 'אתם חותמים על', en: "You're signing for" },
  needSignature: { he: 'נא לחתום בתיבה.', en: 'Please draw your signature in the box.' },
  needAgree: { he: 'נא לאשר את ההסכם.', en: 'Please tick the box to accept the agreement.' },
  preparedBy: { he: 'הוכן על ידי Igani', en: 'Prepared by Igani' },
  loading: { he: 'טוען…', en: 'Loading…' },
} satisfies Record<string, L>

export type UiKey = keyof typeof UI
export const ui = (key: UiKey, lang: Lang): string => UI[key][lang]

const HE_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר']
export function monthYear(d: Date, lang: Lang): string {
  if (lang === 'he') return `${HE_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
