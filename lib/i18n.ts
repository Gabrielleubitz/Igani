import { Language, SiteContent } from '@/types/i18n'

// Re-export types for convenience
export type { Language, SiteContent } from '@/types/i18n'

export const siteContent: SiteContent = {
  navigation: {
    home: { en: 'Home', he: 'בית' },
    portfolio: { en: 'Portfolio', he: 'תיק עבודות' },
    packages: { en: 'Packages', he: 'חבילות' },
    about: { en: 'About', he: 'אודות' },
    iganiCapital: { en: 'Igani Capital', he: 'איגני קפיטל' },
    contact: { en: 'Contact', he: 'צור קשר' },
    freeConsultation: { en: 'Free Consultation', he: 'יעוץ חינמי' },
    backToHome: { en: 'Back to Home', he: 'חזור לעמוד הבית' }
  },
  
  home: {
    heroTagline: { 
      en: 'Apps, websites & SaaS — for ourselves and for clients', 
      he: 'אפליקציות, אתרים ו-SaaS — לעצמנו וללקוחות' 
    },
    heroTitle: { 
      en: 'Igani builds apps, websites, and SaaS.', 
      he: 'איגני בונה אפליקציות, אתרים ו-SaaS.' 
    },
    heroTitleLine2: { 
      en: 'For ourselves and for clients.', 
      he: 'לעצמנו וללקוחות.' 
    },
    heroSubtitle: { 
      en: 'We operate as owners across multiple fields. From small landing pages to full applications—we\'re approachable and ready to talk.', 
      he: 'אנחנו פועלים כבעלים במגוון תחומים. מעמודי נחיתה קטנים ועד אפליקציות מלאות—אנחנו נגישים ומוכנים לשיחה.' 
    },
    ctaFreeConsultation: { en: 'Book a call', he: 'קבע שיחה' },
    ctaViewWork: { en: 'See our work', he: 'ראה את העבודות שלנו' },

    servicesTitle: { en: 'What we build', he: 'מה אנחנו בונים' },
    servicesSubtitle: { 
      en: 'Websites, apps, and SaaS—for startups, businesses, and our own products.', 
      he: 'אתרים, אפליקציות ו-SaaS—לסטארטאפים, עסקים ולמוצרים שלנו.' 
    },
    customWebDevTitle: { en: 'Websites & apps', he: 'אתרים ואפליקציות' },
    customWebDevDescription: { 
      en: 'From landing pages to full web and mobile applications. Built to last and easy to iterate.', 
      he: 'מעמודי נחיתה ועד אפליקציות ווב ומובייל מלאות. בנוי להחזיק לאורך זמן וקל לשפר.' 
    },
    uiUxDesignTitle: { en: 'Design & build', he: 'עיצוב ובנייה' },
    uiUxDesignDescription: { 
      en: 'Clear structure and interfaces. We design with the build in mind so nothing gets lost in translation.', 
      he: 'מבנה וממשקים ברורים. אנחנו מעצבים עם הבנייה בראש כדי שלא יאבד דבר בתרגום.' 
    },
    
    processTitle: { en: 'How we work', he: 'איך אנחנו עובדים' },
    processSubtitle: { 
      en: 'Discover, design, build, launch—with clear steps and no surprises.', 
      he: 'גילוי, עיצוב, בנייה, השקה—עם צעדים ברורים ובלי הפתעות.' 
    },
    step1Title: { en: 'Discover', he: 'גילוי' },
    step1Description: { 
      en: 'We align on goals, scope, and what success looks like.', 
      he: 'מתאמים יעדים, היקף ומה נחשב להצלחה.' 
    },
    step2Title: { en: 'Design', he: 'עיצוב' },
    step2Description: { 
      en: 'Structure and visuals—approved before we build.', 
      he: 'מבנה ועיצוב—מאושרים לפני הבנייה.' 
    },
    step3Title: { en: 'Build', he: 'בנייה' },
    step3Description: { 
      en: 'Iterative development with clear milestones.', 
      he: 'פיתוח איטרטיבי עם ציוני דרך ברורים.' 
    },
    step4Title: { en: 'Quality & test', he: 'איכות ובדיקות' },
    step4Description: { 
      en: 'Testing across devices so everything works.', 
      he: 'בדיקות על פני מכשירים כדי שהכל יעבוד.' 
    },
    step5Title: { en: 'Launch & support', he: 'השקה ותמיכה' },
    step5Description: { 
      en: 'Go live, then iterate with you as needed.', 
      he: 'עולים לאוויר, ואז משפרים איתך לפי הצורך.' 
    },
    
    portfolioTitle: { en: 'Our work', he: 'העבודות שלנו' },
    portfolioSubtitle: { 
      en: 'Projects we\'ve built for clients and for ourselves.', 
      he: 'פרויקטים שבנינו ללקוחות ולעצמנו.' 
    },
    featuredProjects: { en: 'Featured Projects', he: 'פרויקטים מובילים' },
    featured: { en: 'Featured', he: 'מובלט' },
    
    aboutTitle: { en: 'Why Igani', he: 'למה איגני' },
    aboutDescription: { 
      en: 'We build and run our own products as well as client work. One team, clear ownership, and a straightforward process from idea to launch.', 
      he: 'אנחנו בונים ומפעילים מוצרים משלנו וגם עבודת לקוחות. צוות אחד, בעלות ברורה, ותהליך ישיר מרעיון להשקה.' 
    },
    testimonialsTitle: { en: 'What Our Clients Say', he: 'מה הלקוחות שלנו אומרים' },
    
    contactTitle: { en: 'Get in touch', he: 'צור קשר' },
    contactSubtitle: { 
      en: 'Tell us about your project. We\'ll respond within 24 hours.', 
      he: 'ספר לנו על הפרויקט שלך. נענה תוך 24 שעות.' 
    },
    contactInfo: { en: 'Contact Information', he: 'פרטי יצירת קשר' },
    firstName: { en: 'First Name', he: 'שם פרטי' },
    lastName: { en: 'Last Name', he: 'שם משפחה' },
    email: { en: 'Email', he: 'אימייל' },
    projectType: { en: 'Project Type', he: 'סוג פרויקט' },
    projectDetails: { en: 'Project Details', he: 'פרטי הפרויקט' },
    projectDetailsPlaceholder: { 
      en: 'Describe your business needs and project goals...', 
      he: 'תאר את הצרכים העסקיים ויעדי הפרויקט שלך...' 
    },
    submitButton: { en: 'Send message', he: 'שלח הודעה' },
    submitting: { en: 'Submitting...', he: 'שולח...' },
    successMessage: { 
      en: 'Thank you for reaching out. We will respond to your inquiry within 24 hours.', 
      he: 'תודה שפנית אלינו. אנו נענה לפנייתך תוך 24 שעות.' 
    },
    errorMessage: { 
      en: 'An error occurred. Please try again or contact us directly.', 
      he: 'אירעה שגיאה. אנא נסה שוב או צור איתנו קשר ישירות.' 
    }
  },
  
  projectTypes: {
    landingPage: { en: 'Landing Page', he: 'עמוד נחיתה' },
    smallBusiness: { en: 'Small Business Website', he: 'אתר עסק קטן' },
    premiumBrand: { en: 'Premium Brand Site', he: 'אתר מותג פרמיום' },
    ecommerce: { en: 'E-commerce Website', he: 'אתר מסחר אלקטרוני' },
    customWebApp: { en: 'Custom Web App', he: 'אפליקציית ווב מותאמת אישית' }
  },
  
  footer: {
    allRightsReserved: { en: 'All rights reserved', he: 'כל הזכויות שמורות' },
    privacy: { en: 'Privacy', he: 'פרטיות' },
    terms: { en: 'Terms', he: 'תנאים' },
    contact: { en: 'Contact', he: 'צור קשר' },
    help: { en: 'Help & Support', he: 'עזרה ותמיכה' },
    iganiCapital: { en: 'Igani Capital', he: 'איגני קפיטל' },
    iganiCapitalTagline: { en: 'Investment analysis & portfolio tracking', he: 'ניתוח השקעות ומעקב תיקים' }
  },

  aboutPage: {
    iganiCapitalTitle: { en: 'Igani Capital', he: 'איגני קפיטל' },
    iganiCapitalIntro: {
      en: 'Igani Capital is our investment platform—built to help you track portfolios, analyze stocks and crypto, and make smarter decisions with transparent research and AI-assisted insights.',
      he: 'איגני קפיטל היא פלטפורמת ההשקעות שלנו—נבנתה כדי לעזור לך לעקוב אחר תיקים, לנתח מניות וקריפטו, ולקבל החלטות חכמות יותר עם מחקר שקוף ותובנות מבוססות AI.'
    },
    iganiCapitalWhatWeDo1: {
      en: 'Portfolio tracking — Real-time stocks and crypto in one place with performance analytics.',
      he: 'מעקב תיקים — מניות וקריפטו בזמן אמת במקום אחד עם אנליטיקת ביצועים.'
    },
    iganiCapitalWhatWeDo2: {
      en: 'Research & analysis — Fundamental data, news, target prices, and AI research assistant.',
      he: 'מחקר וניתוח — נתונים פונדמנטליים, חדשות, מחירי יעד ועוזר מחקר AI.'
    },
    iganiCapitalWhatWeDo3: {
      en: 'Leagues & achievements — Compete with friends and level up with gamified investing.',
      he: 'ליגות והישגים — התחרו עם חברים והתקדמו עם השקעות במשחוק.'
    },
    iganiCapitalCta: { en: 'Visit Igani Capital', he: 'היכנס לאיגני קפיטל' },
    coFoundersTitle: { en: 'Co-Founders', he: 'מייסדים משותפים' },
    gabrielName: { en: 'Gabriel Leubitz', he: 'גבריאל לוביץ' },
    gabrielRole: { en: 'Co-Founder', he: 'מייסד משותף' },
    gabrielBio: {
      en: 'Gabriel drives product and engineering at Igani and Igani Capital, with a focus on building products that are both powerful and easy to use.',
      he: 'גבריאל מוביל מוצר והנדסה באיגני ובאיגני קפיטל, עם דגש על בניית מוצרים שהם גם עוצמתיים וגם קלים לשימוש.'
    },
    amitayName: { en: 'Amitay Hanson', he: 'אמיתי הנסון' },
    amitayRole: { en: 'Co-Founder', he: 'מייסד משותף' },
    amitayBio: {
      en: 'Amitay brings strategic vision and execution to Igani, ensuring we deliver solutions that create real value for our clients and users.',
      he: 'אמיתי מביא חזון אסטרטגי ויישום לאיגני, ומבטיח שאנחנו מספקים פתרונות שיוצרים ערך אמיתי ללקוחות ולמשתמשים שלנו.'
    }
  }
}

// Language utilities
export function isRtlLanguage(language: Language): boolean {
  return language === 'he'
}

export function getText(key: keyof SiteContent, language: Language, nestedKey?: string): string {
  try {
    const section = siteContent[key] as any
    if (!section) return ''

    if (nestedKey) {
      const nested = section[nestedKey]
      if (nested && typeof nested === 'object' && nested[language]) {
        return nested[language]
      }
      return ''
    }

    if (typeof section === 'object' && section[language]) {
      return section[language]
    }

    return ''
  } catch (error) {
    return ''
  }
}