'use client'

import { motion } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { Linkedin, Instagram, Facebook, Twitter, Github } from 'lucide-react'

export default function Footer() {
  const { language } = useLanguage()
  const footer = siteContent.footer
  const { settings } = useSiteSettings()

  const socialLinks = [
    { icon: Linkedin, url: settings.linkedinUrl, label: 'LinkedIn' },
    { icon: Instagram, url: settings.instagramUrl, label: 'Instagram' },
    { icon: Facebook, url: settings.facebookUrl, label: 'Facebook' },
    { icon: Twitter, url: settings.twitterUrl, label: 'Twitter' },
    { icon: Github, url: settings.githubUrl, label: 'GitHub' },
  ].filter(link => link.url) // Only show links that have URLs

  return (
    <footer className="bg-transparent border-t border-slate-700/50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center gap-8"
        >
          <div className="group text-center md:text-left">
            <IganiLogo className="w-44 h-14 mx-auto md:mx-0" />
            <p className="text-slate-500 mt-3 text-sm max-w-xs">
              {settings.footerTagline || 'Building digital experiences that matter'}
            </p>

            {/* Social Media Links */}
            {socialLinks.length > 0 && (
              <div className="flex gap-3 mt-4 justify-center md:justify-start">
                {socialLinks.map((link) => {
                  const Icon = link.icon
                  return (
                    <a
                      key={link.label}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-slate-800/50 hover:bg-cyan-600/20 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all duration-300"
                      aria-label={link.label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          <div className="text-center md:text-right">
            <p className="text-slate-400 mb-2">
              {settings.copyrightText || `© 2024 IGANI. ${footer.allRightsReserved[language]}`}
            </p>
            <div className="flex gap-4 justify-center md:justify-end flex-wrap items-center">
              <a
                href="https://capital.igani.co"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors text-sm inline-flex items-center gap-2"
              >
                <img
                  src="https://capital.igani.co/igani-logo.png"
                  alt="Igani Capital"
                  className="w-5 h-5 object-contain"
                />
                {footer.iganiCapital[language]}
                <span className="text-slate-500 text-xs font-normal hidden sm:inline">— {footer.iganiCapitalTagline[language]}</span>
              </a>
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

            {/* Business Contact Info */}
            {(settings.businessEmail || settings.businessPhone) && (
              <div className="mt-4 text-sm text-slate-500 space-y-1">
                {settings.businessEmail && (
                  <a href={`mailto:${settings.businessEmail}`} className="block hover:text-cyan-400 transition-colors">
                    {settings.businessEmail}
                  </a>
                )}
                {settings.businessPhone && (
                  <a href={`tel:${settings.businessPhone}`} className="block hover:text-cyan-400 transition-colors">
                    {settings.businessPhone}
                  </a>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </footer>
  )
}