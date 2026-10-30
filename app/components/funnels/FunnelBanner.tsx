'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { getPromoBannerSettings } from '@/lib/firestore'
import { PromoBannerSettings } from '@/types'

/** Admin-controlled promo banner (same structure as the site-wide PromoBanner). */
export function FunnelBanner({ className = '' }: { className?: string }) {
  const [bannerSettings, setBannerSettings] = useState<PromoBannerSettings | null>(null)

  useEffect(() => {
    getPromoBannerSettings()
      .then((settings) => {
        if (settings && settings.enabled) setBannerSettings(settings)
      })
      .catch((error) => console.error('Error fetching banner settings:', error))
  }, [])

  if (!bannerSettings) return null

  return (
    <div
      className={`relative z-20 flex items-center ${className} ${
        bannerSettings.glowEffect ? 'shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]' : 'shadow-md'
      } ${bannerSettings.subtitle && bannerSettings.animationType !== 'marquee' ? 'min-h-[72px]' : 'min-h-[52px]'} py-3 px-4 sm:px-6 lg:px-8`}
      style={{
        background: bannerSettings.backgroundGradient || bannerSettings.backgroundColor,
        color: bannerSettings.textColor
      }}
    >
      <div className="flex items-center w-full max-w-7xl mx-auto gap-3">
        <div className="flex-1 flex items-center gap-3 min-w-0">
          {bannerSettings.image && bannerSettings.imagePosition === 'inline' && bannerSettings.animationType !== 'marquee' && (
            <div className="flex-shrink-0 hidden sm:block">
              <img src={bannerSettings.image} alt="" className="h-6 w-6 sm:h-7 sm:w-7 object-contain opacity-90" />
            </div>
          )}
          <div className={`flex-1 min-w-0 ${bannerSettings.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
            {bannerSettings.animationType === 'marquee' ? (
              <div className="relative w-full overflow-hidden py-0.5">
                <motion.div
                  animate={{ x: bannerSettings.marqueeDirection === 'right' ? ['0%', '33.33%'] : ['0%', '-33.33%'] }}
                  transition={{
                    duration: bannerSettings.animationSpeed === 'slow' ? 25 : bannerSettings.animationSpeed === 'fast' ? 8 : 15,
                    repeat: Infinity,
                    ease: 'linear',
                    repeatType: 'loop'
                  }}
                  className="flex whitespace-nowrap"
                >
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="inline-flex items-center mx-8 sm:mx-12">
                      <span className={`${
                        bannerSettings.fontSize === 'small' ? 'text-sm sm:text-base' :
                        bannerSettings.fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                      } ${bannerSettings.fontWeight === '400' ? 'font-normal' : bannerSettings.fontWeight === '500' ? 'font-medium' : bannerSettings.fontWeight === '600' ? 'font-semibold' : 'font-bold'} leading-tight`}>
                        {bannerSettings.accentWord && bannerSettings.accentColor
                          ? bannerSettings.title.split(new RegExp(`(${bannerSettings.accentWord})`, 'gi')).map((part, idx) =>
                              part.toLowerCase() === bannerSettings.accentWord?.toLowerCase() ? (
                                <span key={idx} style={{ color: bannerSettings.accentColor }} className={bannerSettings.textGlow ? 'drop-shadow-[0_0_8px_currentColor]' : ''}>{part}</span>
                              ) : (
                                part
                              )
                            )
                          : bannerSettings.title}
                      </span>
                    </div>
                  ))}
                </motion.div>
              </div>
            ) : (
              <>
                <p className={`${
                  bannerSettings.fontSize === 'small' ? 'text-sm sm:text-base' :
                  bannerSettings.fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                } ${bannerSettings.fontWeight === '400' ? 'font-normal' : bannerSettings.fontWeight === '500' ? 'font-medium' : bannerSettings.fontWeight === '600' ? 'font-semibold' : 'font-bold'} leading-snug line-clamp-1`}>
                  {bannerSettings.accentWord && bannerSettings.accentColor
                    ? bannerSettings.title.split(new RegExp(`(${bannerSettings.accentWord})`, 'gi')).map((part, idx) =>
                        part.toLowerCase() === bannerSettings.accentWord?.toLowerCase() ? (
                          <span key={idx} style={{ color: bannerSettings.accentColor }} className={bannerSettings.textGlow ? 'drop-shadow-[0_0_8px_currentColor]' : ''}>{part}</span>
                        ) : (
                          part
                        )
                      )
                    : bannerSettings.title}
                </p>
                {bannerSettings.subtitle && (
                  <p className="text-xs sm:text-sm mt-0.5 opacity-90 leading-snug line-clamp-1">{bannerSettings.subtitle}</p>
                )}
              </>
            )}
          </div>
          {bannerSettings.image && bannerSettings.imagePosition === 'right' && bannerSettings.animationType !== 'marquee' && (
            <div className="flex-shrink-0 hidden lg:block">
              <img src={bannerSettings.image} alt="" className="h-7 w-7 object-contain opacity-90" />
            </div>
          )}
        </div>
        {bannerSettings.ctaLabel && bannerSettings.ctaUrl && (
          <motion.a
            href={bannerSettings.ctaUrl}
            target="_blank"
            rel="noopener noreferrer"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
            style={{
              backgroundColor: bannerSettings.ctaColor || 'rgba(255, 255, 255, 0.2)',
              color: bannerSettings.textColor
            }}
            className={`flex-shrink-0 px-4 py-2 text-sm font-semibold whitespace-nowrap border border-white/25 hover:border-white/40 ${bannerSettings.ctaStyle === 'pill' ? 'rounded-full' : 'rounded-lg'}`}
          >
            {bannerSettings.ctaLabel}
          </motion.a>
        )}
      </div>
    </div>
  )
}
