'use client'

import { useEffect, useState } from 'react'
import { scrollToSection as scrollToHomeSection } from '@/app/components/funnel-shared/SectionSheet'
import { motion, AnimatePresence } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { HamburgerMenu } from '@/components/HamburgerMenu'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import {
  INSTAGRAM_URL,
  getWhatsAppChatHref,
  tiktokHrefFromSettings,
} from '@/lib/siteSocial'
import { TikTokGlyph, WhatsAppGlyph } from '@/components/SocialGlyphs'
import { ArrowLeft, ArrowRight, Instagram } from 'lucide-react'

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
  // Home page only: SectionRail broadcasts the current chapter; while scrolling down the
  // centre of the pill shows it in place of the nav links (restored on scroll-up or hover)
  const [chapter, setChapter] = useState<{ index: string; label: string } | null>(null)
  const [scrollingDown, setScrollingDown] = useState(false)
  const [navHover, setNavHover] = useState(false)

  useEffect(() => {
    const onChapter = (e: Event) => setChapter((e as CustomEvent).detail)
    let lastY = window.scrollY
    const onScroll = () => {
      const y = window.scrollY
      if (Math.abs(y - lastY) > 6) setScrollingDown(y > lastY)
      lastY = y
    }
    window.addEventListener('igani:chapter', onChapter)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('igani:chapter', onChapter)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  const showChapter = !!chapter && scrollingDown && !navHover
  const { language: currentLanguage } = useLanguage()
  const { settings } = useSiteSettings()

  const nav = siteContent.navigation
  const instagramHref = INSTAGRAM_URL
  const tiktokHref = tiktokHrefFromSettings(settings.tiktokUrl)
  const whatsappHref = getWhatsAppChatHref(settings, nav.whatsappPrefillMessage[currentLanguage])
  const defaultBackButtonText = backButtonText || nav.backToHome[currentLanguage]

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      scrollToHomeSection(sectionId)
    } else {
      window.location.href = `/#${sectionId}`
    }
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
    { id: 'home',      label: nav.home[currentLanguage], type: 'section' as const },
    { id: 'portfolio', label: nav.portfolio[currentLanguage], type: 'section' as const },
    { id: 'packages',  label: nav.packages[currentLanguage], type: 'page'    as const, href: '/packages' },
    { id: 'about',     label: nav.about[currentLanguage], type: 'page'    as const, href: '/about' },
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
          <div
            className="relative hidden min-w-0 lg:flex lg:justify-center lg:gap-1 lg:justify-self-center"
            onMouseEnter={() => setNavHover(true)}
            onMouseLeave={() => setNavHover(false)}
          >
            {chapter && (
              <span
                aria-live="polite"
                className={`pointer-events-none absolute inset-0 flex items-center justify-center gap-2 whitespace-nowrap text-sm text-white transition-opacity duration-[250ms] ease-out ${
                  showChapter ? 'opacity-100' : 'opacity-0'
                }`}
              >
                <span className="font-display text-lg leading-none text-[#9ec0f5]">{chapter.index}</span>
                <span className="text-white/40">—</span>
                {chapter.label}
              </span>
            )}
            <div className={`flex gap-1 transition-opacity duration-[250ms] ease-out ${showChapter ? 'pointer-events-none opacity-0' : 'opacity-100'}`}>
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
          </div>

          {/* RIGHT — socials (desktop) / hamburger (mobile) */}
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
              className="mt-2 rounded-[28px] border border-white/[0.10] bg-[#030814] px-6 pb-6 pt-2 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] lg:hidden"
            >
              {showBackButton && (
                <button
                  onClick={handleBackClick}
                  className="flex items-center gap-2 pt-4 text-[13px] text-white/60 transition-colors hover:text-white"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {defaultBackButtonText}
                </button>
              )}
              <nav aria-label="Menu" className="flex flex-col">
                {navigationItems.map((item, i) => {
                  const content = (
                    <>
                      <span className="w-6 shrink-0 font-display text-[15px] font-normal italic text-[#4080E0]">0{i + 1}</span>
                      {item.label}
                    </>
                  )
                  return item.type === 'page' ? (
                    <a key={item.id} href={item.href} onClick={() => setIsMenuOpen(false)} className="group flex w-full items-baseline gap-4 border-b border-white/[0.08] py-4 text-left text-[28px] font-semibold leading-none tracking-[-0.02em] text-white transition-colors last:border-b-0 hover:text-[#9ec0f5]">
                      {content}
                    </a>
                  ) : (
                    <button key={item.id} onClick={() => scrollToSection(item.id)} className="group flex w-full items-baseline gap-4 border-b border-white/[0.08] py-4 text-left text-[28px] font-semibold leading-none tracking-[-0.02em] text-white transition-colors last:border-b-0 hover:text-[#9ec0f5]">
                      {content}
                    </button>
                  )
                })}
              </nav>
              <a
                href="/start"
                onClick={() => setIsMenuOpen(false)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-white py-4 text-[15px] font-semibold text-[#04101e] transition-colors hover:bg-[#dbe6ff]"
              >
                Start a project
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </header>
  )
}
