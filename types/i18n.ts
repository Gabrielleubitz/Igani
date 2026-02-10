export type Language = 'en' | 'he'

export interface I18nText {
  en: string
  he: string
}

export interface NavigationItem {
  id: string
  label: I18nText
  icon?: any
  type: 'section' | 'page'
  href?: string
}

export interface SiteContent {
  // Navigation
  navigation: {
    home: I18nText
    portfolio: I18nText
    packages: I18nText
    about: I18nText
    iganiCapital: I18nText
    contact: I18nText
    freeConsultation: I18nText
    backToHome: I18nText
  }
  
  // Home page content
  home: {
    heroTagline: I18nText
    heroTitle: I18nText
    heroSubtitle: I18nText
    ctaFreeConsultation: I18nText
    ctaViewWork: I18nText
    
    // Services section
    servicesTitle: I18nText
    servicesSubtitle: I18nText
    customWebDevTitle: I18nText
    customWebDevDescription: I18nText
    uiUxDesignTitle: I18nText
    uiUxDesignDescription: I18nText
    
    // Process section
    processTitle: I18nText
    processSubtitle: I18nText
    step1Title: I18nText
    step1Description: I18nText
    step2Title: I18nText
    step2Description: I18nText
    step3Title: I18nText
    step3Description: I18nText
    step4Title: I18nText
    step4Description: I18nText
    step5Title: I18nText
    step5Description: I18nText
    
    // Portfolio section
    portfolioTitle: I18nText
    portfolioSubtitle: I18nText
    featuredProjects: I18nText
    featured: I18nText
    
    // About section
    aboutTitle: I18nText
    aboutDescription: I18nText
    testimonialsTitle: I18nText
    
    // Contact section
    contactTitle: I18nText
    contactSubtitle: I18nText
    contactInfo: I18nText
    firstName: I18nText
    lastName: I18nText
    email: I18nText
    projectType: I18nText
    projectDetails: I18nText
    projectDetailsPlaceholder: I18nText
    submitButton: I18nText
    submitting: I18nText
    successMessage: I18nText
    errorMessage: I18nText
  }
  
  // Contact form options
  projectTypes: {
    landingPage: I18nText
    smallBusiness: I18nText
    premiumBrand: I18nText
    ecommerce: I18nText
    customWebApp: I18nText
  }
  
  // Footer
  footer: {
    allRightsReserved: I18nText
    privacy: I18nText
    terms: I18nText
    contact: I18nText
    help: I18nText
    iganiCapital: I18nText
    iganiCapitalTagline: I18nText
  }

  // About page (Igani Capital & Co-founders)
  aboutPage: {
    iganiCapitalTitle: I18nText
    iganiCapitalIntro: I18nText
    iganiCapitalWhatWeDo1: I18nText
    iganiCapitalWhatWeDo2: I18nText
    iganiCapitalWhatWeDo3: I18nText
    iganiCapitalCta: I18nText
    coFoundersTitle: I18nText
    gabrielName: I18nText
    gabrielRole: I18nText
    gabrielBio: I18nText
    amitayName: I18nText
    amitayRole: I18nText
    amitayBio: I18nText
  }
}