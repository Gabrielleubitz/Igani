import type { I18nText } from '@/types/i18n'

/**
 * Copy for the landing page. Titles may wrap words in *asterisks*
 * to set them in the italic display serif.
 */
export const landingContent = {
  hero: {
    eyebrow: { en: 'IGANI · a small product studio in Netanya', he: 'IGANI · סטודיו קטן למוצרים דיגיטליים בנתניה' } as I18nText,
    lead: { en: 'We build', he: 'אנחנו בונים' } as I18nText,
    words: [
      { en: 'websites', he: 'אתרים' },
      { en: 'SaaS', he: 'SaaS' },
      { en: 'automations', he: 'אוטומציות' },
      { en: 'brands', he: 'מותגים' },
      { en: 'our own stuff', he: 'דברים משלנו' },
    ] as I18nText[],
    sub: {
      en: 'Three founders who design, write the code, and run products of our own. Everything moving on this page was made by us, not bought as a template. Go ahead and poke at it.',
      he: 'שלושה מייסדים שמעצבים, כותבים את הקוד ומפעילים מוצרים משלהם. כל מה שזז בעמוד הזה נבנה על ידינו, לא נקנה כתבנית. תרגישו חופשי לשחק.',
    } as I18nText,
    ctaPrimary: { en: 'Start a project', he: 'להתחיל פרויקט' } as I18nText,
    ctaSecondary: { en: 'Show me', he: 'תראו לי' } as I18nText,
    scroll: { en: 'scroll', he: 'גללו' } as I18nText,
    note: { en: 'psst, the background is live. move your mouse.', he: 'פסס, הרקע חי. הזיזו את העכבר.' } as I18nText,
    periodHint: { en: 'click the dot', he: 'לחצו על הנקודה' } as I18nText,
    paletteToast: { en: 'palette', he: 'פלטה' } as I18nText,
    statusLocal: { en: 'Netanya', he: 'נתניה' } as I18nText,
    statusBuilding: { en: 'Latest launch', he: 'ההשקה האחרונה' } as I18nText,
    statusOpen: { en: 'Taking on new projects', he: 'פתוחים לפרויקטים חדשים' } as I18nText,
  },

  proof: {
    projectsLive: { en: 'projects live', he: 'פרויקטים באוויר' } as I18nText,
    founders: { en: 'founders, one room', he: 'מייסדים, חדר אחד' } as I18nText,
    ownProducts: { en: 'product we run ourselves', he: 'מוצר שאנחנו מפעילים' } as I18nText,
    reply: { en: 'to hear back from a human', he: 'עד שתשמעו מבן אדם' } as I18nText,
    replyValue: { en: '< 24h', he: '< 24 שעות' } as I18nText,
    footnote: {
      en: 'counted from the portfolio below, not marketing math.',
      he: 'נספר מתיק העבודות למטה, לא מתמטיקה שיווקית.',
    } as I18nText,
  },

  capabilities: {
    index: '01',
    label: { en: 'What we actually do', he: 'מה אנחנו באמת עושים' } as I18nText,
    aside: { en: 'three live demos. all real code.', he: 'שלוש הדגמות חיות. הכול קוד אמיתי.' } as I18nText,
    title: { en: 'Proof, not *promises*.', he: 'הוכחות, לא *הבטחות*.' } as I18nText,
    sub: {
      en: 'The three things we get paid for, running right here instead of described in a bullet list.',
      he: 'שלושת הדברים שמשלמים לנו עליהם, רצים ממש כאן במקום להיות מתוארים ברשימת נקודות.',
    } as I18nText,

    build: {
      label: { en: 'websites & apps', he: 'אתרים ואפליקציות' } as I18nText,
      title: { en: 'Code that *ships*.', he: 'קוד ש*עולה לאוויר*.' } as I18nText,
      body: {
        en: 'Landing pages to full web apps, typed and deployed on the edge. This editor is writing a real component and rendering it as it goes.',
        he: 'מעמודי נחיתה ועד אפליקציות ווב מלאות, מוקלדות ומועלות ל-Edge. העורך הזה כותב קומפוננטה אמיתית ומרנדר אותה תוך כדי.',
      } as I18nText,
      note: { en: 'yes, it really re-renders.', he: 'כן, זה באמת מתרנדר מחדש.' } as I18nText,
      chips: [
        { en: 'Next.js', he: 'Next.js' },
        { en: 'TypeScript', he: 'TypeScript' },
        { en: 'Vercel Edge', he: 'Vercel Edge' },
      ] as I18nText[],
    },

    design: {
      label: { en: 'design & systems', he: 'עיצוב ומערכות' } as I18nText,
      title: { en: 'Design with *dials* on it.', he: 'עיצוב עם *כפתורים*.' } as I18nText,
      body: {
        en: 'We hand over systems, not screenshots. Pick an accent, drag the radius, flip the theme. The whole product follows, exactly like it does in production.',
        he: 'אנחנו מוסרים מערכות, לא צילומי מסך. בחרו צבע, גררו את הרדיוס, החליפו תמה. כל המוצר עוקב, בדיוק כמו בפרודקשן.',
      } as I18nText,
      note: { en: 'go on, drag it', he: 'קדימה, גררו' } as I18nText,
      controls: {
        accent: { en: 'accent', he: 'צבע' } as I18nText,
        radius: { en: 'radius', he: 'רדיוס' } as I18nText,
        theme: { en: 'theme', he: 'תמה' } as I18nText,
        dark: { en: 'Dark', he: 'כהה' } as I18nText,
        light: { en: 'Light', he: 'בהיר' } as I18nText,
      },
    },

    automation: {
      label: { en: 'SaaS & automation', he: 'SaaS ואוטומציה' } as I18nText,
      title: { en: 'Busywork, *handled*.', he: 'עבודה שחורה, *מטופלת*.' } as I18nText,
      body: {
        en: 'Leads, CRMs, invoices, Slack pings. We wire your tools together so the work moves while you sleep. This graph is running a real flow right now.',
        he: 'לידים, CRM, חשבוניות, פינגים בסלאק. אנחנו מחברים את הכלים שלכם כדי שהעבודה תזרום בזמן שאתם ישנים. הגרף הזה מריץ תהליך אמיתי עכשיו.',
      } as I18nText,
      note: { en: 'the names are made up. the flow isn\u2019t.', he: 'השמות מומצאים. התהליך לא.' } as I18nText,
      liveLabel: { en: 'live events', he: 'אירועים חיים' } as I18nText,
    },
  },

  founders: {
    statement: {
      en: 'We run our own SaaS, so we build yours like it\u2019s *ours*.',
      he: 'אנחנו מפעילים SaaS משלנו, אז אנחנו בונים את שלכם כאילו הוא *שלנו*.',
    } as I18nText,
    signoff: { en: 'the three of us', he: 'שלושתנו' } as I18nText,
    meet: { en: 'Meet the team', he: 'להכיר את הצוות' } as I18nText,
  },

  process: {
    index: '02',
    label: { en: 'How a project goes', he: 'איך פרויקט מתקדם' } as I18nText,
    aside: { en: 'same path every time. that\u2019s the point.', he: 'אותו מסלול כל פעם. זו הפואנטה.' } as I18nText,
    title: { en: 'Five steps. *Zero* surprises.', he: 'חמישה צעדים. *אפס* הפתעות.' } as I18nText,
    sub: {
      en: 'You always know what\u2019s happening, what it costs, and what lands on your desk at the end of each step.',
      he: 'אתם תמיד יודעים מה קורה, כמה זה עולה ומה נוחת אצלכם בסוף כל שלב.',
    } as I18nText,
    deliverable: { en: 'lands on your desk', he: 'נוחת אצלכם' } as I18nText,
    deliverables: [
      { en: 'a one-page scope + success metrics', he: 'עמוד היקף אחד + מדדי הצלחה' },
      { en: 'a clickable prototype', he: 'אבטיפוס לחיץ' },
      { en: 'a staging link, updated weekly', he: 'קישור סטייג\u2019ינג, מתעדכן שבועית' },
      { en: 'a QA report across real devices', he: 'דוח בדיקות על מכשירים אמיתיים' },
      { en: 'launch + 30 days of us on call', he: 'השקה + 30 יום שאנחנו זמינים' },
    ] as I18nText[],
    hint: { en: 'keep scrolling', he: 'תמשיכו לגלול' } as I18nText,
  },

  work: {
    index: '03',
    label: { en: 'Things we\u2019ve shipped', he: 'דברים שהשקנו' } as I18nText,
    title: { en: 'Our *work*.', he: 'ה*עבודות* שלנו.' } as I18nText,
    asideOne: { en: 'project live', he: 'פרויקט באוויר' } as I18nText,
    asideMany: { en: 'projects live', he: 'פרויקטים באוויר' } as I18nText,
    note: { en: 'hover to pause. click one to expand.', he: 'רחפו לעצירה. לחצו כדי להרחיב.' } as I18nText,
  },

  why: {
    index: '04',
    label: { en: 'Why us, honestly', he: 'למה אנחנו, בכנות' } as I18nText,
    aside: { en: 'no agency-within-an-agency.', he: 'בלי סוכנות בתוך סוכנות.' } as I18nText,
  },

  contact: {
    index: '05',
    label: { en: 'Say hi', he: 'תגידו שלום' } as I18nText,
    aside: { en: 'we answer these ourselves.', he: 'אנחנו עונים על אלה בעצמנו.' } as I18nText,
    title: { en: 'Tell us what you\u2019re *making*.', he: 'ספרו לנו מה אתם *בונים*.' } as I18nText,
    sub: {
      en: 'A few lines is plenty. We\u2019ll come back with real questions, not a brochure.',
      he: 'כמה שורות זה מספיק. נחזור אליכם עם שאלות אמיתיות, לא עם ברושור.',
    } as I18nText,
    whatsappLead: { en: 'Prefer WhatsApp? Same here.', he: 'מעדיפים וואטסאפ? גם אנחנו.' } as I18nText,
    whatsappCta: { en: 'Message us', he: 'שלחו הודעה' } as I18nText,
  },
}
