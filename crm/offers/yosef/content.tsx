import type { OfferDefinition } from '../types'
import { screens } from './screens'

/**
 * Yosef: a lending CRM for a new US lender (personal, business, mortgage and auto / equipment loans).
 * Module ids match the modules priced in the CRM (Admin → Offers → yosef).
 */
const offer: OfferDefinition = {
  screens,
  content: {
    defaultLang: 'he',
    client: {
      name: { he: 'יוסף · מערכת CRM להלוואות', en: 'Yosef · Lending CRM' },
      accent: '#1f55b5',
    },
    hero: {
      eyebrow: { he: 'הצעת פרויקט · CRM לחברת הלוואות', en: 'Project offer · CRM for a lending company' },
      title: {
        he: 'מערכת אחת שמביאה לווים, מדרגת אותם, מדברת איתם, ועוקבת אחרי כל הלוואה עד שהכסף יוצא',
        en: 'One system that brings in borrowers, scores them, talks to them, and tracks every loan until it funds',
      },
      summary: {
        he: 'CRM שבנוי לחברת הלוואות בארה״ב: ציון אשראי וציון פנימי לכל לווה, חייגן עם ניתוח שיחות, אימייל, SMS ו-WhatsApp אוטומטיים, מקורות לידים, וסוכנים שמוצאים לקוחות חוזרים ומקורות הון זולים. המערכת כבר רצה: כל הצילומים והסרטונים בעמוד הזה הם המערכת עצמה.',
        en: 'A CRM built for a US lender: a credit score and an internal score for every borrower, a dialer with call analysis, automatic email, SMS and WhatsApp, lead sources, and agents that find repeat borrowers and cheap capital. It already runs: every screenshot and video on this page is the system itself.',
      },
    },
    facts: [
      { label: { he: 'מוצרים', en: 'Loan types' }, value: { he: 'אישית, עסקית, משכנתא, רכב וציוד', en: 'Personal, business, mortgage, auto and equipment' } },
      { label: { he: 'שוק', en: 'Market' }, value: { he: 'ארה״ב, באנגלית', en: 'United States, in English' } },
    ],
    need: {
      title: { he: 'מה צריך לקרות', en: 'What needs to happen' },
      body: {
        he: 'חברת הלוואות חדשה צריכה לעבוד מהר על הלידים הטובים, לא לאבד אף אחד באמצע, ולעמוד בכללים של שיחות, הודעות ובדיקות אשראי מהיום הראשון.',
        en: 'A new lender has to work the best leads fast, lose nobody halfway, and follow the rules on calls, texts and credit checks from day one.',
      },
      points: [
        { he: 'לדעת על מי להתקשר קודם, ולמה', en: 'Know who to call first, and why' },
        { he: 'כל לווה בתיק אחד: ההלוואה, האשראי, המסמכים, השיחות וההודעות', en: 'Every borrower in one file: the loan, credit, documents, calls and messages' },
        { he: 'מעקב אוטומטי שלא מפספס, בתוך שעות ההסכמה וההגבלות', en: 'Follow-up that never slips, within consent and sending hours' },
        { he: 'לידים ממקורות שבוחרים, עם עלות לכל הלוואה שיצאה', en: 'Leads from the sources you choose, with the cost of each funded loan' },
        { he: 'הון זול יותר להלוות ממנו', en: 'Cheaper capital to lend from' },
      ],
    },
    solution: {
      title: { he: 'מה אנחנו בונים', en: 'What we build' },
      body: {
        he: 'בסיס ה-CRM של Igani, שכבר עובד בצוותי מכירות, מותאם להלוואות: שלבים של בקשה, מסמכים, חיתום, אישור והעברה. מעליו ציון פנימי שקוף, אוטומציות שמכבדות הסכמה, ושלושה סוכנים.',
        en: "Igani's CRM, already running for sales teams, rebuilt around lending: application, documents, underwriting, approval and funding. On top: a transparent internal score, automations that respect consent, and three agents.",
      },
      points: [
        { he: 'הציון הפנימי מראה כל רכיב והסבר, ולא משתמש בגיל, מוצא או מצב משפחתי', en: 'Our score shows every part and its reason, and never uses age, origin or marital status' },
        { he: 'כל שיחה מוקלטת, מתומללת ומקבלת ציון וטיפ לשיחה הבאה', en: 'Every call is recorded, transcribed, scored, with a tip for the next one' },
        { he: 'SMS ו-WhatsApp רק למי שהסכים, ורק בשעות מותרות. STOP עוצר הכול', en: 'Texts and WhatsApp only to people who agreed, only in allowed hours. STOP stops everything' },
        { he: 'מסמכים נשמרים באופן פרטי, עם רשימה לפי סוג ההלוואה', en: 'Documents stored privately, with a checklist per loan type' },
        { he: 'הקוד והנתונים שלכם', en: 'You own the code and the data' },
      ],
    },
    architecture: {
      title: { he: 'איך הכול מתחבר', en: 'How it fits together' },
      layers: [
        {
          name: { he: 'לידים', en: 'Leads in' },
          items: [
            { label: { he: 'טפסי אתר ושותפים', en: 'Web forms and partners' }, moduleId: 'leadgen' },
            { label: { he: 'רשימות CSV', en: 'CSV lists' }, moduleId: 'leadgen' },
            { label: { he: 'חיפוש עסקים בגוגל מפות', en: 'Google Maps business search' }, moduleId: 'leadgen' },
            { label: { he: 'סוכן ״מוכנים ללוות״', en: '"Ready to borrow" agent' }, moduleId: 'db-agent' },
          ],
        },
        {
          name: { he: 'ליבה', en: 'Core' },
          items: [
            { label: { he: 'תיק לווה וצנרת', en: 'Borrower file and pipeline' }, moduleId: 'crm' },
            { label: { he: 'הציון שלנו', en: 'Our score' }, moduleId: 'score' },
            { label: { he: 'אשראי והסכמה', en: 'Credit and consent' }, moduleId: 'score' },
            { label: { he: 'מסמכים', en: 'Documents' }, moduleId: 'crm' },
          ],
        },
        {
          name: { he: 'קשר', en: 'Contact' },
          items: [
            { label: { he: 'חייגן וניתוח שיחות', en: 'Dialer and call analysis' }, moduleId: 'calling' },
            { label: { he: 'אימייל, SMS ו-WhatsApp', en: 'Email, SMS and WhatsApp' }, moduleId: 'messaging' },
          ],
        },
        {
          name: { he: 'תשתית', en: 'Platform' },
          items: [
            { label: { he: 'Vercel ו-Postgres', en: 'Vercel and Postgres' }, moduleId: 'platform' },
            { label: { he: 'Twilio, Resend, ImageKit', en: 'Twilio, Resend, ImageKit' }, moduleId: 'platform' },
            { label: { he: 'סוכן הון', en: 'Capital agent' }, moduleId: 'capital-agent' },
          ],
        },
      ],
    },
    flows: [
      {
        id: 'borrower',
        device: 'phone',
        title: { he: 'מה הלווה רואה', en: 'What the borrower sees' },
        caption: { he: 'מהבקשה ועד האישור, בטלפון.', en: 'From the request to the approval, on a phone.' },
        steps: [
          { screen: 'apply', title: { he: 'הבקשה', en: 'The request' }, caption: { he: 'כמה שאלות, והסכמה לשיחות ולבדיקת אשראי רכה.', en: 'A few questions, plus consent to calls and a soft credit check.' } },
          { screen: 'welcomeText', title: { he: 'הודעת פתיחה', en: 'Welcome text' }, caption: { he: 'יוצאת לבד שתי דקות אחרי הבקשה, עם שם האחראי.', en: 'Goes out by itself two minutes after the request, signed by the loan officer.' } },
          { screen: 'docsReminder', title: { he: 'תזכורת מסמכים', en: 'Documents reminder' }, caption: { he: 'אחרי שלושה ימים בלי מסמכים, ב-WhatsApp ובשעות מותרות.', en: 'After three days without documents, on WhatsApp, inside sending hours.' } },
          { screen: 'upload', title: { he: 'העלאת מסמכים', en: 'Upload documents' }, caption: { he: 'רשימה לפי סוג ההלוואה. הקבצים נשמרים באופן פרטי.', en: 'A checklist per loan type. Files are stored privately.' } },
          { screen: 'approved', title: { he: 'אישור', en: 'Approved' }, caption: { he: 'אימייל אישור ומעקב אחרי השלבים.', en: 'An approval email and where the loan stands.' } },
        ],
      },
      {
        id: 'team',
        device: 'desktop',
        title: { he: 'היום של קצין ההלוואות', en: "The loan officer's day" },
        caption: { he: 'צילומי מסך אמיתיים מהמערכת, על נתוני הדגמה.', en: 'Real screenshots of the system, on demo data.' },
        steps: [
          { screen: 'today', title: { he: 'היום', en: 'Today' }, caption: { he: 'על מי להתקשר עכשיו לפי הציון, משימות, ומי חייב מסמכים.', en: 'Who to call now by score, tasks due, and who owes documents.' } },
          { screen: 'leads', title: { he: 'לידים', en: 'Leads' }, caption: { he: 'כל לווה עם ציון, סכום, סוג הלוואה ושלב.', en: 'Every borrower with grade, amount, loan type and stage.' } },
          { screen: 'lead', title: { he: 'תיק לווה', en: 'Borrower file' }, caption: { he: 'ההלוואה, החזר משוער, יחס חוב להכנסה, הודעות, ומשימות.', en: 'The loan, estimated payment, debt-to-income, messages and tasks.' } },
          { screen: 'score', title: { he: 'הציון שלנו', en: 'Our score' }, caption: { he: 'כל רכיב עם ההסבר שלו, ומה לשאול בשיחה הבאה.', en: 'Every part with its reason, and what to ask on the next call.' } },
          { screen: 'board', title: { he: 'צנרת', en: 'Pipeline' }, caption: { he: 'בקשה, מסמכים, חיתום, אישור, הועבר. גוררים כרטיס כשההלוואה זזה.', en: 'Application, documents, underwriting, approved, funded. Drag a card as the loan moves.' } },
        ],
      },
      {
        id: 'admin',
        device: 'desktop',
        title: { he: 'מה שיוסף מנהל', en: 'What Yosef runs' },
        caption: { he: 'אוטומציות, מקורות לידים, סוכנים ודוחות.', en: 'Automations, lead sources, agents and reports.' },
        steps: [
          { screen: 'automations', title: { he: 'אוטומציות', en: 'Automations' }, caption: { he: 'מתי לשלוח מה: אימייל, SMS או WhatsApp, עם תבניות.', en: 'When to send what: email, SMS or WhatsApp, from templates.' } },
          { screen: 'sources', title: { he: 'מקורות לידים', en: 'Lead sources' }, caption: { he: 'מפתח API לכל שותף, ייבוא CSV, וחיפושי גוגל מפות קבועים.', en: 'An API key per partner, CSV import, and scheduled Google Maps searches.' } },
          { screen: 'agents', title: { he: 'מוכנים ללוות', en: 'Ready to borrow' }, caption: { he: 'הסוכן מוצא לווים קודמים, דחיות ישנות ובקשות תקועות, עם הסיבה.', en: 'The agent finds past borrowers, old declines and stalled applications, with the reason.' } },
          { screen: 'capital', title: { he: 'הון', en: 'Capital' }, caption: { he: 'מקורות הון זולים לחברה, מול SOFR ופריים של היום.', en: "Cheap capital for the company, against today's SOFR and prime." } },
          { screen: 'reports', title: { he: 'דוחות', en: 'Reports' }, caption: { he: 'משפך, היקף שהועבר, ועלות לכל הלוואה לפי מקור.', en: 'Funnel, funded volume, and cost per funded loan by source.' } },
        ],
      },
      {
        id: 'videos',
        device: 'desktop',
        title: { he: 'המערכת בתנועה', en: 'The system in motion' },
        caption: { he: 'הקלטות מסך קצרות של המערכת הרצה.', en: 'Short screen recordings of the running system.' },
        steps: [
          { screen: 'videoBorrower', title: { he: 'מהיום לתיק, והודעה נשלחת', en: 'From Today to a file, and a text sent' }, caption: { he: 'קצין ההלוואות פותח לווה, רואה את הציון, ושולח הודעה עם השם שלו ושל הלווה.', en: 'The loan officer opens a borrower, sees the score, and sends a text with both names filled in.' } },
          { screen: 'videoPipeline', title: { he: 'צנרת ודוחות', en: 'Pipeline and reports' }, caption: { he: 'כל ההלוואות הפתוחות לפי שלב, ואז הדוחות.', en: 'Every open loan by stage, then the reports.' } },
          { screen: 'videoAgents', title: { he: 'הסוכנים', en: 'The agents' }, caption: { he: 'הרצה של סוכן ״מוכנים ללוות״, ואז סוכן ההון.', en: 'Running the "ready to borrow" agent, then the capital agent.' } },
        ],
      },
    ],
    gallery: [
      { src: '/offers/yosef/overview.webp', caption: { he: 'סקירה: היקף, צנרת וזרם לידים', en: 'Overview: volume, pipeline and lead flow' } },
      { src: '/offers/yosef/lead.webp', caption: { he: 'תיק לווה', en: 'A borrower file' } },
      { src: '/offers/yosef/capital.webp', caption: { he: 'סוכן ההון', en: 'The capital agent' } },
    ],
    modules: {
      platform: {
        title: { he: 'תשתית ואבטחה', en: 'Platform and security' },
        summary: { he: 'אחסון, מסד נתונים, התחברות עם גוגל, הרשאות לפי תפקיד, יומן פעולות, וחיבור Twilio, Resend ו-ImageKit.', en: 'Hosting, database, Google sign-in, role-based access, an audit log, and wiring up Twilio, Resend and ImageKit.' },
      },
      crm: {
        title: { he: 'CRM להלוואות', en: 'Lending CRM' },
        summary: { he: 'תיק לווה, צנרת הלוואות, לוח, משימות, מסמכים פרטיים עם רשימה לפי מוצר, ייבוא וייצוא, ודוחות.', en: 'Borrower file, loan pipeline, board, tasks, private documents with a checklist per product, import and export, and reports.' },
        bullets: [
          { he: 'שלבים: בקשה, מסמכים, חיתום, אישור, הועבר, נדחה', en: 'Stages: application, documents, underwriting, approved, funded, declined' },
          { he: 'החזר חודשי, יחס חוב להכנסה ו-LTV בכל תיק', en: 'Monthly payment, debt-to-income and loan-to-value on every file' },
        ],
      },
      score: {
        title: { he: 'הציון שלנו ואשראי', en: 'Our score and credit' },
        summary: { he: 'ציון 0 עד 100 ודירוג A עד D מאשראי, יכולת החזר, בטוחה, יציבות, מעורבות והתאמה למדיניות. משקלים במסך ההגדרות.', en: 'A 0 to 100 score and A to D grade from credit, capacity, collateral, stability, engagement and fit with your policy. Weights in Settings.' },
        bullets: [
          { he: 'הזנת דוח אשראי עם הסכמה מתועדת', en: 'Credit report entry with recorded consent' },
          { he: 'בלי מאפיינים מוגנים (ECOA)', en: 'No protected characteristics (ECOA)' },
        ],
      },
      calling: {
        title: { he: 'חייגן וניתוח שיחות', en: 'Dialer and call analytics' },
        summary: { he: 'שיחות מהדפדפן, הקלטה, תמלול, ציון לכל שיחה, ורשימות חיוג.', en: 'Browser calling, recording, transcription, a score for every call, and call lists.' },
      },
      messaging: {
        title: { he: 'אימייל, SMS ו-WhatsApp אוטומטיים', en: 'Automatic email, SMS and WhatsApp' },
        summary: { he: 'אוטומציות לפי אירוע ותבניות, עם שעות שליחה, הסכמה ו-STOP.', en: 'Event-based automations and templates, with sending hours, consent and STOP.' },
      },
      leadgen: {
        title: { he: 'מקורות לידים', en: 'Lead sources' },
        summary: { he: 'מפתח API לכל שותף או ספק לידים, ייבוא CSV, חיפושי גוגל מפות קבועים, ועלות לכל הלוואה שיצאה.', en: 'An API key per partner or lead vendor, CSV import, scheduled Google Maps searches, and cost per funded loan.' },
      },
      'db-agent': {
        title: { he: 'סוכן ״מוכנים ללוות״', en: '"Ready to borrow" agent' },
        summary: { he: 'כל לילה עובר על כל מי שכבר במערכת ומוצא לווים קודמים, מחזור, דחיות ישנות ובקשות תקועות.', en: 'Every night it reads everyone already in the system and finds past borrowers, refinances, old declines and stalled applications.' },
      },
      'capital-agent': {
        title: { he: 'סוכן הון', en: 'Capital agent' },
        summary: { he: 'מחפש מקורות הון זולים לחברה ומשווה אותם ל-SOFR ופריים. לא פונה לאף אחד בעצמו.', en: "Searches for cheap capital for the company and compares it with SOFR and prime. It never contacts anyone itself." },
      },
      tonality: {
        title: { he: 'טונאליות', en: 'Tonality' },
        summary: { he: 'ניתוח של איך הנציג נשמע, לא רק מה אמר: קצב, ביטחון, חום והפסקות, עם ציון לכל שיחה.', en: 'How the rep sounds, not just what they said: pace, confidence, warmth and pauses, scored on every call.' },
      },
      hebrew: {
        title: { he: 'עברית', en: 'Hebrew' },
        summary: { he: 'כל המערכת גם בעברית, מימין לשמאל, וכל נציג בוחר את השפה שלו.', en: 'The whole system in Hebrew too, right to left, with each team member choosing their language.' },
      },
      'script-gen': {
        title: { he: 'מחולל תסריטים', en: 'Script generator' },
        summary: { he: 'תסריט שיחה לכל מוצר הלוואה ולכל לווה, מבוסס על השיחות שהכי הצליחו אצלכם, עם תשובות להתנגדויות.', en: 'A call script for each loan product and each borrower, built from your best calls, with answers to objections.' },
      },
      'team-review': {
        title: { he: 'סקירת צוות חודשית', en: 'Monthly team review' },
        summary: { he: 'בתחילת כל חודש: דוח לכל נציג, מה השתפר, מה לא, השיחות הכי טובות ומה לתרגל.', en: 'At the start of each month, a report per rep: what improved, what didn\'t, their best calls, and what to practise.' },
      },
      'live-coach': {
        title: { he: 'פידבק חי בזמן שיחה', en: 'Live feedback during calls' },
        summary: { he: 'בזמן שהשיחה רצה, המערכת מקשיבה ומציגה לנציג מה לשאול, איך לענות להתנגדות, ומה עוד חסר בתיק.', en: "While the call runs, the system listens and shows the rep what to ask, how to answer an objection, and what's still missing from the file." },
      },
      practice: {
        title: { he: 'שיחות תרגול עם לקוח AI', en: 'Practice calls with an AI client' },
        summary: { he: 'נציג מתקשר ללווה מדומה, קולי, עם אופי והתנגדויות אמיתיים, ומקבל ציון ופידבק בסוף. מצוין לנציגים חדשים.', en: 'A rep calls a simulated borrower by voice, with a real personality and objections, and gets a score and feedback at the end. Great for new reps.' },
      },
      'own-platform': {
        title: { he: 'על הפלטפורמה שלכם', en: 'On your own platform' },
        summary: { he: 'המערכת רצה על החשבונות והשרתים שלכם, עם הקוד והנתונים בבעלותכם המלאה.', en: 'The system runs on your own accounts and servers, with the code and data fully yours.' },
      },
      'pocket-ai': {
        title: { he: 'Pocket AI לאנשי מכירות', en: 'Pocket AI for salespeople' },
        summary: { he: 'עוזר בוואטסאפ לכל נציג: ״מי הבא בתור?״, ״מה חסר בתיק של מרקוס?״, ״קבע לי שיחה חוזרת למחר״, בהודעה או בהקלטה קולית.', en: 'A WhatsApp assistant for each rep: "who\'s next?", "what\'s missing from Marcus\'s file?", "set a call back for tomorrow", by text or voice note.' },
      },
      landing: {
        title: { he: 'דף נחיתה', en: 'Landing page' },
        summary: { he: 'דף נחיתה לחברה עם טופס בקשה שנכנס ישר ל-CRM, כולל הסכמות, מעקב מקור ומוכן לקמפיינים.', en: 'A landing page for the company with an apply form that goes straight into the CRM, with consent, source tracking, and ready for ad campaigns.' },
      },
      usage: {
        title: { he: 'שימוש דרכנו', en: 'Usage billed through us' },
        summary: { he: 'אנחנו פותחים ומנהלים את החשבונות (Twilio, OpenAI, Resend, ImageKit), ואתם משלמים לנו את השימוש בעלות, בחשבונית אחת בחודש. בלי האפשרות הזו, החשבונות על שמכם ואתם משלמים לספקים ישירות.', en: "We open and run the accounts (Twilio, OpenAI, Resend, ImageKit) and you pay us the usage at cost, on one invoice a month. Without it, the accounts are in your name and you pay the providers directly." },
        bullets: [
          { he: 'השימוש עצמו בעלות, בלי תוספת', en: 'Usage itself at cost, no markup' },
          { he: 'אפשר לעבור לחשבונות שלכם בכל רגע', en: 'Switch to your own accounts any time' },
        ],
      },
      care: {
        title: { he: 'ליווי שוטף: אחסון ותחזוקה', en: 'Care: hosting and maintenance' },
        summary: { he: 'אופציונלי, בתשלום חודשי: אחסון, גיבויים, ניטור, עדכוני אבטחה ותיקונים, וזמינות לשאלות.', en: 'Optional, billed monthly: hosting, backups, monitoring, security updates and fixes, and someone to ask.' },
        bullets: [
          { he: 'שלושה חודשי תיקונים בחינם כלולים בכל מקרה', en: 'Three months of free fixes are included either way' },
          { he: 'אפשר להפסיק בכל חודש', en: 'Cancel any month' },
        ],
      },
    },
    phases: [
      { when: { he: 'חודש 1', en: 'Month 1' }, title: { he: 'תשתית, CRM וציון', en: 'Platform, CRM and score' }, body: { he: 'חיבור החשבונות, ייבוא לידים, הגדרת מדיניות ההלוואות והציון, והדרכת הצוות.', en: 'Connect the accounts, import leads, set the lending policy and score, and train the team.' } },
      { when: { he: 'חודש 2', en: 'Month 2' }, title: { he: 'שיחות והודעות', en: 'Calling and messaging' }, body: { he: 'מספרי Twilio, חייגן, ניתוח שיחות, ואישור WhatsApp ותבניות.', en: 'Twilio numbers, dialer, call analysis, and WhatsApp approval and templates.' } },
      { when: { he: 'חודש 3', en: 'Month 3' }, title: { he: 'מקורות וסוכנים', en: 'Sources and agents' }, body: { he: 'חיבור שותפים וספקי לידים, הפעלת הסוכנים, וכוונון לפי הנתונים הראשונים.', en: 'Connect partners and lead vendors, switch on the agents, and tune from the first data.' } },
    ],
    decisions: [
      { question: { he: 'מה שם החברה והדומיין?', en: "What's the company name and domain?" }, impact: { he: 'מיתוג, אימייל ומספרים', en: 'Branding, email and phone numbers' }, due: { he: 'חודש 1', en: 'Month 1' } },
      { question: { he: 'באילו מדינות יש רישיון?', en: 'Which states are you licensed in?' }, impact: { he: 'הציון והטפסים', en: 'Score and forms' }, due: { he: 'חודש 1', en: 'Month 1' } },
      { question: { he: 'איזו לשכת אשראי או משווק?', en: 'Which credit bureau or reseller?' }, impact: { he: 'בדיקות אשראי', en: 'Credit checks' }, due: { he: 'חודש 2', en: 'Month 2' } },
      { question: { he: 'שימוש דרכנו או על החשבונות שלכם?', en: 'Usage through us, or on your own accounts?' }, impact: { he: 'חיוב חודשי של Twilio, OpenAI ו-Resend', en: 'Monthly Twilio, OpenAI and Resend bills' }, due: { he: 'חודש 1', en: 'Month 1' } },
      { question: { he: 'מאילו ספקי לידים מתחילים?', en: 'Which lead vendors to start with?' }, impact: { he: 'מקורות לידים', en: 'Lead sources' }, due: { he: 'חודש 3', en: 'Month 3' } },
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
