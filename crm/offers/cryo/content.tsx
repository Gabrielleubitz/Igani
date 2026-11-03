import type { OfferDefinition } from '../types'
import { screens } from './screens'

/** Example offer: Cryotherapy Rejuvenate (website + booking system). Module ids match the modules entered in the CRM. */
const offer: OfferDefinition = {
  screens,
  content: {
    defaultLang: 'en',
    client: {
      name: { he: 'Cryotherapy Rejuvenate', en: 'Cryotherapy Rejuvenate' },
      logo: '/offers/cryo/logo-black.webp',
      accent: '#0e7490',
    },
    hero: {
      eyebrow: { he: 'הצעת פרויקט · אתר ומערכת הזמנות', en: 'Project offer · Website and booking system' },
      title: { he: 'מערכת אחת לקליניקה: מהאתר, דרך ההזמנה, ועד הצ׳ק-אין בדלפק', en: 'One system for the clinic: from the website, to the booking, to check-in at the desk' },
      summary: {
        he: 'אנחנו מחליפים את JaneApp במערכת שבנויה סביב תא ה-cryo:one+ שלכם. לקוחות מזמינים ומשלמים אונליין תוך פחות מדקה, כרטיסיות ומנויים מנוכים אוטומטית, והצוות רואה יום שלם במסך אחד, כולל לקוחות מזדמנים ותשלום במסוף.',
        en: 'We replace JaneApp with a system built around your cryo:one+ chamber. Clients book and pay online in under a minute, packages and memberships are redeemed automatically, and staff see the whole day on one screen, walk-ins and in-store card payments included.',
      },
    },
    facts: [{ label: { he: 'מחליף', en: 'Replaces' }, value: { he: 'JaneApp + WordPress', en: 'JaneApp + WordPress' } }],
    need: {
      title: { he: 'מה צריך לקרות', en: 'What needs to happen' },
      body: {
        he: 'היום האתר והזמנות הטיפולים חיים בשתי מערכות שלא מדברות. הלקוח עובר מאתר וורדפרס ל-JaneApp, המחירים לא תמיד תואמים, והצוות מנהל כרטיסיות ולקוחות מזדמנים ידנית.',
        en: "Today the website and bookings live in two systems that don't talk. Clients hop from WordPress to JaneApp, prices don't always match, and staff track packages and walk-ins by hand.",
      },
      points: [
        { he: 'הזמנה ותשלום במקום אחד, בלי מעבר לאתר אחר', en: 'Book and pay in one place, without jumping to another site' },
        { he: 'שעות פנויות אמיתיות בלבד, בלי כפל הזמנות', en: 'Only real open times, never a double booking' },
        { he: 'כרטיסיות ומנויים שמנוכים לבד', en: 'Packages and memberships that redeem themselves' },
        { he: 'צ׳ק-אין ותשלום בדלפק בלי נייר', en: 'Paper-free check-in and payment at the desk' },
      ],
    },
    solution: {
      title: { he: 'מה אנחנו בונים', en: 'What we build' },
      body: {
        he: 'אתר חדש שמציג את התא כמו שהוא באמת, מחובר ישירות למערכת הזמנות משלכם. כל הזמנה עוברת בשרת: השעה נבדקת שוב, נשמרת ל-10 דקות, ו-Stripe מאשר את התשלום. אותה מערכת מפעילה את מסך הצוות ואת עמדת הצ׳ק-אין.',
        en: 'A new website that shows the chamber as it really is, wired straight into your own booking system. Every booking runs on the server: the slot is re-checked, held for 10 minutes, and Stripe confirms the payment. The same system runs the staff console and the check-in kiosk.',
      },
      points: [
        { he: 'אתר מהיר עם סקשנים אינטראקטיביים סביב התא', en: 'A fast site with interactive sections around the chamber' },
        { he: 'Stripe לתשלום אונליין ובמסוף בחנות', en: 'Stripe for online and in-store payments' },
        { he: 'תזכורות ואישורים באימייל אוטומטית', en: 'Automatic email confirmations and reminders' },
        { he: 'בעלות מלאה על הקוד והנתונים', en: 'You own the code and the data' },
      ],
    },
    architecture: {
      title: { he: 'איך הכול מתחבר', en: 'How it fits together' },
      layers: [
        { name: { he: 'ערוצים', en: 'Channels' }, items: [{ label: { he: 'אתר הקליניקה', en: 'Clinic website' }, moduleId: 'site' }, { label: { he: 'הזמנה אונליין', en: 'Online booking' }, moduleId: 'booking' }, { label: { he: 'עמדת צ׳ק-אין', en: 'Check-in kiosk' }, moduleId: 'kiosk' }] },
        { name: { he: 'ליבה', en: 'Core' }, items: [{ label: { he: 'זמינות ושעות', en: 'Availability and hours' }, moduleId: 'booking' }, { label: { he: 'כרטיסיות ומנויים', en: 'Packages and memberships' }, moduleId: 'packages' }, { label: { he: 'לקוחות', en: 'Clients' } }] },
        { name: { he: 'תפעול', en: 'Operations' }, items: [{ label: { he: 'מסך צוות', en: 'Staff console' }, moduleId: 'staff' }, { label: { he: 'אימיילים ותזכורות', en: 'Emails and reminders' }, moduleId: 'automation' }] },
        { name: { he: 'תשתית', en: 'Platform' }, items: [{ label: { he: 'Stripe' , en: 'Stripe' } }, { label: { he: 'Firebase', en: 'Firebase' } }, { label: { he: 'Vercel', en: 'Vercel' }, moduleId: 'infra' }] },
      ],
    },
    flows: [
      {
        id: 'booking',
        device: 'phone',
        title: { he: 'הזמנה מההתחלה ועד הסוף, בטלפון', en: 'A booking from start to finish, on a phone' },
        caption: { he: 'כך לקוח מזמין טיפול בפחות מדקה.', en: 'How a client books a session in under a minute.' },
        steps: [
          { screen: 'home', title: { he: 'האתר', en: 'The website' }, caption: { he: 'התא במרכז, וכפתור הזמנה אחד.', en: 'The chamber front and centre, one booking button.' } },
          { screen: 'treatments', title: { he: 'בחירת טיפול', en: 'Choose a treatment' }, caption: { he: 'אם יש כרטיסייה, הטיפול מנוכה ממנה אוטומטית.', en: 'If they have a package, the session comes off it automatically.' } },
          { screen: 'pickTime', title: { he: 'בחירת שעה', en: 'Pick a time' }, caption: { he: 'רק שעות פנויות באמת, לפי זמן הטיפול והמרווח בין טיפולים.', en: 'Only truly open times, based on session length and the gap between sessions.' } },
          { screen: 'checkout', title: { he: 'תשלום', en: 'Pay' }, caption: { he: 'Apple Pay או כרטיס, יחד עם הצהרת הבריאות.', en: 'Apple Pay or card, together with the health waiver.' } },
          { screen: 'confirmed', title: { he: 'אישור', en: 'Confirmed' }, caption: { he: 'אישור באימייל, תזכורת יום לפני, ושינוי מועד בלחיצה.', en: 'Email confirmation, a reminder the day before, and one-tap rescheduling.' } },
        ],
      },
      {
        id: 'staff',
        device: 'desktop',
        title: { he: 'היום של הצוות', en: "The team's day" },
        caption: { he: 'מסך אחד לכל ההזמנות, לקוחות מזדמנים, וצ׳ק-אין.', en: 'One screen for bookings, walk-ins and check-in.' },
        steps: [
          { screen: 'staffCalendar', title: { he: 'יומן הצוות', en: 'Staff calendar' }, caption: { he: 'כל ההזמנות, הכרטיסיות וההכנסות של היום.', en: "Every booking, package and today's revenue." } },
          { screen: 'kiosk', title: { he: 'עמדת צ׳ק-אין', en: 'Check-in kiosk' }, caption: { he: 'טאבלט בכניסה: הלקוח עושה צ׳ק-אין לבד.', en: 'A tablet at the door: clients check themselves in.' } },
        ],
      },
    ],
    gallery: [
      { src: '/offers/cryo/cryoone-room-800.webp', caption: { he: 'חדר ה-cryo:one+', en: 'The cryo:one+ room' } },
      { src: '/offers/cryo/cryoair-unit-600.webp', caption: { he: 'cryoair לטיפול ממוקד', en: 'cryoair for localized treatment' } },
      { src: '/offers/cryo/local-900.webp', caption: { he: 'הקליניקה בדיקסון סיטי', en: 'The clinic in Dickson City' } },
    ],
    modules: {
      infra: {
        title: { he: 'תשתית וסביבות', en: 'Platform and environments' },
        summary: { he: 'אחסון, דומיין, גיבויים, ניטור, וסביבת בדיקות נפרדת.', en: 'Hosting, domain, backups, monitoring and a separate test environment.' },
      },
      site: {
        title: { he: 'אתר הקליניקה', en: 'Clinic website' },
        summary: { he: 'אתר חדש במקום וורדפרס, עם סקשנים אינטראקטיביים סביב התא.', en: 'A new site in place of WordPress, with interactive sections around the chamber.' },
        bullets: [
          { he: 'תוכן מתוקן (MECOTEC, טלפון אחד, מחירים)', en: 'Corrected copy (MECOTEC, one phone number, prices)' },
          { he: 'SEO מקומי לסקרנטון ודיקסון סיטי', en: 'Local SEO for Scranton and Dickson City' },
        ],
      },
      booking: {
        title: { he: 'הזמנה ותשלום אונליין', en: 'Online booking and payment' },
        summary: { he: 'זמינות אמיתית, החזקת שעה, Stripe, הצהרת בריאות ושינוי מועד.', en: 'Real availability, slot holds, Stripe, health waiver and rescheduling.' },
        bullets: [
          { he: 'מחליף את JaneApp', en: 'Replaces JaneApp' },
          { he: 'הזמנה כאורח, בלי חובת הרשמה', en: 'Guest checkout, no account required' },
        ],
      },
      packages: {
        title: { he: 'כרטיסיות ומנויים', en: 'Packages and memberships' },
        summary: { he: 'סטודנטים-ספורטאים, מבוגרים, צבא וכוחות הצלה, וחודשי ללא הגבלה.', en: 'Student-athlete, adult, military and first-responder, and monthly unlimited.' },
      },
      staff: {
        title: { he: 'מסך צוות', en: 'Staff console' },
        summary: { he: 'יומן, לקוחות מזדמנים, ימי סגירה, ודוחות הכנסה.', en: 'Calendar, walk-ins, closed days and revenue reports.' },
      },
      automation: {
        title: { he: 'אימיילים ותזכורות', en: 'Emails and reminders' },
        summary: { he: 'אישור, תזכורת 24 שעות לפני, וביטול, עם עריכת טקסט מהמסך.', en: 'Confirmation, 24-hour reminder and cancellation, with copy editable from the console.' },
      },
      kiosk: {
        title: { he: 'עמדת צ׳ק-אין ומסוף', en: 'Check-in kiosk and card reader' },
        summary: { he: 'טאבלט בכניסה ומסוף Stripe Terminal לתשלום בדלפק.', en: 'A door tablet and a Stripe Terminal reader for desk payments.' },
      },
    },
    phases: [
      { when: { he: 'חודש 1', en: 'Month 1' }, title: { he: 'אתר ותשתית', en: 'Website and platform' }, body: { he: 'עיצוב, תוכן מתוקן, והעלאת האתר החדש.', en: 'Design, corrected copy, and launching the new site.' } },
      { when: { he: 'חודש 2', en: 'Month 2' }, title: { he: 'הזמנות ותשלום', en: 'Booking and payments' }, body: { he: 'זמינות, Stripe, הצהרת בריאות, ואימיילים. הרצה מקבילה ל-JaneApp.', en: 'Availability, Stripe, health waiver and emails. Runs alongside JaneApp.' } },
      { when: { he: 'חודש 3', en: 'Month 3' }, title: { he: 'צוות, כרטיסיות ומעבר', en: 'Staff, packages and switch-over' }, body: { he: 'מסך הצוות, כרטיסיות, עמדת צ׳ק-אין, ויבוא לקוחות מ-JaneApp.', en: 'Staff console, packages, kiosk, and importing clients from JaneApp.' } },
    ],
    decisions: [
      { question: { he: 'אילו כרטיסיות עוברות מ-JaneApp ואיך?', en: 'Which JaneApp packages carry over, and how?' }, impact: { he: 'יבוא לקוחות', en: 'Client import' }, due: { he: 'חודש 2', en: 'Month 2' } },
      { question: { he: 'מחיר צבא וכוחות הצלה: 3 או 5 דקות?', en: 'Military and first-responder price: 3 or 5 minutes?' }, impact: { he: 'מחירון', en: 'Price list' }, due: { he: 'חודש 1', en: 'Month 1' } },
      { question: { he: 'איזה מסוף: S700 או WisePOS E?', en: 'Which reader: S700 or WisePOS E?' }, impact: { he: 'עמדת צ׳ק-אין', en: 'Check-in kiosk' }, due: { he: 'חודש 3', en: 'Month 3' } },
    ],
    about: {
      title: { he: 'Igani', en: 'Igani' },
      body: { he: 'אנחנו מתכננים ובונים מוצרי תוכנה יחד עם הלקוחות שלנו, מהעיצוב ועד ההשקה, ונשארים לתחזוקה.', en: 'We design and build software products with our clients, from design to launch, and stay on for maintenance.' },
    },
    nextSteps: {
      title: { he: 'מתחילים', en: "Let's start" },
      body: { he: 'בחרו את המודולים למעלה, חתמו על ההסכם, ונשלח חשבונית למקדמה. העבודה מתחילה בשבוע שאחרי.', en: "Choose your modules above, sign the agreement, and we'll send the down-payment invoice. Work starts the following week." },
    },
  },
}

export default offer
