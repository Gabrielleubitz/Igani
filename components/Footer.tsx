'use client'

import type { ComponentType } from 'react'
import { motion } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import {
  DEFAULT_INSTAGRAM_URL,
  getWhatsAppChatHref,
  tiktokHrefFromSettings,
} from '@/lib/siteSocial'
import { TikTokGlyph, WhatsAppGlyph } from '@/components/SocialGlyphs'
import { Linkedin, Instagram, Facebook, Twitter, Github, MapPin } from 'lucide-react'

export default function Footer() {
  const { language } = useLanguage()
  const footer = siteContent.footer
  const nav = siteContent.navigation
  const { settings } = useSiteSettings()

  const instagramHref = settings.instagramUrl?.trim() || DEFAULT_INSTAGRAM_URL
  const tiktokHref = tiktokHrefFromSettings(settings.tiktokUrl)
  const whatsappHref = getWhatsAppChatHref(settings, nav.whatsappPrefillMessage[language])

  type IconComp = ComponentType<{ className?: string }>
  const socialItems: { href: string; label: string; Icon: IconComp }[] = []

  if (settings.linkedinUrl?.trim()) {
    socialItems.push({ href: settings.linkedinUrl.trim(), label: 'LinkedIn', Icon: Linkedin })
  }
  socialItems.push({ href: instagramHref, label: 'Instagram', Icon: Instagram })
  socialItems.push({ href: tiktokHref, label: 'TikTok', Icon: TikTokGlyph })
  if (settings.facebookUrl?.trim()) {
    socialItems.push({ href: settings.facebookUrl.trim(), label: 'Facebook', Icon: Facebook })
  }
  if (settings.twitterUrl?.trim()) {
    socialItems.push({ href: settings.twitterUrl.trim(), label: 'Twitter', Icon: Twitter })
  }
  if (settings.githubUrl?.trim()) {
    socialItems.push({ href: settings.githubUrl.trim(), label: 'GitHub', Icon: Github })
  }
  socialItems.push({ href: whatsappHref, label: 'WhatsApp', Icon: WhatsAppGlyph })

  const hasContact =
    !!(settings.businessEmail?.trim() || settings.businessPhone?.trim() || settings.businessAddress?.trim())

  return (
    <footer className="bg-transparent border-t border-slate-700/50 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-8"
        >
          <div className="group text-center md:text-left w-full md:w-auto">
            <IganiLogo className="w-44 h-14 mx-auto md:mx-0" />
            <p className="text-slate-500 mt-3 text-sm max-w-xs mx-auto md:mx-0">
              {settings.footerTagline || 'Building digital experiences that matter'}
            </p>

            <div className="flex flex-wrap gap-3 mt-5 justify-center md:justify-start">
              {socialItems.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-slate-800/50 hover:bg-cyan-600/20 border border-slate-700/50 hover:border-cyan-500/50 flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all duration-300"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className="text-center md:text-right w-full md:max-w-md md:ml-auto">
            <p className="text-slate-400 mb-2">
              {settings.copyrightText || `© 2026 IGANI. ${footer.allRightsReserved[language]}`}
            </p>
            <div className="flex gap-4 justify-center md:justify-end flex-wrap items-center">
              <a href="/privacy" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.privacy[language]}
              </a>
              <a href="/terms" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.terms[language]}
              </a>
              <a href="/contact" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">
                {footer.contact[language]}
              </a>
            </div>

            {hasContact && (
              <div className="mt-5 text-sm text-slate-500 space-y-2 md:text-right">
                {settings.businessEmail?.trim() && (
                  <a
                    href={`mailto:${settings.businessEmail.trim()}`}
                    className="block hover:text-cyan-400 transition-colors"
                  >
                    {settings.businessEmail.trim()}
                  </a>
                )}
                {settings.businessPhone?.trim() && (
                  <a
                    href={`tel:${settings.businessPhone.replace(/\s/g, '')}`}
                    className="block hover:text-cyan-400 transition-colors"
                  >
                    {settings.businessPhone.trim()}
                  </a>
                )}
                {settings.businessAddress?.trim() && (
                  <p className="flex items-start justify-center md:justify-end gap-2 text-slate-500">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-slate-600" aria-hidden />
                    <span>{settings.businessAddress.trim()}</span>
                  </p>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
