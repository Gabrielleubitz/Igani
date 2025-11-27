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

  useEffect(() => {
    loadBannerSettings()
  }, [])

  const loadBannerSettings = async () => {
    try {
      const bannerSettings = await getPromoBannerSettings()

      if (bannerSettings && bannerSettings.enabled) {
        // Check if banner was dismissed
        const dismissedBanner = localStorage.getItem('promoBannerDismissed')

        // Check if banner is within date range
        const now = new Date()
        const isWithinDateRange = checkDateRange(
          bannerSettings.startDate,
          bannerSettings.endDate,
          now
        )

        if (isWithinDateRange && dismissedBanner !== 'true') {
          setSettings(bannerSettings)
          setIsVisible(true)
        }
      }
    } catch (error) {
      console.error('Error loading banner settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const checkDateRange = (startDate?: string, endDate?: string, now: Date): boolean => {
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

  if (isLoading || !settings || !isVisible) {
    return null
  }

  const getAnimationVariants = () => {
    switch (settings.animationType) {
      case 'slide':
        return {
          initial: { y: -100, opacity: 0 },
          animate: { y: 0, opacity: 1 },
          exit: { y: -100, opacity: 0 }
        }
      case 'fade':
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 }
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
    switch (settings.animationSpeed) {
      case 'slow':
        return 0.8
      case 'fast':
        return 0.3
      default:
        return 0.5
    }
  }

  const isMarquee = settings.animationType === 'marquee'

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          {...getAnimationVariants()}
          transition={{ duration: getAnimationDuration() }}
          style={{
            backgroundColor: settings.backgroundColor,
            color: settings.textColor
          }}
          className="relative w-full overflow-hidden"
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between py-3 gap-4">
              {/* Banner Content */}
              <div className="flex-1 flex items-center justify-center gap-4 min-w-0">
                {isMarquee ? (
                  <div className="relative w-full overflow-hidden">
                    <motion.div
                      animate={{ x: [0, -1000] }}
                      transition={{
                        duration: settings.animationSpeed === 'fast' ? 10 : settings.animationSpeed === 'slow' ? 30 : 20,
                        repeat: Infinity,
                        ease: 'linear'
                      }}
                      className="flex whitespace-nowrap"
                    >
                      {[...Array(3)].map((_, i) => (
                        <span key={i} className="mx-8 text-sm md:text-base font-medium">
                          {settings.text}
                        </span>
                      ))}
                    </motion.div>
                  </div>
                ) : (
                  <p className="text-sm md:text-base font-medium text-center whitespace-pre-wrap">
                    {settings.text}
                  </p>
                )}

                {/* CTA Button */}
                {settings.ctaLabel && settings.ctaUrl && !isMarquee && (
                  <a
                    href={settings.ctaUrl}
                    className="flex-shrink-0 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20"
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
                  className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-full transition-colors duration-200"
                  aria-label="Dismiss banner"
                >
                  <X className="w-4 h-4" style={{ color: settings.textColor }} />
                </button>
              )}
            </div>
          </div>

          {/* CTA Button for Marquee (below) */}
          {settings.ctaLabel && settings.ctaUrl && isMarquee && (
            <div className="flex justify-center pb-3">
              <a
                href={settings.ctaUrl}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-all duration-300 backdrop-blur-sm border border-white/20"
                style={{ color: settings.textColor }}
              >
                {settings.ctaLabel}
              </a>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
