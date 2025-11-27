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
        // Check if banner was dismissed
        const dismissedBanner = localStorage.getItem('promoBannerDismissed')
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

  const handleDismiss = () => {
    setIsVisible(false)
    if (settings?.dismissible) {
      localStorage.setItem('promoBannerDismissed', 'true')
    }
  }

  const handleCTAClick = () => {
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

  const getAnimationVariants = () => {
    if (!shouldAnimate) {
      return {
        initial: { opacity: 1 },
        animate: { opacity: 1 },
        exit: { opacity: 0 }
      }
    }

    if (settings.animationType === 'slide') {
      return {
        initial: { y: -100, opacity: 0 },
        animate: { y: 0, opacity: 1 },
        exit: { y: -100, opacity: 0 }
      }
    }

    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      exit: { opacity: 0 }
    }
  }

  const getAnimationDuration = () => {
    if (!shouldAnimate) return 0.3

    switch (settings.animationSpeed) {
      case 'slow':
        return 0.8
      case 'fast':
        return 0.3
      default:
        return 0.5
    }
  }

  const getFontSize = () => {
    switch (settings.fontSize) {
      case 'small':
        return 'text-sm md:text-base'
      case 'large':
        return 'text-lg md:text-xl'
      default:
        return 'text-base md:text-lg'
    }
  }

  const getPadding = () => {
    switch (settings.padding) {
      case 'compact':
        return 'py-2'
      case 'spacious':
        return 'py-6'
      default:
        return 'py-4'
    }
  }

  const getTextAlign = () => {
    return settings.textAlign === 'left' ? 'text-left' : 'text-center'
  }

  const getFontWeight = () => {
    return settings.fontWeight === 'bold' ? 'font-bold' : 'font-medium'
  }

  const isMarquee = shouldAnimate && settings.animationType === 'marquee'

  // Calculate banner height for spacer
  const getBannerHeight = () => {
    if (!isVisible) return 0
    switch (settings.padding) {
      case 'compact':
        return 48 // py-2 * 2 + content ~40-48px
      case 'spacious':
        return 96 // py-6 * 2 + content ~88-96px
      default:
        return 72 // py-4 * 2 + content ~64-72px
    }
  }

  return (
    <>
      {/* Spacer to prevent content from being hidden behind fixed banner */}
      {isVisible && (
        <div style={{ height: `${getBannerHeight()}px` }} className="w-full" />
      )}

      <AnimatePresence>
        {isVisible && (
          <motion.div
            {...getAnimationVariants()}
            transition={{ duration: getAnimationDuration() }}
            style={{
              backgroundColor: settings.backgroundColor,
              color: settings.textColor,
              top: '80px'
            }}
            className={`fixed left-0 right-0 w-full ${getPadding()} overflow-hidden z-40 shadow-lg`}
          >
            <div className="w-full px-4 sm:px-6 lg:px-8">
              <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-between gap-3 sm:gap-4 max-w-7xl mx-auto">
              {/* Banner Content */}
              <div className="flex-1 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                {/* Image - Inline */}
                {settings.image && settings.imagePosition === 'inline' && !isMarquee && (
                  <div className="flex-shrink-0">
                    <img
                      src={settings.image}
                      alt=""
                      className="h-10 w-10 sm:h-12 sm:w-12 object-contain rounded"
                    />
                  </div>
                )}

                {/* Text Content */}
                <div className={`flex-1 w-full ${getTextAlign()}`}>
                  {isMarquee ? (
                    <div className="relative w-full overflow-hidden">
                      <motion.div
                        animate={{ x: [-1000, 0] }}
                        transition={{
                          duration: settings.animationSpeed === 'fast' ? 10 : settings.animationSpeed === 'slow' ? 30 : 20,
                          repeat: Infinity,
                          ease: 'linear'
                        }}
                        className="flex whitespace-nowrap"
                      >
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="mx-8">
                            <h3 className={`${getFontSize()} ${getFontWeight()}`}>
                              {settings.title}
                            </h3>
                            {settings.subtitle && (
                              <p className="text-sm opacity-90 mt-0.5">
                                {settings.subtitle}
                              </p>
                            )}
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <h3 className={`${getFontSize()} ${getFontWeight()} leading-tight`}>
                        {settings.title}
                      </h3>
                      {settings.subtitle && (
                        <p className="text-xs sm:text-sm opacity-90">
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
                      className="h-12 w-12 object-contain rounded"
                    />
                  </div>
                )}

                {/* CTA Button */}
                {settings.ctaLabel && settings.ctaUrl && !isMarquee && (
                  <a
                    href={settings.ctaUrl}
                    onClick={handleCTAClick}
                    className="flex-shrink-0 px-4 sm:px-6 py-2 sm:py-2.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm sm:text-base font-semibold transition-all duration-300 backdrop-blur-sm border border-white/30 whitespace-nowrap shadow-lg hover:shadow-xl"
                    style={{ color: settings.textColor }}
                  >
                    {settings.ctaLabel}
                  </a>
                )}
              </div>

              {/* Dismiss Button */}
              {settings.dismissible && (
                <button
                  onClick={handleDismiss}
                  className="flex-shrink-0 p-2 hover:bg-white/10 rounded-full transition-colors duration-200 absolute top-2 right-2 sm:static"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: settings.textColor }} />
                </button>
              )}
            </div>
          </div>

          {/* Preview Mode Indicator */}
          {isPreviewMode && (
            <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs px-2 py-1 rounded-bl-md font-bold z-10">
              PREVIEW
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
