import Image from 'next/image'
import { AppScreen, ChatThread, ItemList, StatusTimeline, SuccessScreen } from '../blocks/app'
import { Icon, Pill } from '../blocks/base'
import type { Lang, Screen } from '../types'

/**
 * Screens for Yosef's lending CRM offer.
 *  - Borrower side (phone): mockups built from blocks, what a borrower sees from applying to approval.
 *  - Team side (desktop): real screenshots and screen recordings of the working CRM, built and running on demo data.
 */

const tx = (lang: Lang, he: string, en: string): string => (lang === 'he' ? he : en)
const BASE = '/offers/yosef'

/** A real screenshot of the CRM, filling the 16:10 desktop frame (captured at 1440 × 900). */
const shot = (file: string, alt: string): Screen => {
  const S: Screen = () => <Image src={`${BASE}/${file}.webp`} alt={alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover object-top" />
  return S
}

/** A real screen recording of the CRM: plays by itself, silently, on a loop. */
const video = (name: string, label: string): Screen => {
  const V: Screen = () => (
    <video src={`${BASE}/walkthrough-${name}.mp4`} poster={`${BASE}/walkthrough-${name}-poster.webp`} autoPlay muted loop playsInline preload="metadata" aria-label={label} className="absolute inset-0 h-full w-full object-cover object-top" />
  )
  return V
}

// ── Borrower side (phone) ────────────────────────────────────────────────────

/** The lender's apply form: a few questions, consent to texts and to a credit check. */
const Apply: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'בקשה להלוואה', 'Apply for a loan'), rtl: lang === 'he' }} cta={tx(lang, 'שליחה', 'Send my request')}>
    <div className="space-y-4 p-4 text-sm">
      <div>
        <div className="mb-1.5 text-xs font-medium text-slate-500">{tx(lang, 'סוג ההלוואה', 'Loan type')}</div>
        <div className="flex flex-wrap gap-1.5">
          {[tx(lang, 'אישית', 'Personal'), tx(lang, 'עסקית', 'Business'), tx(lang, 'משכנתא', 'Mortgage'), tx(lang, 'רכב / ציוד', 'Auto / equipment')].map((t, i) => (
            <span key={t} className={i === 1 ? 'rounded-full bg-[var(--offer-accent)] px-3 py-1.5 text-xs font-medium text-white' : 'rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600'}>
              {t}
            </span>
          ))}
        </div>
      </div>
      {[
        [tx(lang, 'כמה צריך?', 'How much do you need?'), '$60,000'],
        [tx(lang, 'שם העסק', 'Business name'), 'Reed Auto Repair'],
        [tx(lang, 'הכנסות שנתיות', 'Yearly revenue'), '$540,000'],
        [tx(lang, 'כמה זמן העסק פועל', 'Time in business'), tx(lang, '6 שנים', '6 years')],
        [tx(lang, 'מדינה', 'State'), 'Florida'],
      ].map(([label, value]) => (
        <div key={label}>
          <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
          <div className="rounded-xl bg-white px-3 py-2.5 text-slate-900 ring-1 ring-slate-200">{value}</div>
        </div>
      ))}
      <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
        <div className="flex gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--offer-accent)] text-white">
            <Icon name="check" className="h-3 w-3" />
          </span>
          {tx(lang, 'אני מסכים/ה לשיחות ולהודעות לגבי הבקשה', 'I agree to calls and texts about my request')}
        </div>
        <div className="flex gap-2">
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded bg-[var(--offer-accent)] text-white">
            <Icon name="check" className="h-3 w-3" />
          </span>
          {tx(lang, 'אני מסכים/ה לבדיקת אשראי רכה', 'I agree to a soft credit check')}
        </div>
      </div>
    </div>
  </AppScreen>
)

/** Two minutes later: the welcome text, sent by the CRM automatically. */
const WelcomeText: Screen = ({ lang }) => (
  <ChatThread
    with="Dana · Loan team"
    messages={[
      { from: 'them', time: '10:02', text: tx(lang, 'היי מרקוס, כאן דנה מצוות ההלוואות. קיבלנו את הבקשה שלך להלוואה עסקית של 60,000$. אתקשר אליך בעוד כמה דקות. להסרה השב STOP.', "Hi Marcus, this is Dana from the loan team. We got your request for a $60,000 business loan. I'll call you in a few minutes. Reply STOP to opt out.") },
      { from: 'me', time: '10:03', text: tx(lang, 'מעולה, אני זמין', "Great, I'm free now") },
      { from: 'them', time: '10:09', text: tx(lang, 'תודה על השיחה! כדי להתקדם אני צריכה 3 דפי בנק אחרונים. אפשר להעלות כאן:', 'Thanks for the call! To move ahead I need your last 3 bank statements. You can upload them here:') },
      { from: 'them', time: '10:09', text: 'apply.yourlender.com/docs' },
    ]}
    composer={tx(lang, 'הודעה', 'Message')}
  />
)

/** Three days on, documents still missing: the WhatsApp reminder goes out by itself, inside sending hours. */
const DocsReminder: Screen = ({ lang }) => (
  <div className="flex min-h-full flex-col bg-[#efeae2]">
    <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3 text-white">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-xs font-semibold">LT</span>
      <div>
        <div className="text-sm font-semibold">{tx(lang, 'צוות ההלוואות', 'Loan team')}</div>
        <div className="text-[10px] text-white/70">WhatsApp Business</div>
      </div>
    </div>
    <div className="flex-1 space-y-2 p-3 text-[13px]">
      <div className="max-w-[85%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
        {tx(lang, 'היי מרקוס, עדיין חסרים לנו כמה מסמכים כדי לבדוק את הבקשה: דפי בנק ודוחות כספיים של העסק. אפשר להעלות אותם כאן ונמשיך מיד.', "Hi Marcus, we're still missing a few documents to review your application: bank statements and business financials. You can upload them here and we'll pick it up right away.")}
        <div className="mt-1 text-end text-[10px] text-slate-400">09:00</div>
      </div>
      <div className="ms-auto max-w-[85%] rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 shadow-sm">
        {tx(lang, 'סליחה על העיכוב, שולח הערב 🙏', 'Sorry for the delay, sending tonight 🙏')}
        <div className="mt-1 text-end text-[10px] text-slate-400">09:14 ✓✓</div>
      </div>
    </div>
  </div>
)

/** The borrower's document checklist, built from the loan type. */
const Upload: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'המסמכים שלך', 'Your documents'), back: true, rtl: lang === 'he' }} cta={tx(lang, 'העלאת קובץ', 'Upload a file')}>
    <div className="space-y-3 p-4">
      <p className="text-sm text-slate-600">{tx(lang, 'הלוואה עסקית צריכה ארבעה מסמכים. הקבצים נשמרים באופן פרטי.', 'A business loan needs four documents. Your files are stored privately.')}</p>
      <ItemList
        items={[
          { title: tx(lang, 'תעודה מזהה', 'Photo ID'), subtitle: 'license.jpg', icon: 'check', badge: tx(lang, 'התקבל', 'Received') },
          { title: tx(lang, 'דפי בנק (3 חודשים)', 'Bank statements (3 months)'), subtitle: 'statements-aug-oct.pdf', icon: 'check', badge: tx(lang, 'התקבל', 'Received') },
          { title: tx(lang, 'דוחות כספיים', 'Business financials'), subtitle: tx(lang, 'חסר', 'Missing'), icon: 'file' },
          { title: tx(lang, 'דוח מס', 'Tax return'), subtitle: tx(lang, 'חסר', 'Missing'), icon: 'file' },
        ]}
      />
    </div>
  </AppScreen>
)

/** Approved: the email and where the loan stands. */
const Approved: Screen = ({ lang }) => (
  <div className="min-h-full">
    <SuccessScreen
      title={tx(lang, 'ההלוואה אושרה', 'Your loan is approved')}
      body={tx(lang, 'אושרו 60,000$ ל-36 חודשים. דנה תתקשר כדי לעבור על התנאים.', 'Approved for $60,000 over 36 months. Dana will call to go over the terms.')}
    />
    <div className="px-4 pb-6">
      <StatusTimeline
        steps={[
          { label: tx(lang, 'הבקשה התקבלה', 'Request received'), time: tx(lang, '3 בנוב׳', 'Nov 3'), done: true },
          { label: tx(lang, 'מסמכים', 'Documents'), time: tx(lang, '7 בנוב׳', 'Nov 7'), done: true },
          { label: tx(lang, 'חיתום', 'Underwriting'), time: tx(lang, '8 בנוב׳', 'Nov 8'), done: true },
          { label: tx(lang, 'אושר', 'Approved'), time: tx(lang, 'היום', 'Today'), current: true },
          { label: tx(lang, 'העברת הכסף', 'Funds sent') },
        ]}
      />
    </div>
  </div>
)

// ── Team side (desktop): the real CRM ────────────────────────────────────────

/** Small framed label over a screenshot, for the one place a picture needs a word. */
const ScoreClose: Screen = ({ lang }) => (
  <div className="absolute inset-0">
    <Image src={`${BASE}/lead-score.webp`} alt={tx(lang, 'הציון שלנו לבורר', "Our score on a borrower's file")} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover object-top" />
    <div className="absolute end-4 top-4">
      <Pill tone="success">{tx(lang, 'מדרג את מי לעבוד קודם, לא החלטת אשראי', 'Ranks who to work first, not a credit decision')}</Pill>
    </div>
  </div>
)

export const screens: Record<string, Screen> = {
  apply: Apply,
  welcomeText: WelcomeText,
  docsReminder: DocsReminder,
  upload: Upload,
  approved: Approved,

  today: shot('today', 'Today: who to call next'),
  leads: shot('leads', 'Every borrower with grade, loan and stage'),
  lead: shot('lead', "A borrower's file"),
  score: ScoreClose,
  board: shot('board', 'The pipeline board'),
  automations: shot('automations', 'Automations'),
  sources: shot('sources', 'Lead sources'),
  agents: shot('agents', 'Ready to borrow agent'),
  capital: shot('capital', 'Capital agent'),
  reports: shot('reports', 'Reports'),
  overview: shot('overview', 'Overview'),

  videoBorrower: video('borrower', 'From Today to a borrower file, and a text sent'),
  videoPipeline: video('pipeline', 'The pipeline board and reports'),
  videoAgents: video('agents', 'The database agent and the capital agent'),
}
