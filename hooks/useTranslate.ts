'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { translateText, translateObject, translateArray } from '@/lib/translate'

/**
 * Hook for translating text in components
 * Automatically translates when language changes
 */
export function useTranslate() {
  const { language } = useLanguage()

  /**
   * Translate a single text string
   */
  const t = async (text: string, from: string = 'en'): Promise<string> => {
    if (language === from) return text
    return translateText(text, from, language)
  }

  /**
   * Translate text synchronously using React state
   * Returns original text immediately, then updates with translation
   */
  const useT = (text: string, from: string = 'en'): string => {
    const [translated, setTranslated] = useState(text)

    useEffect(() => {
      if (language === from) {
        setTranslated(text)
        return
      }

      translateText(text, from, language).then(setTranslated)
    }, [text, language, from])

    return translated
  }

  /**
   * Translate an object's string properties
   */
  const tObject = async <T extends Record<string, any>>(
    obj: T,
    from: string = 'en'
  ): Promise<T> => {
    if (language === from) return obj
    return translateObject(obj, from, language)
  }

  /**
   * Translate object synchronously using React state
   */
  const useTObject = <T extends Record<string, any>>(
    obj: T,
    from: string = 'en'
  ): T => {
    const [translated, setTranslated] = useState(obj)

    useEffect(() => {
      if (language === from) {
        setTranslated(obj)
        return
      }

      translateObject(obj, from, language).then(setTranslated)
    }, [obj, language, from])

    return translated
  }

  /**
   * Translate an array of objects
   */
  const tArray = async <T extends Record<string, any>>(
    items: T[],
    from: string = 'en'
  ): Promise<T[]> => {
    if (language === from) return items
    return translateArray(items, from, language)
  }

  /**
   * Translate array synchronously using React state
   */
  const useTArray = <T extends Record<string, any>>(
    items: T[],
    from: string = 'en'
  ): T[] => {
    const [translated, setTranslated] = useState(items)

    useEffect(() => {
      if (language === from) {
        setTranslated(items)
        return
      }

      translateArray(items, from, language).then(setTranslated)
    }, [items, language, from])

    return translated
  }

  return {
    t,        // Async text translation
    useT,     // Sync text translation (React state)
    tObject,  // Async object translation
    useTObject, // Sync object translation (React state)
    tArray,   // Async array translation
    useTArray, // Sync array translation (React state)
    language  // Current language
  }
}
