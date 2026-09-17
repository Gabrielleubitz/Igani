import type { I18nText } from '@/types/i18n'

/** Copy that is specific to the redesigned landing page. */
export const landingContent = {
  hero: {
    eyebrow: { en: 'IGANI — product studio', he: 'IGANI — סטודיו למוצרים דיגיטליים' } as I18nText,
    lead: { en: 'We build', he: 'אנחנו בונים' } as I18nText,
    words: [
      { en: 'websites', he: 'אתרים' },
      { en: 'SaaS products', he: 'מוצרי SaaS' },
      { en: 'automations', he: 'אוטומציות' },
      { en: 'brands', he: 'מותגים' },
      { en: 'what\u2019s next', he: 'את הדבר הבא' },
    ] as I18nText[],
    sub: {
      en: 'Design, code, and launch from one team that also runs its own products. This page is built with the same tools we ship to clients — scroll, hover, and play.',
      he: 'עיצוב, קוד והשקה מצוות אחד שגם מפעיל מוצרים משלו. העמוד הזה בנוי באותם כלים שאנחנו מספקים ללקוחות — גללו, רחפו ושחקו.',
    } as I18nText,
    ctaPrimary: { en: 'Start a project', he: 'להתחיל פרויקט' } as I18nText,
    ctaSecondary: { en: 'See it in action', he: 'לראות בפעולה' } as I18nText,
    scroll: { en: 'Scroll', he: 'גללו' } as I18nText,
    liveBadge: { en: 'Live WebGL — move your cursor', he: 'WebGL חי — הזיזו את הסמן' } as I18nText,
  },

  proof: {
    projectsLive: { en: 'projects live', he: 'פרויקטים באוויר' } as I18nText,
    founders: { en: 'founders, one room', he: 'מייסדים, חדר אחד' } as I18nText,
    ownProducts: { en: 'products we run ourselves', he: 'מוצרים שאנחנו מפעילים' } as I18nText,
    reply: { en: 'reply time', he: 'זמן תגובה' } as I18nText,
    replyValue: { en: '< 24h', he: '< 24 שעות' } as I18nText,
  },

  capabilities: {
    kicker: { en: '01 — Capabilities', he: '01 — יכולות' } as I18nText,
    title: { en: 'Don\u2019t read about it. Watch it work.', he: 'לא לקרוא על זה. לראות את זה עובד.' } as I18nText,
    sub: {
      en: 'Three things we do every week, running live on this page.',
      he: 'שלושה דברים שאנחנו עושים כל שבוע, רצים חיים על העמוד הזה.',
    } as I18nText,

    build: {
      label: { en: 'Websites & apps', he: 'אתרים ואפליקציות' } as I18nText,
      title: { en: 'Code that ships.', he: 'קוד שעולה לאוויר.' } as I18nText,
      body: {
        en: 'From landing pages to full web apps. Typed, tested, and deployed — watch a component get written and rendered in real time.',
        he: 'מעמודי נחיתה ועד אפליקציות ווב מלאות. מוקלד, נבדק ומועלה — צפו בקומפוננטה נכתבת ומתרנדרת בזמן אמת.',
      } as I18nText,
      chips: [
        { en: 'Next.js', he: 'Next.js' },
        { en: 'TypeScript', he: 'TypeScript' },
        { en: 'Edge-deployed', he: 'פריסה ב-Edge' },
      ] as I18nText[],
    },

    design: {
      label: { en: 'Design & systems', he: 'עיצוב ומערכות' } as I18nText,
      title: { en: 'Design you can turn the dials on.', he: 'עיצוב שאפשר לסובב לו את הכפתורים.' } as I18nText,
      body: {
        en: 'We design in systems, not screenshots. Change the accent, radius, and theme — the whole product updates, exactly as it would in production.',
        he: 'אנחנו מעצבים במערכות, לא בצילומי מסך. שנו את הצבע, הרדיוס והתמה — כל המוצר מתעדכן, בדיוק כמו בפרודקשן.',
      } as I18nText,
      controls: {
        accent: { en: 'Accent', he: 'צבע' } as I18nText,
        radius: { en: 'Radius', he: 'רדיוס' } as I18nText,
        theme: { en: 'Theme', he: 'תמה' } as I18nText,
        dark: { en: 'Dark', he: 'כהה' } as I18nText,
        light: { en: 'Light', he: 'בהיר' } as I18nText,
      },
    },

    automation: {
      label: { en: 'SaaS & automation', he: 'SaaS ואוטומציה' } as I18nText,
      title: { en: 'Busywork, automated.', he: 'עבודה שחורה — אוטומטית.' } as I18nText,
      body: {
        en: 'Leads, CRMs, invoices, notifications. We connect your tools so the work moves without you. This graph is running a real flow right now.',
        he: 'לידים, CRM, חשבוניות, התראות. אנחנו מחברים את הכלים שלכם כדי שהעבודה תזרום בלעדיכם. הגרף הזה מריץ תהליך אמיתי עכשיו.',
      } as I18nText,
      liveLabel: { en: 'Live events', he: 'אירועים חיים' } as I18nText,
    },
  },

  process: {
    kicker: { en: '02 — Process', he: '02 — תהליך' } as I18nText,
    title: { en: 'Five steps. Zero surprises.', he: 'חמישה צעדים. אפס הפתעות.' } as I18nText,
    sub: {
      en: 'Every project runs the same path, so you always know what\u2019s next.',
      he: 'כל פרויקט עובר באותו מסלול, כך שתמיד תדעו מה הצעד הבא.',
    } as I18nText,
    deliverable: { en: 'You get', he: 'אתם מקבלים' } as I18nText,
    deliverables: [
      { en: 'Scope & success metrics', he: 'היקף ומדדי הצלחה' },
      { en: 'Clickable prototype', he: 'אבטיפוס לחיץ' },
      { en: 'Weekly staging builds', he: 'גרסאות שבועיות לבדיקה' },
      { en: 'Cross-device QA report', he: 'דוח בדיקות חוצה-מכשירים' },
      { en: 'Launch + 30 days of support', he: 'השקה + 30 ימי תמיכה' },
    ] as I18nText[],
  },

  work: {
    kicker: { en: '03 — Work', he: '03 — עבודות' } as I18nText,
  },

  why: {
    kicker: { en: '04 — Why IGANI', he: '04 — למה IGANI' } as I18nText,
  },

  contact: {
    kicker: { en: '05 — Contact', he: '05 — צור קשר' } as I18nText,
  },
}
