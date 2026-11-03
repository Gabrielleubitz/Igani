import Image from 'next/image'
import type { ReactNode } from 'react'
import type { Lang, Screen } from '../types'

/** Mockup screens for the Cryotherapy Rejuvenate offer. Static on purpose: they show the product, they don't run it. */

const ACCENT = '#0e7490'
const tx = (lang: Lang, he: string, en: string): string => (lang === 'he' ? he : en)

function AppBar({ title, lang, back = true }: { title: string; lang: Lang; back?: boolean }): React.ReactElement {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
      {back ? <span className="text-lg text-slate-400">{lang === 'he' ? '→' : '←'}</span> : null}
      <span className="font-semibold text-slate-900">{title}</span>
    </div>
  )
}

function Cta({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <div className="sticky bottom-0 bg-white/95 p-4">
      <div className="rounded-xl py-3 text-center font-semibold text-white" style={{ background: ACCENT }}>
        {children}
      </div>
    </div>
  )
}

const Home: Screen = ({ lang }) => (
  <div className="min-h-full bg-slate-950 text-white">
    <div className="relative h-[330px]">
      <Image src="/offers/cryo/chamber-hero-1200.webp" alt="" fill className="object-cover opacity-70" sizes="300px" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/30 to-slate-950" />
      <div className="absolute inset-x-0 bottom-0 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-300">Dickson City, PA</div>
        <div className="mt-2 text-3xl font-semibold leading-tight">{tx(lang, '3 הדקות הכי טובות ביום שלך', 'The best 3 minutes of your day')}</div>
      </div>
    </div>
    <div className="space-y-3 p-5">
      <p className="text-sm leading-6 text-slate-300">{tx(lang, 'תא קריותרפיה חשמלי MECOTEC cryo:one+. בלי חנקן נוזלי, קור אחיד מכף רגל ועד ראש.', 'An electric MECOTEC cryo:one+ chamber. No liquid nitrogen, even cold head to toe.')}</p>
      <div className="rounded-xl py-3 text-center font-semibold text-slate-950" style={{ background: '#59c8f5' }}>
        {tx(lang, 'הזמנת טיפול', 'Book a session')}
      </div>
      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-[11px] text-slate-300">
        {[tx(lang, 'התאוששות', 'Recovery'), tx(lang, 'זרימת דם', 'Circulation'), tx(lang, 'עור', 'Skin')].map((b) => (
          <div key={b} className="rounded-lg bg-white/5 py-2">
            {b}
          </div>
        ))}
      </div>
    </div>
  </div>
)

const TREATMENTS = [
  { he: 'קריותרפיה לכל הגוף', en: 'Whole-body cryotherapy', min: 3, price: 30 },
  { he: 'טיפול ממוקד cryoair', en: 'Localized cryoair', min: 10, price: 40 },
  { he: 'פייסל קריו', en: 'Cryo facial', min: 15, price: 45 },
]

const Treatments: Screen = ({ lang }) => (
  <div className="min-h-full bg-white">
    <AppBar title={tx(lang, 'בחירת טיפול', 'Choose a treatment')} lang={lang} />
    <div className="space-y-3 p-4">
      {TREATMENTS.map((t, i) => (
        <div key={t.en} className={`rounded-2xl border p-4 ${i === 0 ? 'border-cyan-600 bg-cyan-50/60' : 'border-slate-200'}`}>
          <div className="flex items-baseline justify-between">
            <span className="font-semibold text-slate-900">{lang === 'he' ? t.he : t.en}</span>
            <span className="font-semibold text-slate-900">${t.price}</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {t.min} {tx(lang, 'דקות', 'min')}
          </div>
        </div>
      ))}
      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="font-semibold text-slate-900">{tx(lang, 'יש לך כרטיסייה', 'You have a package')}</div>
        <div className="mt-1 text-slate-600">{tx(lang, 'נשארו 4 מתוך 10 טיפולים. הטיפול הזה ינוכה ממנה.', '4 of 10 sessions left. This one comes off the package.')}</div>
      </div>
    </div>
    <Cta>{tx(lang, 'המשך', 'Continue')}</Cta>
  </div>
)

const SLOTS = ['11:00', '11:15', '11:30', '12:00', '12:15', '13:00', '15:45', '16:00', '17:30']
const DAYS = [
  ['Mon', 'ב׳', 10],
  ['Tue', 'ג׳', 11],
  ['Wed', 'ד׳', 12],
  ['Thu', 'ה׳', 13],
  ['Fri', 'ו׳', 14],
] as const

const PickTime: Screen = ({ lang }) => (
  <div className="min-h-full bg-white">
    <AppBar title={tx(lang, 'מתי נוח לך?', 'When suits you?')} lang={lang} />
    <div className="flex gap-2 overflow-x-auto p-4">
      {DAYS.map(([en, he, d], i) => (
        <div key={en} className={`min-w-[52px] rounded-xl border py-2 text-center ${i === 1 ? 'border-transparent text-white' : 'border-slate-200 text-slate-700'}`} style={i === 1 ? { background: ACCENT } : undefined}>
          <div className="text-[11px] opacity-80">{lang === 'he' ? he : en}</div>
          <div className="text-lg font-semibold">{d}</div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-3 gap-2 px-4">
      {SLOTS.map((s, i) => (
        <div key={s} className={`rounded-lg border py-2 text-center text-sm ${i === 4 ? 'border-cyan-600 bg-cyan-50 font-semibold text-cyan-800' : i === 2 ? 'border-slate-100 text-slate-300 line-through' : 'border-slate-200 text-slate-700'}`}>
          {s}
        </div>
      ))}
    </div>
    <p className="px-4 pt-4 text-xs leading-5 text-slate-500">{tx(lang, 'רק שעות פנויות באמת מוצגות. השעה נשמרת לך ל-10 דקות בזמן התשלום.', 'Only truly open times are shown. Your slot is held for 10 minutes while you pay.')}</p>
    <Cta>{tx(lang, 'שלישי 11 · 12:15', 'Tue 11 · 12:15')}</Cta>
  </div>
)

const Checkout: Screen = ({ lang }) => (
  <div className="min-h-full bg-white">
    <AppBar title={tx(lang, 'תשלום', 'Checkout')} lang={lang} />
    <div className="space-y-4 p-4">
      <div className="rounded-2xl bg-slate-50 p-4 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-600">{tx(lang, 'קריותרפיה לכל הגוף', 'Whole-body cryotherapy')}</span>
          <span className="font-semibold">$30.00</span>
        </div>
        <div className="mt-1 text-xs text-slate-500">{tx(lang, 'שלישי 11 בנובמבר · 12:15', 'Tue, Nov 11 · 12:15 PM')}</div>
      </div>
      <div className="space-y-2">
        <div className="rounded-xl bg-black py-3 text-center text-sm font-semibold text-white"> Pay</div>
        <div className="text-center text-xs text-slate-400">{tx(lang, 'או בכרטיס', 'or pay by card')}</div>
        <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-400" dir="ltr">
          4242 4242 4242 4242
        </div>
        <div className="grid grid-cols-2 gap-2" dir="ltr">
          <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-400">12 / 28</div>
          <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-400">CVC</div>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="h-4 w-4 rounded border border-slate-300" />
        {tx(lang, 'קראתי את הצהרת הבריאות ואני חותם/ת עליה', 'I have read and sign the health waiver')}
      </div>
    </div>
    <Cta>{tx(lang, 'תשלום $30.00', 'Pay $30.00')}</Cta>
  </div>
)

const Confirmed: Screen = ({ lang }) => (
  <div className="flex min-h-full flex-col items-center bg-gradient-to-b from-cyan-50 to-white px-6 pt-16 text-center">
    <div className="flex h-16 w-16 items-center justify-center rounded-full text-3xl text-white" style={{ background: ACCENT }}>
      ✓
    </div>
    <div className="mt-6 text-2xl font-semibold text-slate-900">{tx(lang, 'נתראה בשלישי!', 'See you Tuesday!')}</div>
    <p className="mt-2 text-sm leading-6 text-slate-600">{tx(lang, 'אישור נשלח לאימייל, ותזכורת תגיע 24 שעות לפני.', 'A confirmation is in your inbox, and a reminder comes 24 hours before.')}</p>
    <div className="mt-6 w-full rounded-2xl border border-slate-200 bg-white p-4 text-start text-sm">
      <div className="font-semibold text-slate-900">{tx(lang, 'קריותרפיה לכל הגוף', 'Whole-body cryotherapy')}</div>
      <div className="mt-1 text-slate-500">{tx(lang, 'שלישי 11 בנובמבר · 12:15', 'Tue, Nov 11 · 12:15 PM')}</div>
      <div className="mt-3 flex gap-3 text-xs font-semibold" style={{ color: ACCENT }}>
        <span>{tx(lang, 'הוספה ליומן', 'Add to calendar')}</span>
        <span>{tx(lang, 'שינוי מועד', 'Reschedule')}</span>
      </div>
    </div>
    <div className="mt-6 text-xs text-slate-500">{tx(lang, 'בהגעה: סרקו את הקוד בדלפק לצ׳ק-אין.', 'On arrival: scan the code at the desk to check in.')}</div>
  </div>
)

const HOURS = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']
const BOOKED: Record<string, { name: string; tone: string }[]> = {
  '11:00': [{ name: 'J. Martinez · WBC', tone: 'bg-cyan-100 text-cyan-900' }],
  '12:00': [{ name: 'K. Walsh · WBC', tone: 'bg-cyan-100 text-cyan-900' }, { name: 'D. Kim · Facial', tone: 'bg-violet-100 text-violet-900' }],
  '14:00': [{ name: 'Walk-in · WBC', tone: 'bg-amber-100 text-amber-900' }],
  '16:00': [{ name: 'Scranton Royals ×4', tone: 'bg-emerald-100 text-emerald-900' }],
  '17:00': [{ name: 'M. Heise · cryoair', tone: 'bg-cyan-100 text-cyan-900' }],
}

const StaffCalendar: Screen = ({ lang }) => (
  <div className="flex min-h-full bg-slate-50 text-[13px]" dir="ltr">
    <aside className="w-44 shrink-0 space-y-1 border-r border-slate-200 bg-white p-3">
      <Image src="/offers/cryo/logo-black.webp" alt="" width={120} height={36} className="mb-4 h-7 w-auto" />
      {['Today', 'Calendar', 'Clients', 'Packages', 'Kiosk', 'Reports', 'Settings'].map((n, i) => (
        <div key={n} className={`rounded-md px-2 py-1.5 ${i === 1 ? 'bg-cyan-50 font-semibold text-cyan-900' : 'text-slate-600'}`}>
          {n}
        </div>
      ))}
    </aside>
    <div className="flex-1 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-lg font-semibold text-slate-900">{tx(lang, 'שלישי, 11 בנובמבר', 'Tuesday, November 11')}</div>
        <div className="flex gap-2">
          <span className="rounded-md border border-slate-200 bg-white px-2 py-1">{tx(lang, 'יום', 'Day')}</span>
          <span className="rounded-md px-2 py-1 font-semibold text-white" style={{ background: ACCENT }}>
            + {tx(lang, 'הזמנה', 'Booking')}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 pb-3">
        {[
          [tx(lang, 'הזמנות היום', 'Bookings today'), '14'],
          [tx(lang, 'הגיעו', 'Checked in'), '6'],
          [tx(lang, 'הכנסות', 'Revenue'), '$465'],
          [tx(lang, 'כרטיסיות פעילות', 'Active packages'), '38'],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
            <div className="text-[11px] text-slate-500">{l}</div>
            <div className="text-lg font-semibold text-slate-900">{v}</div>
          </div>
        ))}
      </div>
      <div className="divide-y divide-slate-100 rounded-lg bg-white ring-1 ring-slate-200">
        {HOURS.map((h) => (
          <div key={h} className="flex min-h-[34px] items-center gap-3 px-3 py-1.5">
            <span className="w-12 text-[11px] text-slate-400">{h}</span>
            <div className="flex flex-1 gap-2">
              {(BOOKED[h] ?? []).map((b) => (
                <span key={b.name} className={`rounded px-2 py-0.5 text-[12px] font-medium ${b.tone}`}>
                  {b.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)

const Kiosk: Screen = ({ lang }) => (
  <div className="relative flex min-h-full flex-col items-center justify-center overflow-hidden bg-slate-950 p-8 text-center text-white">
    <Image src="/offers/cryo/cryoone-room-800.webp" alt="" fill className="object-cover opacity-25" sizes="800px" />
    <div className="relative">
      <div className="text-sm uppercase tracking-[0.25em] text-cyan-300">{tx(lang, 'ברוכים הבאים', 'Welcome in')}</div>
      <div className="mt-3 text-4xl font-semibold">{tx(lang, 'צ׳ק-אין בנגיעה', 'Tap to check in')}</div>
      <p className="mx-auto mt-3 max-w-md text-slate-300">{tx(lang, 'סרקו את הקוד מהאימייל, או הקלידו את מספר הטלפון. התשלום בדלפק דרך מסוף Stripe.', 'Scan the code from your email or type your phone number. Pay at the desk on the Stripe reader.')}</p>
      <div className="mt-8 inline-grid grid-cols-3 gap-2" dir="ltr">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, i) => (
          <span key={i} className={`flex h-12 w-16 items-center justify-center rounded-xl text-lg ${k ? 'bg-white/10' : ''}`}>
            {k}
          </span>
        ))}
      </div>
    </div>
  </div>
)

export const screens = { home: Home, treatments: Treatments, pickTime: PickTime, checkout: Checkout, confirmed: Confirmed, staffCalendar: StaffCalendar, kiosk: Kiosk } satisfies Record<string, Screen>
