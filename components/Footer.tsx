'use client'

import { motion } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'

interface FooterProps {
  siteName?: string
  tagline?: string
}

export default function Footer({
  siteName = "IGANI",
  tagline = "Premium web development with a personal touch"
}: FooterProps) {
  const { language } = useLanguage()
  const footer = siteContent.footer

  return (
    <footer className="bg-transparent border-t border-slate-700/50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center gap-6"
        >
          <div className="group">
            <IganiLogo className="w-44 h-14" />
            <p className="text-slate-500 mt-3 text-sm max-w-xs">
              {tagline}
            </p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-400 mb-2">© 2025 {siteName}. {footer.allRightsReserved[language]}</p>
            <div className="flex gap-4 justify-center md:justify-end">
              <a href="/privacy" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.privacy[language]}
              </a>
              <a href="/terms" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.terms[language]}
              </a>
              <a href="/#contact" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.contact[language]}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}