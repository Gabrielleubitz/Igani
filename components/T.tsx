'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translateText } from '@/lib/translate'

/**
 * Translation component that can be used anywhere without hook violations
 * Usage: <T>Hello World</T>
 */
export function T({ children, from = 'en' }: { children: string; from?: string }) {
  const { language } = useLanguage()
  const [translated, setTranslated] = useState(children)

  useEffect(() => {
    if (language === from) {
      setTranslated(children)
      return
    }

    translateText(children, from, language).then(setTranslated)
  }, [children, language, from])

  return <>{translated}</>
}
