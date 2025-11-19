import { Language, SiteContent } from '@/types/i18n'

export const siteContent: SiteContent = {
  navigation: {
    home: { en: 'Home', he: 'בית' },
    portfolio: { en: 'Portfolio', he: 'תיק עבודות' },
    packages: { en: 'Packages', he: 'חבילות' },
    about: { en: 'About', he: 'אודות' },
    contact: { en: 'Contact', he: 'צור קשר' },
    freeConsultation: { en: 'Free Consultation', he: 'יעוץ חינמי' },
    backToHome: { en: 'Back to Home', he: 'חזור לעמוד הבית' }
  },
  
  home: {
    heroTagline: { 
      en: 'Professional Web Development Services', 
      he: 'שירותי פיתוח אתרים מקצועיים' 
    },
    heroTitle: { 
      en: 'Elevate Your Brand With a Personal Developer', 
      he: 'הרם את המותג שלך עם מפתח אישי' 
    },
    heroSubtitle: { 
      en: 'Transform your vision into a stunning digital presence with custom website development', 
      he: 'הפוך את החזון שלך לנוכחות דיגיטלית מרהיבה עם פיתוח אתרים מותאמים אישית' 
    },
    ctaFreeConsultation: { en: 'Free Consultation', he: 'יעוץ חינמי' },
    ctaViewWork: { en: 'View Our Work', he: 'ראה את העבודות שלנו' },
    
    servicesTitle: { en: 'What We Deliver', he: 'מה אנחנו מספקים' },
    servicesSubtitle: { 
      en: 'Comprehensive web development services designed to drive your business growth', 
      he: 'שירותי פיתוח אתרים מקיפים שמיועדים להניע את הצמיחה העסקית שלך' 
    },
    customWebDevTitle: { en: 'Custom Web Development', he: 'פיתוח אתרים מותאם אישית' },
    customWebDevDescription: { 
      en: 'Enterprise-grade web applications engineered with React, Next.js, and Node.js to scale with your business demands.', 
      he: 'אפליקציות ווב ברמת ארגונית המתוכננות עם React, Next.js ו-Node.js כדי לגדול עם הדרישות העסקיות שלך.' 
    },
    uiUxDesignTitle: { en: 'Strategic UI/UX Design', he: 'עיצוב UI/UX אסטרטגי' },
    uiUxDesignDescription: { 
      en: 'Data-driven design solutions that convert visitors into customers. Professional wireframes and pixel-perfect interfaces optimized for engagement.', 
      he: 'פתרונות עיצוב מונעי נתונים שהופכים מבקרים ללקוחות. מסגרות עבודה מקצועיות וממשקים מושלמים פיקסל אחר פיקסל המותאמים למעורבות.' 
    },
    
    processTitle: { en: 'Our Proven Process', he: 'התהליך המוכח שלנו' },
    processSubtitle: { 
      en: 'A systematic approach ensuring on-time delivery and exceptional results', 
      he: 'גישה שיטתית המבטיחה אספקה בזמן ותוצאות יוצאות דופן' 
    },
    step1Title: { en: 'Strategic Consultation', he: 'יעוץ אסטרטגי' },
    step1Description: { 
      en: 'In-depth analysis of your business objectives, target audience, and competitive landscape to develop a comprehensive digital strategy.', 
      he: 'ניתוח מעמיק של יעדי העסק שלך, קהל היעד והנוף התחרותי כדי לפתח אסטרטגיה דיגיטלית מקיפה.' 
    },
    step2Title: { en: 'Design & Architecture', he: 'עיצוב וארכיטקטורה' },
    step2Description: { 
      en: 'Professional wireframes and high-fidelity prototypes with detailed technical specifications. Complete visual and functional approval before development begins.', 
      he: 'מסגרות עבודה מקצועיות ואבות טיפוס באיכות גבוהה עם מפרטים טכניים מפורטים. אישור חזותי ופונקציונלי מלא לפני תחילת הפיתוח.' 
    },
    step3Title: { en: 'Development & Integration', he: 'פיתוח ואינטגרציה' },
    step3Description: { 
      en: 'Agile development with modern frameworks and best practices. Regular milestone deliveries with full transparency and progress tracking.', 
      he: 'פיתוח זריז עם מסגרות עבודה מודרניות ושיטות עבודה מיטביות. אספקות בציוני דרך קבועים עם שקיפות מלאה ומעקב אחר ההתקדמות.' 
    },
    step4Title: { en: 'Quality Assurance', he: 'הבטחת איכות' },
    step4Description: { 
      en: 'Rigorous testing across devices and browsers. Comprehensive review cycles ensuring flawless functionality and optimal performance.', 
      he: 'בדיקות קפדניות על פני מכשירים ודפדפנים שונים. מחזורי סקירה מקיפים המבטיחים פונקציונליות ללא רבב וביצועים אופטימליים.' 
    },
    step5Title: { en: 'Deployment & Ongoing Support', he: 'הפעלה ותמיכה שוטפת' },
    step5Description: { 
      en: 'Seamless launch with zero downtime. Continuous monitoring, maintenance, and dedicated support to ensure sustained success.', 
      he: 'השקה חלקה ללא זמן השבתה. ניטור רציף, תחזוקה ותמיכה ייעודית להבטחת הצלחה מתמשכת.' 
    },
    
    portfolioTitle: { en: 'Client Success Stories', he: 'סיפורי הצלחה של לקוחות' },
    portfolioSubtitle: { 
      en: 'Proven results across industries. Explore the high-performance websites and applications we\'ve delivered.', 
      he: 'תוצאות מוכחות בתעשיות שונות. חקרו את האתרים והאפליקציות בביצועים גבוהים שסיפקנו.' 
    },
    featuredProjects: { en: 'Featured Projects', he: 'פרויקטים מובילים' },
    featured: { en: 'Featured', he: 'מובלט' },
    
    aboutTitle: { en: 'About Igani', he: 'אודות איגני' },
    aboutDescription: { 
      en: 'We are passionate web developers dedicated to crafting exceptional digital experiences that drive business success.', 
      he: 'אנחנו מפתחי ווב נלהבים המוקדשים ליצירת חוויות דיגיטליות יוצאות דופן המניעות הצלחה עסקית.' 
    },
    testimonialsTitle: { en: 'What Our Clients Say', he: 'מה הלקוחות שלנו אומרים' },
    
    contactTitle: { en: 'Let\'s Build Together', he: 'בואו נבנה יחד' },
    contactSubtitle: { 
      en: 'Take the first step toward a powerful web presence. Connect with our team to discuss your requirements.', 
      he: 'קח את הצעד הראשון לקראת נוכחות ווב עוצמתית. התחבר לצוות שלנו כדי לדון בדרישות שלך.' 
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
    submitButton: { en: 'Start Free Consultation', he: 'התחל יעוץ חינמי' },
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
    contact: { en: 'Contact', he: 'צור קשר' }
  }
}

// Language detection utilities
export function getLanguageFromPath(pathname: string): Language {
  return pathname.startsWith('/he') ? 'he' : 'en'
}

export function isRtlLanguage(language: Language): boolean {
  return language === 'he'
}

export function getLocalizedPath(pathname: string, targetLanguage: Language): string {
  const currentLanguage = getLanguageFromPath(pathname)
  
  if (currentLanguage === targetLanguage) return pathname
  
  // Remove current language prefix if exists
  let cleanPath = pathname.startsWith('/he') ? pathname.slice(3) : pathname
  
  // Add new language prefix if needed
  return targetLanguage === 'he' ? `/he${cleanPath || '/'}` : (cleanPath || '/')
}

export function getText(key: keyof SiteContent, language: Language, nestedKey?: string): string {
  const section = siteContent[key]
  if (!section) return ''
  
  if (nestedKey) {
    const nested = (section as any)[nestedKey]
    if (nested && typeof nested === 'object' && nested[language]) {
      return nested[language]
    }
    return ''
  }
  
  if (typeof section === 'object' && section[language]) {
    return (section as any)[language]
  }
  
  return ''
}