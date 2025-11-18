'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { IganiLogo } from '@/components/IganiLogo'
import {
  Menu,
  X,
  Home,
  Folder,
  Info,
  MessageSquare,
  Package,
  ArrowLeft
} from 'lucide-react'

interface HeaderProps {
  showBackButton?: boolean
  backButtonText?: string
  backButtonHref?: string
  onBackClick?: () => void
}

export default function Header({ 
  showBackButton = false, 
  backButtonText = "Back to Home",
  backButtonHref = "/",
  onBackClick
}: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const scrollToSection = (sectionId: string) => {
    if (window.location.pathname === '/') {
      // If on homepage, scroll to section
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    } else {
      // If on another page, navigate to homepage first
      window.location.href = `/#${sectionId}`
    }
    setIsMenuOpen(false)
  }

  const handleContactClick = () => {
    // Always go to dedicated contact page
    window.location.href = '/contact'
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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/95 border-b border-slate-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Back Button or Logo */}
          <div className="flex items-center gap-4">
            {showBackButton && (
              <button
                onClick={handleBackClick}
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{backButtonText}</span>
              </button>
            )}
            <div className="group cursor-pointer" onClick={handleLogoClick}>
              <IganiLogo className="w-40 h-14" />
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {[
              { id: 'home', label: 'Home', icon: Home, type: 'section' },
              { id: 'portfolio', label: 'Portfolio', icon: Folder, type: 'section' },
              { id: 'packages', label: 'Packages', icon: Package, type: 'page', href: '/packages' },
              { id: 'about', label: 'About', icon: Info, type: 'page', href: '/about' }
            ].map(item => (
              item.type === 'page' ? (
                <a
                  key={item.id}
                  href={item.href}
                  className="relative px-4 py-2 text-sm font-medium transition-all rounded-lg group text-slate-300 hover:text-white hover:bg-slate-800/50"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 w-0 group-hover:w-3/4"></span>
                </a>
              ) : (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="relative px-4 py-2 text-sm font-medium transition-all rounded-lg group text-slate-300 hover:text-white hover:bg-slate-800/50"
                >
                  {item.label}
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-300 w-0 group-hover:w-3/4"></span>
                </button>
              )
            ))}
            
            {/* Special CTA Contact Button */}
            <button
              onClick={handleContactClick}
              className="relative ml-3 px-6 py-2 text-sm font-medium bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-cyan-500/25 transform hover:scale-105"
            >
              <MessageSquare className="w-4 h-4 inline mr-2" />
              Free Consultation
            </button>
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white transition-colors"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation Menu */}
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute left-0 right-0 top-20 bg-slate-900/98 backdrop-blur-xl border-b border-slate-700/50 shadow-xl"
          >
            <div className="px-4 py-6 space-y-2">
              {showBackButton && (
                <button
                  onClick={handleBackClick}
                  className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>{backButtonText}</span>
                </button>
              )}
              {[
                { id: 'home', label: 'Home', icon: Home, type: 'section' },
                { id: 'portfolio', label: 'Portfolio', icon: Folder, type: 'section' },
                { id: 'packages', label: 'Packages', icon: Package, type: 'page', href: '/packages' },
                { id: 'about', label: 'About', icon: Info, type: 'page', href: '/about' }
              ].map(item => (
                item.type === 'page' ? (
                  <a
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-800/50 rounded-lg transition-all group"
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                )
              ))}
              
              {/* Special CTA Contact Button for Mobile */}
              <button
                onClick={handleContactClick}
                className="flex items-center gap-3 w-full px-4 py-3 mt-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all shadow-lg"
              >
                <MessageSquare className="w-5 h-5" />
                <span>Free Consultation</span>
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </header>
  )
}