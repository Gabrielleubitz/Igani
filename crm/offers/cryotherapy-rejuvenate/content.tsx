import type { OfferDefinition } from '../types'
import { screens } from './screens'

/**
 * Offer "cryotherapy-rejuvenate": new landing page + own booking system replacing JaneApp.
 * The screens are real screenshots and recordings of the working product (see screens.tsx).
 */
const offer: OfferDefinition = {
  screens,
  content: {
    defaultLang: 'en',
    client: {
      name: { he: 'Cryotherapy Rejuvenate', en: 'Cryotherapy Rejuvenate' },
      accent: '#2952a3',
    },
    hero: {
      eyebrow: { he: 'הצעת פרויקט · אתר ומערכת הזמנות', en: 'Project offer · Website and booking system' },
      title: {
        he: 'האתר, ההזמנות והדלפק של הקליניקה, במערכת אחת שלכם',
        en: "Your clinic's website, bookings and front desk, in one system you own",
      },
      summary: {
        he: 'המערכת כבר רצה, וכל מסך בעמוד הזה צולם ממנה. דף נחיתה סביב תא ה-cryo:one+, הזמנה ותשלום במקום JaneApp, ומסך צוות לדלפק. נשאר להעביר את הנתונים ולעלות לאוויר.',
        en: "The system already runs, and every screen on this page was captured from it. A landing page around your cryo:one+ chamber, booking and payment in place of JaneApp, and a staff console for the front desk. What's left is moving your data over and going live.",
      },
    },
    facts: [
      { label: { he: 'מחליף', en: 'Replaces' }, value: { he: 'JaneApp + WordPress', en: 'JaneApp + WordPress' } },
      { label: { he: 'מצב', en: 'Status' }, value: { he: 'בנוי ורץ, לפני מעבר', en: 'Built and running, pre-launch' } },
    ],
    need: {
      title: { he: 'מה צריך לקרות', en: 'What needs to happen' },
      body: {
        he: 'היום האתר בוורדפרס וההזמנות ב-JaneApp. הלקוח עובר בין שתי מערכות, משלמים מנוי חודשי על JaneApp, והצוות מנהל הצהרות, לקוחות מזדמנים ותשלומים בדלפק בכמה מקומות.',
        en: 'Today the website runs on WordPress and bookings run on JaneApp. Clients jump between two systems, you pay JaneApp every month, and staff handle waivers, walk-ins and desk payments in several places.',
      },
      points: [
        { he: 'הזמנה ותשלום באתר שלכם, בלי לעבור למערכת אחרת', en: 'Book and pay on your own site, without leaving for another system' },
        { he: 'רק שעות פנויות באמת, לפי תא וזמן טיפול', en: 'Only truly open times, per chamber and session length' },
        { he: 'הצהרת בריאות חתומה לפני שהלקוח מגיע', en: 'A signed waiver on file before the client arrives' },
        { he: 'כל ההיסטוריה מ-JaneApp עוברת איתכם', en: 'All your JaneApp history comes with you' },
      ],
    },
    solution: {
      title: { he: 'מה כבר בנוי', en: "What's already built" },
      body: {
        he: 'שני חלקים שעובדים יחד. דף נחיתה מהיר שמראה את התא, את הטיפול דקה אחר דקה, ולקוחות אמיתיים. ומערכת הזמנות משלכם: הלקוח בוחר טיפול ושעה ומשלם, והצוות רואה הכול ביומן אחד. כל הזמנה נבדקת בשרת, כך שאין כפל הזמנות.',
        en: 'Two parts that work together. A fast landing page that shows the chamber, the session minute by minute, and real clients. And your own booking system: the client picks a treatment and a time and pays, and staff see everything in one calendar. Every booking is checked on the server, so double bookings cannot happen.',
      },
      points: [
        { he: 'הזמנה בשלושה צעדים: טיפול, שעה, אישור', en: 'Booking in three steps: treatment, time, review' },
        { he: 'כניסה עם Google, Apple או אימייל', en: 'Sign in with Google, Apple or email' },
        { he: 'יומן צוות לפי חדרים, עם לקוחות מזדמנים', en: 'Staff calendar by room, walk-ins included' },
        { he: 'Stripe לתשלום אונליין, קבלות והחזרים', en: 'Stripe for online payments, receipts and refunds' },
        { he: 'הקוד והנתונים שלכם', en: 'You own the code and the data' },
      ],
    },
    architecture: {
      title: { he: 'איך הכול מתחבר', en: 'How it fits together' },
      layers: [
        {
          name: { he: 'ערוצים', en: 'Channels' },
          items: [
            { label: { he: 'דף נחיתה', en: 'Landing page' }, moduleId: 'landing-page' },
            { label: { he: 'הזמנה אונליין', en: 'Online booking' }, moduleId: 'online-booking' },
            { label: { he: 'אזור לקוח', en: 'Client account' }, moduleId: 'client-account' },
            { label: { he: 'צ׳ק-אין עצמי', en: 'Self check-in' }, moduleId: 'self-check-in' },
          ],
        },
        {
          name: { he: 'ליבה', en: 'Core' },
          items: [
            { label: { he: 'מנוע זמינות', en: 'Availability engine' }, moduleId: 'booking-engine' },
            { label: { he: 'טיפולים ושעות', en: 'Treatments and hours' }, moduleId: 'treatments-schedule' },
            { label: { he: 'הצהרות והסכמים', en: 'Waivers and agreements' }, moduleId: 'waiver-agreement' },
            { label: { he: 'תשלומים', en: 'Payments' }, moduleId: 'online-payments' },
          ],
        },
        {
          name: { he: 'תפעול', en: 'Operations' },
          items: [
            { label: { he: 'מסך צוות', en: 'Staff console' }, moduleId: 'admin-console' },
            { label: { he: 'ספר לקוחות', en: 'Guest directory' }, moduleId: 'guest-directory' },
            { label: { he: 'אימיילים', en: 'Emails' }, moduleId: 'transactional-email' },
            { label: { he: 'יבוא מ-JaneApp', en: 'JaneApp import' }, moduleId: 'janeapp-migration' },
          ],
        },
        {
          name: { he: 'תשתית', en: 'Platform' },
          items: [
            { label: { he: 'Vercel + Firebase', en: 'Vercel + Firebase' }, moduleId: 'platform-infrastructure' },
            { label: { he: 'אבטחה', en: 'Security' }, moduleId: 'security-hardening' },
            { label: { he: 'Stripe', en: 'Stripe' }, moduleId: 'online-payments' },
          ],
        },
      ],
    },
    flows: [
      {
        id: 'booking',
        device: 'phone',
        title: { he: 'הלקוח מזמין טיפול, בטלפון', en: 'A client books a session, on a phone' },
        caption: {
          he: 'צילומי מסך והקלטה מהמערכת עצמה, עם הטיפולים והמחירים שלכם.',
          en: 'Screenshots and a recording from the system itself, with your treatments and prices.',
        },
        steps: [
          { screen: 'bookClip', title: { he: 'בהקלטה', en: 'In motion' }, caption: { he: 'הזמנה מלאה בכמה שניות: טיפול, יום, שעה.', en: 'A full booking in seconds: treatment, day, time.' } },
          { screen: 'bookTreatments', title: { he: 'בחירת טיפול', en: 'Choose a treatment' }, caption: { he: 'כל טיפול עם מחיר, משך ותיאור. מחירי סטודנט וצבא באותה רשימה.', en: 'Each treatment with price, length and description. Student and military rates in the same list.' } },
          { screen: 'bookTime', title: { he: 'בחירת שעה', en: 'Pick a time' }, caption: { he: 'שעות שתפוסות או שעברו מוצגות כלא זמינות. ימי סגירה לא מופיעים.', en: 'Taken or past times show as unavailable. Closed days do not appear.' } },
          { screen: 'bookReview', title: { he: 'סיכום ותשלום', en: 'Review and pay' }, caption: { he: 'השעה נשמרת ללקוח בזמן שהוא נכנס ומשלם.', en: 'The time is held for the client while they sign in and pay.' } },
          { screen: 'bookWaiver', title: { he: 'הצהרת בריאות', en: 'Waiver' }, caption: { he: 'חתימה מהטלפון לפני ההגעה, נשמרת בכרטיס הלקוח.', en: 'Signed from the phone before arriving, stored on the guest profile.' } },
          { screen: 'bookPackages', title: { he: 'כרטיסיות', en: 'Packages' }, caption: { he: 'מודול אופציונלי: כרטיסיות ומנוי חודשי, נמכרים אונליין.', en: 'Optional module: session packs and monthly unlimited, sold online.' } },
        ],
      },
      {
        id: 'website',
        device: 'desktop',
        title: { he: 'דף הנחיתה', en: 'The landing page' },
        caption: { he: 'בנוי סביב התא, עם כפתור הזמנה בכל מסך.', en: 'Built around the chamber, with a booking button on every screen.' },
        steps: [
          { screen: 'siteClip', title: { he: 'גלילה', en: 'Scroll through' }, caption: { he: 'התא נפתח, הטמפרטורה יורדת, והטיפול מוצג דקה אחר דקה.', en: 'The chamber opens, the temperature drops, and the session plays minute by minute.' } },
          { screen: 'siteHero', title: { he: 'המסך הראשון', en: 'First screen' }, caption: { he: 'מה זה, כמה זה עולה, איפה זה, ואיך מזמינים.', en: 'What it is, what it costs, where it is, and how to book.' } },
          { screen: 'siteChamber', title: { he: 'התא', en: 'The chamber' }, caption: { he: 'MECOTEC cryo:one+: חשמלי, בלי חנקן, כניסה בגובה הרצפה.', en: 'MECOTEC cryo:one+: electric, no nitrogen, walk-in floor.' } },
          { screen: 'siteStories', title: { he: 'לקוחות אמיתיים', en: 'Real clients' }, caption: { he: 'עדויות וידאו, ומי עומד מאחורי הקליניקה.', en: 'Video testimonials, and who runs the clinic.' } },
        ],
      },
      {
        id: 'staff',
        device: 'desktop',
        title: { he: 'מסך הצוות', en: 'The staff console' },
        caption: {
          he: 'נתוני הדגמה, או שמות לקוחות מטושטשים.',
          en: 'Demo data, or client names blurred.',
        },
        steps: [
          { screen: 'adminDay', title: { he: 'היום', en: 'Today' }, caption: { he: 'כל ההזמנות לפי חדר, מי הגיע, מי לא שילם, וכמה נגבה היום.', en: 'Every booking by room, who arrived, who has not paid, and what was collected today.' } },
          { screen: 'adminWalkin', title: { he: 'לקוח מזדמן', en: 'Walk-in' }, caption: { he: 'מחפשים לקוח לפי שם או טלפון, בוחרים שעה, ושולחים תשלום.', en: 'Find a client by name or phone, pick a time, and send the payment.' } },
          { screen: 'adminGuests', title: { he: 'לקוחות', en: 'Guests' }, caption: { he: 'כל הלקוחות, כולל אלה מ-JaneApp, עם סטטוס הסכם וניוזלטר.', en: 'Every guest, JaneApp imports included, with agreement and newsletter status.' } },
          { screen: 'adminSettings', title: { he: 'הגדרות', en: 'Settings' }, caption: { he: 'שעות פתיחה, חוקי הזמנה, ימי סגירה ותזכורות.', en: 'Opening hours, booking rules, closed days and reminders.' } },
          { screen: 'walkthrough', title: { he: 'סרטון הדרכה', en: 'Narrated tour' }, caption: { he: '4 דקות על כל המערכת, עם קריינות באנגלית.', en: 'Four minutes on the whole system, narrated.' } },
        ],
      },
    ],
    gallery: [
      { src: '/offers/cryotherapy-rejuvenate/g-email.webp', caption: { he: 'אימייל אישור, עם צ׳ק-אין בלחיצה', en: 'Confirmation email, with one-tap check-in' } },
      { src: '/offers/cryotherapy-rejuvenate/g-cal-month.webp', caption: { he: 'יומן חודשי והכנסות', en: 'Month calendar and revenue' } },
      { src: '/offers/cryotherapy-rejuvenate/g-treatments.webp', caption: { he: 'טיפולים, חדרים וזמני קירור', en: 'Treatments, rooms and cool-down times' } },
      { src: '/offers/cryotherapy-rejuvenate/g-walkin.webp', caption: { he: 'הזמנת לקוח מזדמן בדלפק', en: 'Booking a walk-in at the desk' } },
      { src: '/offers/cryotherapy-rejuvenate/g-packages-admin.webp', caption: { he: 'כרטיסיות (אופציונלי)', en: 'Packages (optional)' } },
      { src: '/offers/cryotherapy-rejuvenate/g-reports.webp', caption: { he: 'דוחות (אופציונלי)', en: 'Reports (optional)' } },
      { src: '/offers/cryotherapy-rejuvenate/g-terminal.webp', caption: { he: 'מסוף כרטיסים (אופציונלי)', en: 'Card reader (optional)' } },
      { src: '/offers/cryotherapy-rejuvenate/g-timesheets.webp', caption: { he: 'שעון נוכחות (אופציונלי)', en: 'Staff timesheets (optional)' } },
    ],
    modules: {
      'platform-infrastructure': {
        title: { he: 'תשתית', en: 'Platform' },
        summary: { he: 'אחסון, מסד נתונים, סביבות, משימות מתוזמנות, בדיקות וגיבוי.', en: 'Hosting, database, environments, scheduled jobs, tests and backups.' },
      },
      'accounts-sign-in': {
        title: { he: 'כניסה וחשבונות', en: 'Accounts and sign-in' },
        summary: { he: 'כניסה עם אימייל, Google או Apple. הרשאות נפרדות לצוות.', en: 'Sign in with email, Google or Apple. Separate staff permissions.' },
      },
      'treatments-schedule': {
        title: { he: 'טיפולים ושעות', en: 'Treatments and hours' },
        summary: { he: 'טיפולים, מחירים, משכים, חדרים, שעות פתיחה וחגים, לפי שעון החוף המזרחי.', en: 'Treatments, prices, lengths, rooms, opening hours and holidays, in Eastern time.' },
      },
      'booking-engine': {
        title: { he: 'מנוע הזמנות', en: 'Booking engine' },
        summary: { he: 'זמינות בזמן אמת לפי חדר, החזקת שעה בזמן תשלום, ואפס כפל הזמנות.', en: 'Live availability per room, a hold while the client pays, and no double bookings.' },
      },
      'admin-console': {
        title: { he: 'מסך צוות', en: 'Staff console' },
        summary: { he: 'הבסיס של מסך הצוות: ניווט, התראות, עזרה ודפי שגיאה ממותגים.', en: 'The base of the staff console: navigation, notifications, help and branded error pages.' },
      },
      'online-booking': {
        title: { he: 'הזמנה אונליין', en: 'Online booking' },
        summary: { he: 'טיפול, שעה, סיכום ותשלום, והוספה ליומן של הלקוח.', en: 'Treatment, time, review and payment, then add to the client’s calendar.' },
      },
      'manage-booking': {
        title: { he: 'שינוי וביטול', en: 'Reschedule and cancel' },
        summary: { he: 'קישור פרטי באימייל לשינוי מועד או ביטול, לפי מדיניות הביטול.', en: 'A private email link to reschedule or cancel, within your cancellation window.' },
      },
      'client-account': {
        title: { he: 'אזור לקוח', en: 'Client account' },
        summary: { he: 'טיפולים קודמים, הזמנה חוזרת, כרטיסים שמורים וקבלות.', en: 'Past sessions, rebooking, saved cards and receipts.' },
      },
      'self-check-in': {
        title: { he: 'צ׳ק-אין עצמי', en: 'Self check-in' },
        summary: { he: 'הלקוח מסמן שהגיע מתוך אימייל התזכורת, והצוות רואה את זה ביומן.', en: 'Clients mark themselves arrived from the reminder email, and staff see it in the calendar.' },
      },
      'waiver-agreement': {
        title: { he: 'הצהרה והסכם לקוח', en: 'Waiver and client agreement' },
        summary: { he: 'חתימה דיגיטלית מהטלפון, עם דף חתימה ציבורי ותיעוד שמור.', en: 'Digital signature from a phone, with a public signing page and stored proof.' },
      },
      'legal-pages': {
        title: { he: 'דפים משפטיים', en: 'Legal pages' },
        summary: { he: 'פרטיות, תנאים ומדיניות ביטול, מקושרים מתחתית האתר.', en: 'Privacy, terms and cancellation policy, linked from the footer.' },
      },
      'online-payments': {
        title: { he: 'תשלומים אונליין', en: 'Online payments' },
        summary: { he: 'Stripe: תשלום בכרטיס, אישורים, החזרים, קישורי תשלום ללקוח מזדמן, וקבלות.', en: 'Stripe: card payments, confirmations, refunds, walk-in payment links and receipts.' },
      },
      'stripe-terminal': {
        title: { he: 'מסוף Stripe', en: 'Stripe Terminal' },
        summary: { he: 'תשלום בכרטיס בדלפק דרך מסוף פיזי, כולל הקלדת כרטיס ידנית.', en: 'Card payments at the desk through a physical reader, manual card entry included.' },
      },
      'reader-screen-designer': {
        title: { he: 'עיצוב מסך המסוף', en: 'Reader screen designer' },
        summary: { he: 'מסכי פתיחה ממותגים ועונתיים למסוף.', en: 'Branded and seasonal splash screens for the card reader.' },
      },
      'cards-on-file': {
        title: { he: 'כרטיס שמור', en: 'Cards on file' },
        summary: { he: 'שומרים כרטיס של לקוח וגובים ממנו בלחיצה אחת בדלפק.', en: 'Save a client’s card and charge it with one tap at the desk.' },
      },
      'janeapp-migration': {
        title: { he: 'מעבר מ-JaneApp', en: 'JaneApp migration' },
        summary: { he: 'יבוא כל הלקוחות והיסטוריית התורים, עם טיפול בכפילויות ובלקוחות בדיקה.', en: 'Imports every client and appointment history, handling duplicates and test patients.' },
      },
      'security-hardening': {
        title: { he: 'אבטחה', en: 'Security' },
        summary: { he: 'הגבלת קצב, כותרות אבטחה, יומן פעולות, וכתיבה לנתונים רק מהשרת.', en: 'Rate limits, security headers, an audit trail, and server-only writes.' },
      },
      'privacy-tools': {
        title: { he: 'כלי פרטיות', en: 'Privacy tools' },
        summary: { he: 'ייצוא ומחיקת נתוני לקוח, ויציאה מכל המכשירים.', en: 'Client data export and erasure, and sign-out from all devices.' },
      },
      'developer-monitoring': {
        title: { he: 'ניטור', en: 'Monitoring' },
        summary: { he: 'מצב חיבורים, שגיאות אחרונות והתראות, כדי שנדע על בעיה לפניכם.', en: 'Connection status, recent errors and alerts, so we know about a problem before you do.' },
      },
      'packages-credits': {
        title: { he: 'כרטיסיות וקרדיטים', en: 'Packages and credits' },
        summary: { he: 'כרטיסיות 5 ו-10, מחירים לסטודנטים, וניכוי אוטומטי בהזמנה.', en: '5 and 10 packs, student rates, and automatic redemption at checkout.' },
      },
      memberships: {
        title: { he: 'מנויים', en: 'Memberships' },
        summary: { he: 'מנוי חודשי ללא הגבלה בחיוב חוזר ב-Stripe, עם ביטול מהלקוח או מהצוות.', en: 'Monthly unlimited with recurring Stripe billing, cancellable by the client or staff.' },
      },
      'coupons-promo-codes': {
        title: { he: 'קופונים', en: 'Coupons and promo codes' },
        summary: { he: 'קודי הנחה, מגבלות שימוש והטבת ביקור ראשון.', en: 'Promo codes, usage limits and first-visit offers.' },
      },
      'retail-gift-cards': {
        title: { he: 'מוצרים וכרטיסי מתנה', en: 'Retail and gift cards' },
        summary: { he: 'מכירת מוצרים וכרטיסי מתנה, עם תעודה שנשלחת באימייל.', en: 'Sell products and gift cards, with a certificate sent by email.' },
      },
      'master-calendar': {
        title: { he: 'יומן ראשי', en: 'Master calendar' },
        summary: { he: 'יומן לפי חדרים לדלפק: שינוי מועד, החזרים והזמנת לקוח מזדמן.', en: 'A room-based front-desk calendar: reschedules, refunds and walk-in booking.' },
      },
      'guest-directory': {
        title: { he: 'ספר לקוחות', en: 'Guest directory' },
        summary: { he: 'כרטיס לכל לקוח: היסטוריה, הסכמים, הערות רפואיות ומיזוג כפילויות.', en: 'A profile per guest: history, agreements, medical flags and duplicate merging.' },
      },
      'in-clinic-kiosk': {
        title: { he: 'עמדת קיוסק', en: 'In-clinic kiosk' },
        summary: { he: 'אייפד בכניסה להרשמה וחתימה על הצהרה, נעול בקוד.', en: 'An iPad at the door for sign-up and waivers, PIN-locked.' },
      },
      'staff-timesheets': {
        title: { he: 'שעון נוכחות', en: 'Staff timesheets' },
        summary: { he: 'כניסה ויציאה, עריכת משמרות, ודוח אקסל שבועי באימייל.', en: 'Clock in and out, shift edits, and a weekly Excel email.' },
      },
      'reports-excel': {
        title: { he: 'דוחות', en: 'Reports' },
        summary: { he: 'הכנסות, עסקאות, מכירות וקופונים, עם ייצוא לאקסל.', en: 'Revenue, transactions, sales and coupons, exported to Excel.' },
      },
      'transactional-email': {
        title: { he: 'אימיילים', en: 'Emails' },
        summary: { he: 'אישור, תזכורת, ביטול וקבלה, ממותגים וניתנים לעריכה מהמסך.', en: 'Confirmation, reminder, cancellation and receipt, branded and editable from the console.' },
      },
      'landing-page': {
        title: { he: 'דף נחיתה', en: 'Landing page' },
        summary: { he: 'דף מהיר ומותאם לטלפון סביב התא, עם SEO מקומי לדיקסון סיטי וסקרנטון.', en: 'A fast, phone-friendly page around the chamber, with local SEO for Dickson City and Scranton.' },
        bullets: [
          { he: 'הטיפול דקה אחר דקה, עם וידאו אמיתי', en: 'The session minute by minute, with real video' },
          { he: 'עדויות לקוחות, שאלות נפוצות ובטיחות', en: 'Client testimonials, FAQs and safety' },
        ],
      },
    },
    phases: [
      {
        when: { he: 'חודש 1', en: 'Month 1' },
        title: { he: 'התאמה ותוכן', en: 'Fit and content' },
        body: { he: 'מעבר על המחירון, השעות והטיפולים, תיקוני תוכן בדף הנחיתה, וחיבור Stripe.', en: 'Go through prices, hours and treatments, finalise landing page copy, and connect Stripe.' },
      },
      {
        when: { he: 'חודש 2', en: 'Month 2' },
        title: { he: 'נתונים והרצה מקבילה', en: 'Data and parallel run' },
        body: { he: 'יבוא לקוחות ותורים מ-JaneApp, והרצה לצד JaneApp עם הצוות.', en: 'Import clients and appointments from JaneApp, and run alongside JaneApp with the team.' },
      },
      {
        when: { he: 'חודש 3', en: 'Month 3' },
        title: { he: 'עלייה לאוויר', en: 'Go live' },
        body: { he: 'הדומיין עובר לאתר החדש, ההזמנות עוברות למערכת, ו-JaneApp נסגר.', en: 'The domain moves to the new site, bookings move to the system, and JaneApp is switched off.' },
      },
    ],
    decisions: [
      {
        question: { he: 'מתי JaneApp נסגר, ומה קורה לתורים שכבר נקבעו בו?', en: 'When does JaneApp switch off, and what happens to bookings already made there?' },
        impact: { he: 'מעבר נתונים', en: 'Data migration' },
        due: { he: 'חודש 2', en: 'Month 2' },
      },
      {
        question: { he: 'תשלום בדלפק: מסוף Stripe, או קישור תשלום לטלפון?', en: 'Desk payments: a Stripe card reader, or a payment link to the phone?' },
        impact: { he: 'מודול מסוף', en: 'Terminal module' },
        due: { he: 'חודש 1', en: 'Month 1' },
      },
      {
        question: { he: 'האם למכור כרטיסיות ומנויים אונליין מהיום הראשון?', en: 'Sell packages and memberships online from day one?' },
        impact: { he: 'מודולים אופציונליים', en: 'Optional modules' },
        due: { he: 'חודש 1', en: 'Month 1' },
      },
    ],
    about: {
      title: { he: 'Igani', en: 'Igani' },
      body: {
        he: 'אנחנו מתכננים ובונים מוצרי תוכנה יחד עם הלקוחות שלנו, מהעיצוב ועד ההשקה, ונשארים לתחזוקה.',
        en: 'We design and build software products with our clients, from design to launch, and stay on for maintenance.',
      },
    },
    nextSteps: {
      title: { he: 'מתחילים', en: "Let's start" },
      body: {
        he: 'בחרו את המודולים למעלה, ונקבע שיחה לעבור על המערכת יחד. אחרי החתימה מתחילים בחיבור Stripe והעברת הנתונים.',
        en: "Pick your modules above, and we'll set up a call to walk through the system together. Once signed, we start with Stripe and moving your data over.",
      },
    },
  },
}

export default offer
