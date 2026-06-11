'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { HamburgerMenu } from '@/components/HamburgerMenu'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import {
  DEFAULT_INSTAGRAM_URL,
  getWhatsAppChatHref,
  tiktokHrefFromSettings,
} from '@/lib/siteSocial'
import { TikTokGlyph, WhatsAppGlyph } from '@/components/SocialGlyphs'
import {
  Home,
  Folder,
  Info,
  MessageSquare,
  Package,
  ArrowLeft,
  Instagram,
} from 'lucide-react'

interface HeaderProps {
  showBackButton?: boolean
  backButtonText?: string
  backButtonHref?: string
  onBackClick?: () => void
}

export default function Header({
  showBackButton = false,
  backButtonText,
  backButtonHref = '/',
  onBackClick
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { language: currentLanguage } = useLanguage()
  const { settings } = useSiteSettings()

  const nav = siteContent.navigation
  const instagramHref = settings.instagramUrl?.trim() || DEFAULT_INSTAGRAM_URL
  const tiktokHref = tiktokHrefFromSettings(settings.tiktokUrl)
  const whatsappHref = getWhatsAppChatHref(settings, nav.whatsappPrefillMessage[currentLanguage])
  const defaultBackButtonText = backButtonText || nav.backToHome[currentLanguage]

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.location.href = `/#${sectionId}`
    }
    setIsMenuOpen(false)
  }

  const handleContactClick = () => {
    window.location.href = '/contact'
    setIsMenuOpen(false)
  }

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      window.location.href = backButtonHref
    }
  }

  const handleLogoClick = () => {
    window.location.href = '/'
  }

  const navigationItems = [
    { id: 'home',      label: nav.home[currentLanguage],      icon: Home,    type: 'section' as const },
    { id: 'portfolio', label: nav.portfolio[currentLanguage], icon: Folder,  type: 'section' as const },
    { id: 'packages',  label: nav.packages[currentLanguage],  icon: Package, type: 'page'    as const, href: '/packages' },
    { id: 'about',     label: nav.about[currentLanguage],     icon: Info,    type: 'page'    as const, href: '/about' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 pt-3 pb-2 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl flex flex-col gap-0">

        {/* ── Pill nav — liquid glass ── */}
        <nav className="relative flex items-center justify-between gap-3 rounded-full border border-white/[0.10] bg-[#04101e]/30 px-4 py-2.5 backdrop-blur-[36px] backdrop-saturate-[180%] shadow-[0_8px_40px_-4px_rgba(0,0,20,0.65),inset_0_1px_0_rgba(255,255,255,0.13),inset_0_0_28px_rgba(64,128,224,0.05)] lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3 lg:px-6 overflow-hidden">

          {/* Liquid glass top-edge shimmer */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

          {/* LEFT — logo (+ optional back button) */}
          <div className="flex shrink-0 items-center gap-2 lg:min-w-0 lg:justify-self-start">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-white/20 hover:text-white"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{defaultBackButtonText}</span>
              </button>
            )}
            <div className="flex items-center cursor-pointer" onClick={handleLogoClick}>
              <IganiLogo className="h-12 w-44" />
            </div>
          </div>

          {/* CENTRE — nav links (desktop only), centered in the bar via 1fr / auto / 1fr grid */}
          <div className="hidden min-w-0 lg:flex lg:justify-center lg:gap-1 lg:justify-self-center">
            {navigationItems.map(item =>
              item.type === 'page' ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="group relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#80A0E0] to-[#4080E0] transition-all duration-300 group-hover:w-3/4" />
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="group relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#80A0E0] to-[#4080E0] transition-all duration-300 group-hover:w-3/4" />
                </button>
              )
            )}
          </div>

          {/* RIGHT — language toggle + CTA (desktop) / hamburger (mobile) */}
          <div className="flex shrink-0 items-center justify-end gap-2 lg:min-w-0 lg:justify-self-end">
            <div className="hidden lg:flex lg:items-center lg:gap-1.5">
              <a
                href={instagramHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={nav.instagramAria[currentLanguage]}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-pink-400"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href={tiktokHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={nav.tiktokAria[currentLanguage]}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <TikTokGlyph className="h-[22px] w-[22px]" />
              </a>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={nav.whatsappAria[currentLanguage]}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-white/10 hover:text-emerald-400"
              >
                <WhatsAppGlyph className="h-[22px] w-[22px]" />
              </a>
              <LanguageToggle />
              <button
                onClick={handleContactClick}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#4080E0] to-[#2060C0] px-5 py-2 text-sm font-medium text-white shadow-lg shadow-[#4080E0]/20 transition-all duration-300 hover:from-[#5090F0] hover:to-[#3070D0] hover:shadow-[#4080E0]/35"
              >
                <MessageSquare className="h-4 w-4" />
                {nav.freeConsultation[currentLanguage]}
              </button>
            </div>
            <div className="lg:hidden">
              <HamburgerMenu
                isOpen={isMenuOpen}
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              />
            </div>
          </div>
        </nav>

        {/* ── Mobile slide-down menu ── */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="mt-2 rounded-2xl border border-white/[0.10] bg-[#010814]/75 px-4 py-4 shadow-xl backdrop-blur-[36px] backdrop-saturate-[180%] shadow-[0_8px_40px_-4px_rgba(0,0,20,0.65),inset_0_1px_0_rgba(255,255,255,0.10)] lg:hidden"
            >
              <div className="flex flex-col gap-1">
                {showBackButton && (
                  <button
                    onClick={handleBackClick}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    {defaultBackButtonText}
                  </button>
                )}
                {navigationItems.map(item =>
                  item.type === 'page' ? (
                    <a
                      key={item.id}
                      href={item.href}
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </a>
                  ) : (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="flex items-center gap-3 w-full rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                    >
                      <item.icon className="h-5 w-5" />
                      {item.label}
                    </button>
                  )
                )}

                <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nav.instagramAria[currentLanguage]}
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex min-w-[calc(50%-4px)] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-pink-400"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                  <a
                    href={tiktokHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nav.tiktokAria[currentLanguage]}
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex min-w-[calc(50%-4px)] flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    <TikTokGlyph className="h-5 w-5" />
                    TikTok
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nav.whatsappAria[currentLanguage]}
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-emerald-400"
                  >
                    <WhatsAppGlyph className="h-5 w-5" />
                    WhatsApp
                  </a>
                </div>

                <div className="mt-3 border-t border-white/10 pt-3">
                  <LanguageToggle variant="mobile" />
                </div>

                <button
                  onClick={handleContactClick}
                  className="mt-2 flex items-center gap-3 w-full rounded-xl bg-gradient-to-r from-[#4080E0] to-[#2060C0] px-4 py-3 text-sm font-medium text-white shadow-lg shadow-[#4080E0]/20 transition-all hover:from-[#5090F0] hover:to-[#3070D0]"
                >
                  <MessageSquare className="h-5 w-5" />
                  {nav.freeConsultation[currentLanguage]}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </header>
  )
}
