import Image from 'next/image'
import type { Lang, Screen } from '../types'
import { AppScreen, OrderSummary, PaymentMethods, StatusTimeline, NotificationList } from '../blocks/app'
import { DashboardShell, StatCards, DataTable, Kanban, FormPanel } from '../blocks/dashboard'
import { Icon, cx } from '../blocks/base'

/**
 * Mockups for the produce-box offer: subscriber app, restaurant ordering, driver link, back office.
 * No photos yet, so screens are built from text and lists rather than placeholder tiles.
 */

const tx = (lang: Lang, he: string, en: string): string => (lang === 'he' ? he : en)
const BRAND = { he: 'Altius', en: 'Altius' }
const LOGO = '/offers/testing/logo-on-dark.svg'
const LOGO_ON_LIGHT = '/offers/testing/logo-on-light.svg'

// ─── Local parts ─────────────────────────────────────────────────────────────

/** A plain receipt-style row: name and quantity on one side, price on the other. */
function Line({ name, qty, price, note, muted }: { name: string; qty?: string; price?: string; note?: string; muted?: boolean }): React.ReactElement {
  return (
    <div className={cx('flex items-baseline justify-between gap-3 py-2.5', muted && 'opacity-50')}>
      <div className="min-w-0">
        <div className={cx('text-sm text-slate-900', muted && 'line-through')}>{name}</div>
        {note ? <div className="text-[11px] text-slate-500">{note}</div> : null}
      </div>
      <div className="flex shrink-0 items-baseline gap-3 text-sm tabular-nums">
        {qty ? (
          <span dir="ltr" className="text-slate-500">
            {qty}
          </span>
        ) : null}
        {price ? (
          <span dir="ltr" className="w-12 text-end font-medium text-slate-900">
            {price}
          </span>
        ) : null}
      </div>
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }): React.ReactElement {
  return <div className={cx('rounded-xl bg-white px-4 ring-1 ring-slate-200', className)}>{children}</div>
}

function SmallButton({ children, solid }: { children: React.ReactNode; solid?: boolean }): React.ReactElement {
  return (
    <span className={cx('flex-1 rounded-lg py-2 text-center text-xs font-semibold', solid ? 'bg-[var(--offer-accent)] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300')}>
      {children}
    </span>
  )
}

// ─── Subscriber (phone) ──────────────────────────────────────────────────────

/** Sign-in on the brand's dark ground, so the original logo (white letters) is used as designed. */
const Login: Screen = ({ lang }) => {
  const typed = '7203'
  return (
    <div className="flex min-h-full flex-col bg-stone-950 px-6 pt-14 text-white">
      <Image src={LOGO} alt={BRAND.en} width={102} height={35} />
      <h2 className="mt-12 text-2xl font-semibold">{tx(lang, 'שלחנו לך קוד ב-WhatsApp', 'We sent you a code on WhatsApp')}</h2>
      <p className="mt-2 text-sm text-stone-400">{tx(lang, 'לטלפון שמסתיים ב-4417', 'To the number ending 4417')}</p>
      <div className="mt-8 flex justify-between gap-2" dir="ltr">
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cx('flex h-12 w-10 items-center justify-center rounded-lg text-xl font-semibold ring-1', i < typed.length ? 'ring-stone-600' : i === typed.length ? 'ring-2 ring-[#c09560]' : 'ring-stone-800')}>
            {typed[i] ?? ''}
          </span>
        ))}
      </div>
      <p className="mt-4 text-xs text-stone-500">{tx(lang, 'לא הגיע? שליחה חוזרת בעוד 0:41', "Didn't get it? Resend in 0:41")}</p>
      <div className="mt-auto pb-8">
        <span className="block rounded-xl bg-[var(--offer-accent)] py-3.5 text-center text-sm font-semibold">{tx(lang, 'כניסה', 'Sign in')}</span>
      </div>
    </div>
  )
}

const BOX = [
  { he: 'עגבניות שרי', en: 'Cherry tomatoes', qty: '500 g' },
  { he: 'מלפפונים', en: 'Cucumbers', qty: '1 kg' },
  { he: 'חסה ערבית', en: 'Romaine lettuce', qty: '1' },
  { he: 'גזר', en: 'Carrots', qty: '1 kg' },
  { he: 'בטטה', en: 'Sweet potatoes', qty: '1 kg' },
  { he: 'פטרוזיליה', en: 'Parsley', qty: '1' },
]

const MyBox: Screen = ({ lang }) => (
  <AppScreen
    top={{ title: tx(lang, 'הסל שלי', 'My box'), action: 'bell', rtl: lang === 'he' }}
    tabs={{ tabs: [{ icon: 'package', label: tx(lang, 'הסל', 'Box') }, { icon: 'bag', label: tx(lang, 'תוספות', 'Extras') }, { icon: 'truck', label: tx(lang, 'משלוחים', 'Deliveries') }, { icon: 'user', label: tx(lang, 'חשבון', 'Account') }], active: 0 }}
  >
    <div>
      <div className="text-xs text-slate-500">{tx(lang, 'סל משפחתי · כל שבוע', 'Family box · weekly')}</div>
      <div className="mt-0.5 text-lg font-semibold text-slate-900">{tx(lang, 'מגיע ביום חמישי, 13.11', 'Arrives Thursday, 13 Nov')}</div>
      <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
        {tx(lang, 'אפשר לשנות עד שלישי ב-20:00. אחרי זה הסל נסגר לליקוט.', 'Changes close Tuesday at 20:00, then the box goes to picking.')}
      </div>
    </div>
    <Card className="divide-y divide-slate-100">
      {BOX.map((b) => (
        <Line key={b.en} name={tx(lang, b.he, b.en)} qty={b.qty} />
      ))}
      <Line name={tx(lang, 'כרובית', 'Cauliflower')} note={tx(lang, 'הוחלף בברוקולי', 'Swapped for broccoli')} muted />
      <Line name={tx(lang, 'ברוקולי', 'Broccoli')} qty="1" />
    </Card>
    <div className="flex gap-2">
      <SmallButton>{tx(lang, 'החלפת פריט', 'Swap an item')}</SmallButton>
      <SmallButton>{tx(lang, 'דילוג על השבוע', 'Skip this week')}</SmallButton>
      <SmallButton>{tx(lang, 'הקפאה', 'Pause')}</SmallButton>
    </div>
  </AppScreen>
)

const Extras: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'תוספות לסל', 'Add to this box'), back: true, rtl: lang === 'he' }} cta={tx(lang, 'הוספה לסל של חמישי · ₪46', 'Add to Thursday · ₪46')}>
    <div className="flex gap-2 overflow-hidden text-xs">
      {[tx(lang, 'הכול', 'All'), tx(lang, 'פירות', 'Fruit'), tx(lang, 'ביצים וחלב', 'Eggs & dairy'), tx(lang, 'מזווה', 'Pantry')].map((c, i) => (
        <span key={c} className={cx('shrink-0 rounded-full px-3 py-1', i === 0 ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200')}>
          {c}
        </span>
      ))}
    </div>
    <Card className="divide-y divide-slate-100">
      {[
        { he: 'תפוחי גאלה', en: 'Gala apples', p: '₪14', u: tx(lang, 'לק״ג', '/kg'), q: 1 },
        { he: 'ביצים חופש, 12', en: 'Free-range eggs, 12', p: '₪32', u: '', q: 1 },
        { he: 'אבוקדו האס', en: 'Hass avocado', p: '₪6', u: tx(lang, 'ליח׳', 'each'), q: 0 },
        { he: 'שמן זית, 750 מ״ל', en: 'Olive oil, 750 ml', p: '₪58', u: '', q: 0 },
        { he: 'נענע', en: 'Mint', p: '₪5', u: '', q: 0 },
      ].map((x) => (
        <div key={x.en} className="flex items-center justify-between gap-3 py-3">
          <div>
            <div className="text-sm text-slate-900">{tx(lang, x.he, x.en)}</div>
            <div className="text-xs text-slate-500">
              {x.p} {x.u}
            </div>
          </div>
          {x.q ? (
            <div className="flex items-center gap-3 rounded-lg ring-1 ring-slate-300 px-2 py-1 text-sm">
              <span className="text-slate-400">−</span>
              <span className="tabular-nums font-medium">{x.q}</span>
              <span className="text-slate-700">+</span>
            </div>
          ) : (
            <span className="rounded-lg px-3 py-1 text-sm font-medium text-[var(--offer-accent)] ring-1 ring-slate-300">{tx(lang, 'הוספה', 'Add')}</span>
          )}
        </div>
      ))}
    </Card>
  </AppScreen>
)

const Checkout: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'סיכום ותשלום', 'Review and pay'), back: true, rtl: lang === 'he' }} cta={tx(lang, 'תשלום ₪219', 'Pay ₪219')}>
    <OrderSummary
      lines={[
        { label: tx(lang, 'סל משפחתי', 'Family box'), value: '₪159' },
        { label: tx(lang, 'תוספות (2)', 'Extras (2)'), value: '₪46' },
        { label: tx(lang, 'משלוח · רחובות', 'Delivery · Rehovot'), value: '₪14' },
      ]}
      total={{ label: tx(lang, 'לתשלום', 'Total'), value: '₪219' }}
      note={tx(lang, 'משלוח חינם מעל ₪250. חסרים לך ₪31.', 'Free delivery over ₪250. You are ₪31 away.')}
    />
    <PaymentMethods
      wallet={tx(lang, 'כרטיס שמור •• 8812', 'Saved card •• 8812')}
      orCard={tx(lang, 'או כרטיס אחר', 'or another card')}
      cardFields={['0000 0000 0000 0000', 'MM / YY   CVV']}
      consent={tx(lang, 'לחייב את הכרטיס הזה גם בשבועות הבאים', 'Charge this card for future weeks too')}
    />
  </AppScreen>
)

const Tracking: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'המשלוח של חמישי', "Thursday's delivery"), back: true, rtl: lang === 'he' }}>
    <StatusTimeline
      steps={[
        { label: tx(lang, 'הסל נסגר', 'Box locked'), time: tx(lang, 'שלישי 20:00', 'Tue 20:00'), done: true },
        { label: tx(lang, 'לוקט ונארז', 'Picked and packed'), time: '07:40', done: true },
        { label: tx(lang, 'בדרך, עצירה 6 מתוך 14', 'On the way, stop 6 of 14'), time: '11:10', done: true },
        { label: tx(lang, 'נמסר ליד הדלת', 'Left at the door'), time: '11:52', current: true },
      ]}
    />
    <NotificationList
      items={[
        { icon: 'camera', title: tx(lang, 'תמונת מסירה מהנהג', 'Photo from the driver'), body: tx(lang, 'הסל ליד הדלת, קומה 2', 'Box at the door, 2nd floor'), time: '11:52', unread: true },
        { icon: 'chat', title: 'WhatsApp', body: tx(lang, 'הקבלה נשלחה למייל', 'Receipt sent by email'), time: '11:53' },
      ]}
    />
  </AppScreen>
)

// ─── Restaurant (phone) ──────────────────────────────────────────────────────

const Restaurant: Screen = ({ lang }) => (
  <AppScreen top={{ title: tx(lang, 'מסעדת ליבנה · הזמנה', 'Livne restaurant · Order'), rtl: lang === 'he' }} cta={tx(lang, 'שליחת הזמנה · בהקפה', 'Send order · on account')}>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
        <div className="text-slate-500">{tx(lang, 'יתרה פתוחה', 'Open balance')}</div>
        <div className="mt-0.5 text-base font-semibold tabular-nums text-slate-900">₪3,420</div>
      </div>
      <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
        <div className="text-slate-500">{tx(lang, 'משלוח הבא', 'Next delivery')}</div>
        <div className="mt-0.5 text-base font-semibold text-slate-900">{tx(lang, 'מחר 06:30', 'Tomorrow 06:30')}</div>
      </div>
    </div>
    <div className="flex items-center justify-between text-xs">
      <span className="font-semibold text-slate-700">{tx(lang, 'כמו ההזמנה של יום ב׳', "Same as Monday's order")}</span>
      <span className="text-[var(--offer-accent)]">{tx(lang, 'עריכה', 'Edit')}</span>
    </div>
    <Card className="divide-y divide-slate-100">
      <Line name={tx(lang, 'עגבניות', 'Tomatoes')} qty="12 kg" price="₪84" />
      <Line name={tx(lang, 'בצל יבש', 'Onions')} qty="10 kg" price="₪45" />
      <Line name={tx(lang, 'חסה לאליק', 'Lollo lettuce')} qty="18" price="₪99" />
      <Line name={tx(lang, 'לימונים', 'Lemons')} qty="5 kg" price="₪40" />
      <Line name={tx(lang, 'כוסברה', 'Coriander')} qty="10" price="₪35" />
    </Card>
    <div className="flex justify-between px-1 text-sm">
      <span className="text-slate-500">{tx(lang, 'מחירון מסעדות · מינימום ₪250', 'Restaurant price list · min ₪250')}</span>
      <span className="font-semibold tabular-nums">₪303</span>
    </div>
  </AppScreen>
)

// ─── Driver (phone, link with no login) ──────────────────────────────────────

const STOPS = [
  { n: 5, he: 'הרצל 112, רחובות', en: '112 Herzl, Rehovot', who: 'משפחת אזולאי', whoEn: 'Azoulay family', done: true },
  { n: 6, he: 'יעקב 8, דירה 4', en: '8 Yaakov, apt 4', who: 'נועה ברק', whoEn: 'Noa Barak', current: true, note: 'קוד לבניין 1960#', noteEn: 'Building code 1960#' },
  { n: 7, he: 'הנשיא 21', en: '21 HaNasi', who: 'דוד מזרחי', whoEn: 'David Mizrahi' },
  { n: 8, he: 'מוסקוביץ 3', en: '3 Moskowitz', who: 'קפה גינה', whoEn: 'Cafe Gina' },
]

const Driver: Screen = ({ lang }) => (
  <div className="flex min-h-full flex-col bg-slate-50">
    <div className="bg-slate-900 px-4 py-3 text-white">
      <div className="text-xs text-slate-400">{tx(lang, 'מסלול ב׳ · חמישי', 'Route B · Thursday')}</div>
      <div className="font-semibold">{tx(lang, '6 מתוך 14 עצירות', 'Stop 6 of 14')}</div>
    </div>
    <div className="flex-1 space-y-2 p-3">
      {STOPS.map((s) => (
        <div key={s.n} className={cx('rounded-xl bg-white p-3 ring-1', s.current ? 'ring-2 ring-[var(--offer-accent)]' : 'ring-slate-200', s.done && 'opacity-50')}>
          <div className="flex items-start gap-3">
            <span className={cx('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold', s.done ? 'bg-slate-200 text-slate-600' : 'bg-slate-900 text-white')}>
              {s.done ? <Icon name="check" className="h-3.5 w-3.5" /> : s.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-slate-900">{tx(lang, s.he, s.en)}</div>
              <div className="text-xs text-slate-500">{tx(lang, s.who, s.whoEn)}</div>
              {s.note ? <div className="mt-1 text-xs text-amber-700">{tx(lang, s.note, s.noteEn ?? '')}</div> : null}
            </div>
          </div>
          {s.current ? (
            <div className="mt-3 flex gap-2">
              <SmallButton>{tx(lang, 'ניווט', 'Navigate')}</SmallButton>
              <SmallButton solid>{tx(lang, 'צילום ומסירה', 'Photo and deliver')}</SmallButton>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  </div>
)

// ─── Back office (desktop) ───────────────────────────────────────────────────

const nav = (lang: Lang) => [
  { icon: 'dashboard' as const, label: tx(lang, 'היום', 'Today') },
  { icon: 'bag' as const, label: tx(lang, 'הזמנות', 'Orders') },
  { icon: 'users' as const, label: tx(lang, 'מנויים', 'Subscribers') },
  { icon: 'package' as const, label: tx(lang, 'ליקוט', 'Picking'), badge: '86' },
  { icon: 'truck' as const, label: tx(lang, 'אזורי חלוקה', 'Delivery zones') },
  { icon: 'chart' as const, label: tx(lang, 'דוחות', 'Reports') },
]

const Orders: Screen = ({ lang }) => (
  <DashboardShell brand={tx(lang, BRAND.he, BRAND.en)} logo={LOGO_ON_LIGHT} nav={nav(lang)} active={1} title={tx(lang, 'הזמנות לחמישי, 13.11', 'Orders for Thursday, 13 Nov')} subtitle={tx(lang, 'נסגר לשינויים בשלישי 20:00', 'Locks Tuesday 20:00')} actions={[tx(lang, 'ייצוא לפריוריטי', 'Export to Priority'), tx(lang, '+ הזמנה', '+ Order')]} user="Yael">
    <StatCards
      stats={[
        { label: tx(lang, 'סלים', 'Boxes'), value: '214' },
        { label: tx(lang, 'דילגו השבוע', 'Skipped this week'), value: '31' },
        { label: tx(lang, 'מסעדות', 'Restaurants'), value: '9' },
        { label: tx(lang, 'חסרים', 'Short items'), value: '3', trend: 'down' },
      ]}
    />
    <DataTable
      columns={[tx(lang, 'לקוח', 'Customer'), tx(lang, 'סוג', 'Type'), tx(lang, 'אזור', 'Zone'), tx(lang, 'סכום', 'Total'), tx(lang, 'סטטוס', 'Status')]}
      rows={[
        [tx(lang, 'נועה ברק', 'Noa Barak'), tx(lang, 'סל משפחתי', 'Family box'), tx(lang, 'רחובות', 'Rehovot'), '₪219', { text: tx(lang, 'שולם', 'Paid'), pill: 'success' }],
        [tx(lang, 'משפחת אזולאי', 'Azoulay family'), tx(lang, 'סל זוגי', 'Couple box'), tx(lang, 'נס ציונה', 'Ness Ziona'), '₪129', { text: tx(lang, 'שולם', 'Paid'), pill: 'success' }],
        [tx(lang, 'מסעדת ליבנה', 'Livne restaurant'), tx(lang, 'מסעדה', 'Restaurant'), tx(lang, 'רחובות', 'Rehovot'), '₪303', { text: tx(lang, 'בהקפה', 'On account'), pill: 'accent' }],
        [tx(lang, 'דוד מזרחי', 'David Mizrahi'), tx(lang, 'סל משפחתי', 'Family box'), tx(lang, 'רחובות', 'Rehovot'), '₪159', { text: tx(lang, 'כרטיס נדחה', 'Card declined'), pill: 'danger' }],
        [tx(lang, 'רונית שגיא', 'Ronit Sagi'), tx(lang, 'סל זוגי', 'Couple box'), tx(lang, 'גדרה', 'Gedera'), '—', { text: tx(lang, 'מוקפא עד 1.12', 'Paused to 1 Dec'), pill: 'warning' }],
      ]}
      footer={tx(lang, '5 מתוך 223', '5 of 223')}
    />
  </DashboardShell>
)

const Picking: Screen = ({ lang }) => (
  <DashboardShell brand={tx(lang, BRAND.he, BRAND.en)} logo={LOGO_ON_LIGHT} nav={nav(lang)} active={3} title={tx(lang, 'ליקוט, חמישי', 'Picking, Thursday')} actions={[tx(lang, 'הדפסת רשימות', 'Print lists')]} user="Yael">
    <Kanban
      columns={[
        { title: tx(lang, 'לליקוט', 'To pick'), cards: [{ title: tx(lang, 'מסלול ג׳ · 38 סלים', 'Route C · 38 boxes'), meta: tx(lang, 'גדרה, יבנה', 'Gedera, Yavne') }, { title: tx(lang, 'מסעדות · 9', 'Restaurants · 9'), meta: '06:30' }] },
        { title: tx(lang, 'בליקוט', 'Picking'), tone: 'accent', cards: [{ title: tx(lang, 'מסלול ב׳ · 48 סלים', 'Route B · 48 boxes'), meta: tx(lang, 'רחובות', 'Rehovot'), person: 'Moshe' }] },
        { title: tx(lang, 'ארוז', 'Packed'), tone: 'success', cards: [{ title: tx(lang, 'מסלול א׳ · 52 סלים', 'Route A · 52 boxes'), meta: tx(lang, 'נס ציונה', 'Ness Ziona'), tag: tx(lang, 'מוכן לנהג', 'Ready') }] },
      ]}
    />
  </DashboardShell>
)

const Zones: Screen = ({ lang }) => (
  <DashboardShell brand={tx(lang, BRAND.he, BRAND.en)} logo={LOGO_ON_LIGHT} nav={nav(lang)} active={4} title={tx(lang, 'אזורי חלוקה', 'Delivery zones')} user="Yael">
    <FormPanel
      title={tx(lang, 'רחובות', 'Rehovot')}
      fields={[
        { label: tx(lang, 'ימי משלוח', 'Delivery days'), value: tx(lang, 'שני, חמישי', 'Mon, Thu'), kind: 'select', half: true },
        { label: tx(lang, 'חלון שינויים נסגר', 'Changes close'), value: tx(lang, 'יומיים לפני, 20:00', '2 days before, 20:00'), kind: 'select', half: true },
        { label: tx(lang, 'דמי משלוח', 'Delivery fee'), value: '₪14', half: true },
        { label: tx(lang, 'משלוח חינם מעל', 'Free over'), value: '₪250', half: true },
        { label: tx(lang, 'רשימת המתנה כשהאזור מלא', 'Waiting list when full'), kind: 'toggle' },
      ]}
      actions={[tx(lang, 'ביטול', 'Cancel'), tx(lang, 'שמירה', 'Save')]}
    />
  </DashboardShell>
)

export const screens = {
  login: Login,
  myBox: MyBox,
  extras: Extras,
  checkout: Checkout,
  tracking: Tracking,
  restaurant: Restaurant,
  driver: Driver,
  orders: Orders,
  picking: Picking,
  zones: Zones,
}
