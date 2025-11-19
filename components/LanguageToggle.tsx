'use client'

import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { Language } from '@/lib/i18n'
import { useLanguage } from '@/contexts/LanguageContext'

interface LanguageToggleProps {
  className?: string
  variant?: 'desktop' | 'mobile'
}

export default function LanguageToggle({
  className = '',
  variant = 'desktop'
}: LanguageToggleProps) {
  const { language: currentLanguage, setLanguage } = useLanguage()

  const handleLanguageChange = (targetLanguage: Language) => {
    if (targetLanguage === currentLanguage) return
    setLanguage(targetLanguage)
  }

  const languages = [
    { code: 'en' as Language, label: 'EN', name: 'English' },
    { code: 'he' as Language, label: 'עב', name: 'עברית' }
  ]

  if (variant === 'mobile') {
    return (
      <div className={`${className}`}>
        <div className="flex items-center gap-3 px-4 py-3 text-slate-400 text-sm">
          <Languages className="w-5 h-5" />
          <span>Language</span>
        </div>
        <div className="space-y-1">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center justify-between px-6 py-3 text-left transition-all rounded-lg ${
                currentLanguage === lang.code
                  ? 'bg-cyan-600/20 text-cyan-400 border-l-2 border-cyan-500'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <span className="font-medium">{lang.name}</span>
              <span className="text-sm font-bold">{lang.label}</span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center bg-slate-800/60 rounded-lg p-1 border border-slate-700/50">
        {languages.map((lang) => (
          <motion.button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`relative px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300 ${
              currentLanguage === lang.code
                ? 'text-white'
                : 'text-slate-400 hover:text-slate-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {currentLanguage === lang.code && (
              <motion.div
                layoutId="activeLanguage"
                className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-md shadow-lg"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
            <span className="relative z-10">{lang.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  )
}