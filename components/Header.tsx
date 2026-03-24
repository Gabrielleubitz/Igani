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
  Home,
  Folder,
  Info,
  MessageSquare,
  Package,
  ArrowLeft,
  Instagram,
} from 'lucide-react'

const DEFAULT_INSTAGRAM_URL = 'https://www.instagram.com/igani.co/'
const DEFAULT_WHATSAPP_FALLBACK = '+972584477757'

function whatsappDigitsFromSettings(settings: {
  whatsappNumber: string
  businessPhone: string
}): string {
  const raw =
    settings.whatsappNumber?.trim() ||
    settings.businessPhone?.trim() ||
    DEFAULT_WHATSAPP_FALLBACK
  return raw.replace(/[^0-9]/g, '')
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

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
  const whatsappHref = `https://wa.me/${whatsappDigitsFromSettings(settings)}?text=${encodeURIComponent(
    nav.whatsappPrefillMessage[currentLanguage]
  )}`
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

        {/* ── Pill nav ── */}
        <nav className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2.5 shadow-[0_4px_32px_-4px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-3 lg:px-6">

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
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 group-hover:w-3/4" />
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="group relative inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  {item.label}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 group-hover:w-3/4" />
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
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 px-5 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/25"
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
              className="mt-2 rounded-2xl border border-white/10 bg-slate-900/95 px-4 py-4 shadow-xl backdrop-blur-xl lg:hidden"
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

                <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                  <a
                    href={instagramHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nav.instagramAria[currentLanguage]}
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-pink-400"
                  >
                    <Instagram className="h-5 w-5" />
                    Instagram
                  </a>
                  <a
                    href={whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={nav.whatsappAria[currentLanguage]}
                    onClick={() => setIsMenuOpen(false)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-emerald-400"
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
                  className="mt-2 flex items-center gap-3 w-full rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all hover:from-cyan-500 hover:to-blue-500"
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
