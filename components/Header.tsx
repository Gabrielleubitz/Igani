'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import { HamburgerMenu } from '@/components/HamburgerMenu'
import LanguageToggle from '@/components/LanguageToggle'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import {
  Home,
  Folder,
  Info,
  MessageSquare,
  Package,
  ArrowLeft,
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

  const nav = siteContent.navigation
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
        <nav className="flex items-center justify-between gap-3 rounded-full border border-white/10 bg-slate-900/80 px-4 py-2.5 shadow-[0_4px_32px_-4px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl lg:grid lg:px-6 lg:[grid-template-columns:auto_1fr_auto]">

          {/* LEFT — logo (+ optional back button) */}
          <div className="flex shrink-0 items-center gap-2">
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

          {/* CENTRE — nav links (desktop only) */}
          <div className="hidden min-w-0 lg:flex lg:justify-center lg:gap-1">
            {navigationItems.map(item =>
              item.type === 'external' ? (
                <a
                  key={item.id}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                >
                  <img
                    src="https://capital.igani.co/igani-logo.png"
                    alt="Igani Capital"
                    className="h-4 w-4 object-contain"
                  />
                  {item.label}
                  <span className="absolute bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-300 group-hover:w-3/4" />
                </a>
              ) : item.type === 'page' ? (
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
          <div className="flex shrink-0 items-center gap-2 lg:justify-self-end">
            <div className="hidden lg:flex lg:items-center lg:gap-2">
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
                  item.type === 'external' ? (
                    <a
                      key={item.id}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 transition-colors hover:bg-white/5 hover:text-white"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <img src="https://capital.igani.co/igani-logo.png" alt="Igani Capital" className="h-5 w-5 object-contain" />
                      {item.label}
                    </a>
                  ) : item.type === 'page' ? (
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
