'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
import { Language } from '@/lib/i18n'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // The site is English-only. Clear any Hebrew choice saved before the toggle was removed.
  useEffect(() => {
    localStorage.removeItem('language')
    document.documentElement.dir = 'ltr'
    document.documentElement.lang = 'en'
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
