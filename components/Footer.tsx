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
    <footer className="relative mx-4 mb-4 overflow-hidden rounded-2xl border border-white/[0.10] bg-[#04101e]/30 backdrop-blur-[36px] backdrop-saturate-[180%] shadow-[0_-4px_40px_-4px_rgba(0,0,20,0.5),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_0_28px_rgba(64,128,224,0.04)] sm:mx-6 lg:mx-8">
      {/* Top-edge shimmer */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-14 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-start gap-10 md:gap-8"
        >
          {/* Left — logo + tagline + socials */}
          <div className="text-center md:text-left w-full md:w-auto">
            <IganiLogo className="w-44 h-14 mx-auto md:mx-0" />
            <p className="text-white/55 mt-3 text-sm max-w-xs mx-auto md:mx-0">
              {settings.footerTagline || 'Building digital experiences that matter'}
            </p>

            <div className="flex flex-wrap gap-2.5 mt-5 justify-center md:justify-start">
              {socialItems.map(({ href, label, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-xl border border-[#4080E0]/20 bg-[#4080E0]/[0.07] flex items-center justify-center text-white/50 transition-all duration-300 hover:border-[#4080E0]/50 hover:bg-[#4080E0]/20 hover:text-[#80A0E0]"
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Right — copyright + links + contact */}
          <div className="text-center md:text-right w-full md:max-w-md md:ml-auto">
            <p className="text-white/55 text-sm mb-2">
              {settings.copyrightText || `© 2026 IGANI. ${footer.allRightsReserved[language]}`}
            </p>
            <div className="flex gap-4 justify-center md:justify-end flex-wrap items-center">
              <a href="/privacy" className="text-white/50 hover:text-[#80A0E0] transition-colors text-sm">
                {footer.privacy[language]}
              </a>
              <a href="/terms" className="text-white/50 hover:text-[#80A0E0] transition-colors text-sm">
                {footer.terms[language]}
              </a>
              <a href="/contact" className="text-white/50 hover:text-[#80A0E0] transition-colors text-sm">
                {footer.contact[language]}
              </a>
            </div>

            {hasContact && (
              <div className="mt-5 text-sm text-white/45 space-y-1.5 md:text-right">
                {settings.businessEmail?.trim() && (
                  <a
                    href={`mailto:${settings.businessEmail.trim()}`}
                    className="block hover:text-[#80A0E0] transition-colors"
                  >
                    {settings.businessEmail.trim()}
                  </a>
                )}
                {settings.businessPhone?.trim() && (
                  <a
                    href={`tel:${settings.businessPhone.replace(/\s/g, '')}`}
                    className="block hover:text-[#80A0E0] transition-colors"
                  >
                    {settings.businessPhone.trim()}
                  </a>
                )}
                {settings.businessAddress?.trim() && (
                  <p className="flex items-start justify-center md:justify-end gap-2">
                    <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-[#4080E0]/50" aria-hidden />
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
