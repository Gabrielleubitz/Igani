import type { OfferDefinition } from '../types'
import { screens } from './screens'

/**
 * Offer "testing": produce boxes for home subscribers and restaurants, with delivery and a back office.
 * Client: Altius (name taken from the uploaded logo). logo.svg has black letters (shown on the offer page); logo-on-dark.svg keeps the white letters for dark screens;
 * logo-on-light.svg is the same mark with dark letters for white backgrounds.
 */
const offer: OfferDefinition = {
  screens,
  content: {
    defaultLang: 'he',
    client: { name: { he: 'Altius', en: 'Altius' }, logo: '/offers/testing/logo-on-light.svg', accent: '#8a6336' },
    hero: {
      eyebrow: { he: 'הצעת פרויקט · הזמנות, מנויים ומשלוחים', en: 'Project offer · Orders, subscriptions and delivery' },
      title: {
        he: 'מערכת אחת לסלים, למסעדות ולמשלוחים, במקום האקסלים',
        en: 'One system for boxes, restaurants and deliveries, instead of the spreadsheets',
      },
      summary: {
        he: '340 המנויים שלכם מנהלים את הסל לבד: מחליפים פריטים, מדלגים או מקפיאים, עד שהסל נסגר לליקוט. מסעדות מזמינות לפי המחירון שלהן ומשלמות בהקפה. אתם רואים כל בוקר מה ללקט, לאן לנסוע, ומה כבר נמסר.',
        en: 'Your 340 subscribers manage their own box: swap items, skip a week or pause, until the box locks for picking. Restaurants order from their own price list and pay on account. Every morning you see what to pick, where to drive, and what has been delivered.',
      },
    },
    facts: [{ label: { he: 'מחליף', en: 'Replaces' }, value: { he: 'אקסלים והודעות ידניות', en: 'Spreadsheets and manual messages' } }],
    need: {
      title: { he: 'איפה זה נתקע היום', en: 'Where it gets stuck today' },
      body: {
        he: 'המנויים, ההזמנות והמשלוחים מנוהלים באקסלים ובהודעות. כל שינוי בסל הוא הודעה שמישהו צריך להעתיק, וכל שבוע מתחיל בבניית רשימות ליקוט ביד.',
        en: 'Subscribers, orders and deliveries live in spreadsheets and chat messages. Every box change is a message someone has to copy over, and every week starts with building picking lists by hand.',
      },
      points: [
        { he: 'שינויים בסל מגיעים בהודעות ולא תמיד נקלטים', en: 'Box changes arrive as messages and sometimes get missed' },
        { he: 'מסעדות מזמינות בטלפון, והיתרות נבדקות ידנית', en: 'Restaurants order by phone, and balances are checked by hand' },
        { he: 'אין דרך להראות ללקוח שהסל נמסר', en: "No way to show a customer that the box was delivered" },
        { he: 'הנתונים לפריוריטי מוקלדים פעמיים', en: 'Data for Priority is typed in twice' },
      ],
    },
    solution: {
      title: { he: 'מה אנחנו בונים', en: 'What we build' },
      body: {
        he: 'חנות שנפתחת מהטלפון כמו אפליקציה, בלי הורדה ובלי סיסמה. מאחוריה בק אופיס שמחזיק את המנויים, המחירונים, אזורי החלוקה והמלאי, ומוציא רשימות ליקוט ומסלולים לנהגים.',
        en: 'A shop that opens from the phone like an app, with no download and no password. Behind it, a back office that holds subscribers, price lists, delivery zones and stock, and produces picking lists and driver routes.',
      },
      points: [
        { he: 'כניסה עם קוד ב-SMS או קישור ב-WhatsApp', en: 'Sign in with an SMS code or a WhatsApp link' },
        { he: 'חיוב חוזר ב-Cardcom וקבלה במייל', en: 'Recurring Cardcom charges and emailed receipts' },
        { he: 'נהגים עובדים מקישור, עם צילום בכל מסירה', en: 'Drivers work from a link, with a photo at every drop-off' },
        { he: 'הזמנות ותשלומים עוברים ישר לפריוריטי', en: 'Orders and payments flow straight into Priority' },
      ],
    },
    architecture: {
      title: { he: 'איך הכול מתחבר', en: 'How it fits together' },
      layers: [
        {
          name: { he: 'מי משתמש', en: 'Who uses it' },
          items: [
            { label: { he: 'מנויים ולקוחות', en: 'Subscribers and shoppers' }, moduleId: 'customer-pwa' },
            { label: { he: 'מסעדות', en: 'Restaurants' }, moduleId: 'b2b-restaurants' },
            { label: { he: 'נהגים', en: 'Drivers' }, moduleId: 'delivery-proof' },
            { label: { he: 'הצוות', en: 'Your team' }, moduleId: 'back-office' },
          ],
        },
        {
          name: { he: 'ליבה', en: 'Core' },
          items: [
            { label: { he: 'סלים ומנויים', en: 'Boxes and subscriptions' }, moduleId: 'subscriptions' },
            { label: { he: 'אזורים וימי משלוח', en: 'Zones and delivery days' }, moduleId: 'delivery-areas' },
            { label: { he: 'כניסה ללא סיסמה', en: 'Passwordless sign-in' }, moduleId: 'passwordless-login' },
          ],
        },
        {
          name: { he: 'חיבורים', en: 'Connections' },
          items: [
            { label: { he: 'Cardcom', en: 'Cardcom' }, moduleId: 'payments-billing' },
            { label: { he: 'WhatsApp', en: 'WhatsApp' }, moduleId: 'whatsapp-notifications' },
            { label: { he: 'פריוריטי', en: 'Priority' }, moduleId: 'priority-integration' },
          ],
        },
        {
          name: { he: 'תשתית', en: 'Platform' },
          items: [
            { label: { he: 'שרתים, גיבויים ואבטחה', en: 'Servers, backups and security' }, moduleId: 'platform-infrastructure' },
            { label: { he: 'יבוא מהאקסלים', en: 'Import from spreadsheets' }, moduleId: 'data-migration' },
          ],
        },
      ],
    },
    flows: [
      {
        id: 'subscriber',
        device: 'phone',
        title: { he: 'שבוע של מנוי', en: "A subscriber's week" },
        caption: { he: 'מהכניסה ועד הסל ליד הדלת.', en: 'From signing in to the box at the door.' },
        steps: [
          { screen: 'login', title: { he: 'כניסה', en: 'Sign in' }, caption: { he: 'קוד ב-WhatsApp, בלי סיסמה לזכור.', en: 'A WhatsApp code, no password to remember.' } },
          { screen: 'myBox', title: { he: 'הסל של השבוע', en: "This week's box" }, caption: { he: 'החלפה, דילוג או הקפאה עד שהסל נסגר.', en: 'Swap, skip or pause until the box locks.' } },
          { screen: 'extras', title: { he: 'תוספות', en: 'Extras' }, caption: { he: 'ביצים, פירות ומזווה, לאותו משלוח.', en: 'Eggs, fruit and pantry items on the same delivery.' } },
          { screen: 'checkout', title: { he: 'תשלום', en: 'Payment' }, caption: { he: 'כרטיס שמור, חיוב חוזר ב-Cardcom.', en: 'Saved card, recurring Cardcom charge.' } },
          { screen: 'tracking', title: { he: 'מסירה', en: 'Delivery' }, caption: { he: 'עדכון ב-WhatsApp ותמונה מהנהג.', en: 'A WhatsApp update and a photo from the driver.' } },
        ],
      },
      {
        id: 'b2b',
        device: 'phone',
        title: { he: 'מסעדה ונהג', en: 'A restaurant and a driver' },
        caption: { he: 'הזמנה חוזרת בלחיצה, ומסלול שהנהג פותח מקישור.', en: 'A one-tap repeat order, and a route the driver opens from a link.' },
        steps: [
          { screen: 'restaurant', title: { he: 'הזמנת מסעדה', en: 'Restaurant order' }, caption: { he: 'מחירון משלה, מינימום הזמנה, ויתרה פתוחה.', en: 'Its own price list, a minimum order, and an open balance.' } },
          { screen: 'driver', title: { he: 'מסלול הנהג', en: "The driver's route" }, caption: { he: 'עצירות לפי הסדר, ניווט, וצילום במסירה.', en: 'Stops in order, navigation, and a photo on delivery.' } },
        ],
      },
      {
        id: 'office',
        device: 'desktop',
        title: { he: 'הבק אופיס', en: 'The back office' },
        caption: { he: 'מה שהצוות רואה בתחילת השבוע.', en: 'What the team sees at the start of the week.' },
        steps: [
          { screen: 'orders', title: { he: 'הזמנות', en: 'Orders' }, caption: { he: 'כל הסלים, הדילוגים וההקפאות ליום משלוח אחד.', en: 'Every box, skip and pause for one delivery day.' } },
          { screen: 'picking', title: { he: 'ליקוט', en: 'Picking' }, caption: { he: 'רשימות לפי מסלול, ומי מלקט מה.', en: 'Lists by route, and who is picking what.' } },
          { screen: 'zones', title: { he: 'אזורי חלוקה', en: 'Delivery zones' }, caption: { he: 'ימים, מחיר משלוח, וסף למשלוח חינם לכל אזור.', en: 'Days, delivery fee and free-delivery threshold per zone.' } },
        ],
      },
    ],
    modules: {
      'platform-infrastructure': {
        title: { he: 'תשתית ותחזוקה', en: 'Platform and maintenance' },
        summary: { he: 'שרתים, אחסון, גיבויים, אבטחה ובסיס הנתונים, כולל תחזוקה חודשית.', en: 'Servers, storage, backups, security and the database, with monthly maintenance.' },
      },
      'passwordless-login': {
        title: { he: 'כניסה ללא סיסמה', en: 'Passwordless sign-in' },
        summary: { he: 'לקוחות ועובדים נכנסים עם קוד חד-פעמי ב-SMS או קישור ב-WhatsApp.', en: 'Customers and staff sign in with a one-time SMS code or a WhatsApp link.' },
      },
      'customer-pwa': {
        title: { he: 'חנות ללקוחות', en: 'Customer shop' },
        summary: { he: 'קטלוג, עגלה והזמנה שנפתחים מהטלפון כמו אפליקציה, עם קישור מהאתר הקיים.', en: 'Catalogue, cart and checkout that open on the phone like an app, linked from your current site.' },
      },
      subscriptions: {
        title: { he: 'סלים ומנויים', en: 'Boxes and subscriptions' },
        summary: { he: 'הקפאה, דילוג והחלפת פריטים עד שעת הנעילה של כל משלוח.', en: 'Pause, skip and swap items up to each delivery’s lock time.' },
      },
      'payments-billing': {
        title: { he: 'תשלומים וחיובים', en: 'Payments and billing' },
        summary: { he: 'סליקה ב-Cardcom, חיוב חוזר למנויים, וקבלה במייל.', en: 'Cardcom card payments, recurring charges for subscribers, and emailed receipts.' },
      },
      'b2b-restaurants': {
        title: { he: 'הזמנות למסעדות', en: 'Restaurant ordering' },
        summary: { he: 'מחירון לכל מסעדה, הזמנה חוזרת, מינימום הזמנה, הקפה ויתרות.', en: 'A price list per restaurant, repeat orders, minimum order, credit terms and balances.' },
      },
      'back-office': {
        title: { he: 'בק אופיס', en: 'Back office' },
        summary: { he: 'הזמנות, מוצרים, מחירים, מלאי, חסרים, רשימות ליקוט, הרשאות ודוחות.', en: 'Orders, products, prices, stock, short items, picking lists, permissions and reports.' },
      },
      'delivery-areas': {
        title: { he: 'אזורי חלוקה', en: 'Delivery zones' },
        summary: { he: 'בדיקת כתובת, ימי משלוח ומחיר לפי אזור, משלוח חינם מעל סף, ורשימת המתנה.', en: 'Address check, days and fee per zone, free delivery over a threshold, and a waiting list.' },
      },
      'delivery-proof': {
        title: { he: 'אישור מסירה', en: 'Proof of delivery' },
        summary: { he: 'קישור לנהג עם העצירות, צילום בכל מסירה, והתמונה נשלחת ללקוח.', en: 'A driver link with the stops, a photo at each drop-off, sent on to the customer.' },
      },
      'whatsapp-notifications': {
        title: { he: 'הודעות WhatsApp', en: 'WhatsApp messages' },
        summary: { he: 'תזכורות לפני הנעילה ועדכוני משלוח, ב-WhatsApp במקום SMS.', en: 'Reminders before lock time and delivery updates, on WhatsApp instead of SMS.' },
      },
      'priority-integration': {
        title: { he: 'חיבור לפריוריטי', en: 'Priority connection' },
        summary: { he: 'הזמנות ותשלומים עוברים ליוסי משירן מערכות לחיבור לפריוריטי ולהנהלת החשבונות.', en: 'Orders and payments are passed to Yossi at Shiran Systems for Priority and bookkeeping.' },
      },
      'data-migration': {
        title: { he: 'הסבת נתונים', en: 'Data import' },
        summary: { he: '340 המנויים מהאקסלים, עם כתובות, העדפות והערות.', en: 'The 340 subscribers from the spreadsheets, with addresses, preferences and notes.' },
      },
      'native-apps': {
        title: { he: 'אפליקציות לחנויות', en: 'Store apps' },
        summary: { he: 'אפליקציות iOS ו-Android, כשלב ב׳ אחרי שהחנות בטלפון עובדת.', en: 'iOS and Android apps, as a second stage once the phone shop is working.' },
      },
      'market-pos': {
        title: { he: 'קופה לדוכן', en: 'Market stall till' },
        summary: { he: 'קופה ומלאי לדוכן העתידי בשוק ברחובות, על אותה מערכת.', en: 'A till and stock for the future stall at the Rehovot market, on the same system.' },
      },
    },
    phases: [
      { when: { he: 'שלב 1', en: 'Stage 1' }, title: { he: 'תשתית, מוצרים ומנויים', en: 'Platform, products and subscribers' }, body: { he: 'הקמת המערכת, יבוא המנויים מהאקסלים, ובק אופיס למוצרים ולמחירים.', en: 'Set up the platform, import subscribers from the spreadsheets, and the back office for products and prices.' } },
      { when: { he: 'שלב 2', en: 'Stage 2' }, title: { he: 'חנות, סלים ותשלום', en: 'Shop, boxes and payment' }, body: { he: 'החנות בטלפון, ניהול הסל, Cardcom וכניסה ללא סיסמה. מנויים ראשונים עוברים.', en: 'The phone shop, box management, Cardcom and passwordless sign-in. The first subscribers move over.' } },
      { when: { he: 'שלב 3', en: 'Stage 3' }, title: { he: 'משלוחים ומסעדות', en: 'Delivery and restaurants' }, body: { he: 'אזורים, מסלולים ואישור מסירה, הזמנות מסעדות, WhatsApp, וחיבור לפריוריטי.', en: 'Zones, routes and proof of delivery, restaurant ordering, WhatsApp, and the Priority connection.' } },
    ],
    decisions: [
      { question: { he: 'מתי נסגר הסל לשינויים: יומיים לפני, או לפי אזור?', en: 'When does a box lock: two days before, or per zone?' }, impact: { he: 'סלים וליקוט', en: 'Boxes and picking' }, due: { he: 'שלב 1', en: 'Stage 1' } },
      { question: { he: 'אילו נתונים יוסי צריך לפריוריטי, ובאיזה פורמט?', en: 'Which data does Yossi need for Priority, and in what format?' }, impact: { he: 'חיבור לפריוריטי', en: 'Priority connection' }, due: { he: 'שלב 2', en: 'Stage 2' } },
      { question: { he: 'מה קורה כשכרטיס של מנוי נדחה: עוצרים את הסל או שולחים ומחייבים אחר כך?', en: 'When a subscriber’s card is declined: hold the box, or deliver and charge later?' }, impact: { he: 'תשלומים', en: 'Payments' }, due: { he: 'שלב 2', en: 'Stage 2' } },
    ],
    about: {
      title: { he: 'Igani', en: 'Igani' },
      body: { he: 'אנחנו מתכננים ובונים מערכות יחד עם הלקוחות שלנו, מהאפיון ועד ההשקה, ונשארים לתחזוקה.', en: 'We design and build systems with our clients, from spec to launch, and stay on for maintenance.' },
    },
    nextSteps: {
      title: { he: 'מתחילים', en: "Let's start" },
      body: { he: 'בחרו מודולים למעלה, חתמו על ההסכם, ונשלח חשבונית למקדמה. בשבוע הראשון נשב על האקסלים ונסגור את ההחלטות הפתוחות.', en: "Choose modules above, sign the agreement, and we'll send the down-payment invoice. In the first week we sit down with the spreadsheets and close the open decisions." },
    },
  },
}

export default offer
