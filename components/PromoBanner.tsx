'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { PromoBannerSettings } from '@/types'
import { getPromoBannerSettings } from '@/lib/firestore'

export function PromoBanner() {
  const [settings, setSettings] = useState<PromoBannerSettings | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  useEffect(() => {
    // Don't show banner on admin pages
    if (window.location.pathname.startsWith('/admin')) {
      setIsLoading(false)
      return
    }

    // Check for preview mode
    const urlParams = new URLSearchParams(window.location.search)
    const preview = urlParams.get('previewBanner') === 'true'
    setIsPreviewMode(preview)

    // Check for reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)

    loadBannerSettings(preview)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const loadBannerSettings = async (isPreview: boolean) => {
    try {
      const bannerSettings = await getPromoBannerSettings()

      if (bannerSettings && bannerSettings.enabled) {
        // Check if banner was dismissed (only for current session)
        const dismissedBanner = sessionStorage.getItem('promoBannerDismissed')
        if (dismissedBanner === 'true' && !isPreview) {
          setIsLoading(false)
          return
        }

        // Check if banner is within date range (unless in preview mode)
        if (!isPreview) {
          const now = new Date()
          const isWithinDateRange = checkDateRange(
            now,
            bannerSettings.startDate,
            bannerSettings.endDate
          )
          if (!isWithinDateRange) {
            setIsLoading(false)
            return
          }
        }

        setSettings(bannerSettings)
        setIsVisible(true)

        // Simple analytics hook: log view
        console.log('[Banner Analytics] View:', {
          timestamp: new Date().toISOString(),
          title: bannerSettings.title
        })
      }
    } catch (error) {
      console.error('Error loading banner settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkDateRange = (now: Date, startDate?: string, endDate?: string): boolean => {
    if (!startDate && !endDate) return true

    const nowTime = now.getTime()

    if (startDate && endDate) {
      const start = new Date(startDate).getTime()
      const end = new Date(endDate).getTime()
      return nowTime >= start && nowTime <= end
    }

    if (startDate) {
      const start = new Date(startDate).getTime()
      return nowTime >= start
    }

    if (endDate) {
      const end = new Date(endDate).getTime()
      return nowTime <= end
    }

    return true
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent banner click when closing
    setIsVisible(false)
    if (settings?.dismissible) {
      // Save dismissal only for current session (not permanent)
      sessionStorage.setItem('promoBannerDismissed', 'true')
    }
  }

  const handleBannerClick = () => {
    if (settings?.ctaUrl) {
      // Simple analytics hook: log banner click
      console.log('[Banner Analytics] Banner Click:', {
        timestamp: new Date().toISOString(),
        title: settings.title,
        ctaUrl: settings.ctaUrl
      })
      window.open(settings.ctaUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleCTAClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent double navigation from banner click
    if (settings) {
      // Simple analytics hook: log CTA click
      console.log('[Banner Analytics] CTA Click:', {
        timestamp: new Date().toISOString(),
        title: settings.title,
        ctaLabel: settings.ctaLabel,
        ctaUrl: settings.ctaUrl
      })
    }
  }

  if (isLoading || !settings || !isVisible) {
    return null
  }

  // Get animation config (respect reduced motion)
  const shouldAnimate = !prefersReducedMotion && settings.animationType !== 'none'

  const getEntranceAnimation = () => {
    if (!shouldAnimate) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    }

    switch (settings.animationType) {
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        }
      case 'slide':
        return {
          initial: { y: -60, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -60, opacity: 0 }
        }
      default:
        return {
          initial: { opacity: 1 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
        }
    }
  }

  const getAnimationDuration = () => {
    if (!shouldAnimate) return 0.3
    return 0.5
  }

  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-sm sm:text-base'
      case 'large':
        return 'text-lg sm:text-xl lg:text-2xl'
      default:
        return 'text-base sm:text-lg lg:text-xl'
    }
  }

  const getFontWeight = () => {
    return `font-${settings.fontWeight === '400' ? 'normal' : settings.fontWeight === '500' ? 'medium' : settings.fontWeight === '600' ? 'semibold' : 'bold'}`
  }

  const getMarqueeSpeed = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768
    const baseSpeed = isMobile ? 1.3 : 1 // Slower on mobile

    switch (settings.animationSpeed) {
      case 'slow':
        return 25 * baseSpeed
      case 'fast':
        return 8 * baseSpeed
      default:
        return 15 * baseSpeed
    }
  }

  const isMarquee = shouldAnimate && settings.animationType === 'marquee'
  const isClickable = Boolean(settings.ctaUrl)

  // Highlight accent word in title
  const renderTitle = (text: string) => {
    if (!settings.accentWord || !settings.accentColor) {
      return text
    }

    const parts = text.split(new RegExp(`(${settings.accentWord})`, 'gi'))
    return parts.map((part, index) => {
      if (part.toLowerCase() === settings.accentWord?.toLowerCase()) {
        return (
          <span
            key={index}
            style={{ color: settings.accentColor }}
            className={settings.textGlow ? 'drop-shadow-[0_0_8px_currentColor]' : ''}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  const backgroundStyle = settings.backgroundGradient
    ? { background: settings.backgroundGradient }
    : { backgroundColor: settings.backgroundColor }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed banner */}
      {isVisible && (
        <div style={{ height: '50px' }} className="w-full" />
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            {...getEntranceAnimation()}
            transition={{ duration: getAnimationDuration(), ease: 'easeOut' }}
            onClick={isClickable ? handleBannerClick : undefined}
            style={{
              ...backgroundStyle,
              color: settings.textColor,
              top: '80px',
              cursor: isClickable ? 'pointer' : 'default'
            }}
            className={`fixed left-0 right-0 w-full h-[50px] overflow-hidden z-40 ${
              settings.glowEffect ? 'shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]' : 'shadow-md'
            } ${isClickable ? 'hover:opacity-95 transition-opacity duration-200' : ''}`}
          >
            <div className="w-full h-full px-4 sm:px-6 lg:px-8 pointer-events-auto">
              <div className="flex items-center justify-center h-full gap-4 max-w-7xl mx-auto">
                {/* Banner Content */}
                <div className="flex-1 flex items-center justify-center gap-4 min-w-0">
                  {/* Image - Inline */}
                  {settings.image && settings.imagePosition === 'inline' && !isMarquee && (
                    <div className="flex-shrink-0">
                      <img
                        src={settings.image}
                        alt=""
                        className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
                      />
                    </div>
                  )}

                  {/* Text Content */}
                  <div className={`flex-1 ${settings.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
                    {isMarquee ? (
                      <div className="relative w-full overflow-hidden">
                        <motion.div
                          animate={{
                            x: settings.marqueeDirection === 'right' ? ['0%', '33.33%'] : ['0%', '-33.33%']
                          }}
                          transition={{
                            duration: getMarqueeSpeed(),
                            repeat: Infinity,
                            ease: 'linear',
                            repeatType: 'loop'
                          }}
                          className="flex whitespace-nowrap"
                        >
                          {[...Array(6)].map((_, i) => (
                            <div key={i} className="inline-flex items-center mx-12 sm:mx-16">
                              <span className={`${getFontSize()} ${getFontWeight()} leading-none`}>
                                {renderTitle(settings.title)}
                              </span>
                            </div>
                          ))}
                        </motion.div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-1">
                        <h3 className={`${getFontSize()} ${getFontWeight()} leading-none`}>
                          {renderTitle(settings.title)}
                        </h3>
                        {settings.subtitle && (
                          <p className="text-xs sm:text-sm opacity-80 leading-tight">
                            {settings.subtitle}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Image - Right */}
                  {settings.image && settings.imagePosition === 'right' && !isMarquee && (
                    <div className="flex-shrink-0 hidden lg:block">
                      <img
                        src={settings.image}
                        alt=""
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                  )}

                  {/* CTA Button - Always show when configured, even with marquee */}
                  {settings.ctaLabel && settings.ctaUrl && (
                    <motion.a
                      href={settings.ctaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleCTAClick}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        backgroundColor: settings.ctaColor || 'rgba(255, 255, 255, 0.15)',
                        color: settings.textColor
                      }}
                      className={`flex-shrink-0 px-4 sm:px-5 py-1.5 sm:py-2 text-sm sm:text-base font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20 whitespace-nowrap hover:border-white/40 hover:shadow-lg pointer-events-auto relative z-50 ${
                        settings.ctaStyle === 'pill' ? 'rounded-full' : 'rounded-lg'
                      }`}
                    >
                      {settings.ctaLabel}
                    </motion.a>
                  )}
                </div>

                {/* Dismiss Button */}
                {settings.dismissible && (
                  <motion.button
                    onClick={handleDismiss}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-full transition-colors duration-200 pointer-events-auto relative z-50"
                    aria-label="Dismiss banner"
                    style={{ touchAction: 'auto' }}
                  >
                    <X className="w-4 h-4" style={{ color: settings.textColor }} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Preview Mode Indicator */}
            {isPreviewMode && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs px-2 py-0.5 rounded-bl-md font-bold z-10 pointer-events-none">
                PREVIEW
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
