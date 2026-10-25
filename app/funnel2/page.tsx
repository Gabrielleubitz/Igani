'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Script from 'next/script'
import { ElegantLogo } from '@/app/components/funnel2/ElegantLogo'
import { FunnelBanner } from '@/app/components/funnels/FunnelBanner'
import { Hero } from '@/app/components/funnel2/Hero'
import { CompareSlider } from '@/app/components/funnel2/CompareSlider'
import { Proof } from '@/app/components/funnel2/Proof'
import { WhatWeBuild } from '@/app/components/funnel2/WhatWeBuild'
import { FinalCTA } from '@/app/components/funnel2/FinalCTA'
import { cormorant } from '@/app/components/funnel2/fonts'

const scrollToForm = () => document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' })

export default function Funnel2Page() {
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // Mobile sticky CTA: show after the hero, hide once the form is on screen
  useEffect(() => {
    const handleScroll = () => {
      const form = document.getElementById('build')
      const formTop = form ? form.getBoundingClientRect().top : Infinity
      setShowStickyCTA(window.scrollY > 500 && formTop > window.innerHeight * 0.6)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`${cormorant.variable} relative min-h-screen overflow-x-clip bg-[#F7F3EC] text-[#1F1C18] selection:bg-[#A9845A]/25`}>
      {/* Hotjar Tracking Code for igani.co */}
      <Script
        id="hotjar"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:6586485,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `,
        }}
      />

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#E2D9CB] bg-[#F7F3EC]/95 p-4 backdrop-blur lg:hidden"
          >
            <button
              onClick={scrollToForm}
              className="w-full bg-[#1F1C18] py-4 text-[11px] font-medium uppercase tracking-[0.32em] text-[#F7F3EC]"
            >
              Fix your front door
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-20 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#E2D9CB] pb-6">
          <ElegantLogo />
          <button
            onClick={scrollToForm}
            className="hidden text-[11px] uppercase tracking-[0.32em] text-[#1F1C18] underline-offset-8 transition-colors hover:text-[#A9845A] hover:underline sm:block"
          >
            Begin
          </button>
        </div>
      </header>

      <FunnelBanner />

      <main className="relative z-10">
        <Hero onCta={scrollToForm} />
        <CompareSlider />
        <Proof />
        <WhatWeBuild />
        <FinalCTA />
      </main>

      <footer className="bg-[#1F1C18] px-6 pb-28 pt-2 text-center lg:pb-10">
        <div className="mx-auto max-w-6xl border-t border-[#F7F3EC]/10 pt-8 text-xs tracking-wide text-[#F7F3EC]/50">
          © 2026 IGANI. All rights reserved. ·{' '}
          <a href="mailto:info@igani.co" className="text-[#C9A774] hover:text-[#F7F3EC]">
            info@igani.co
          </a>
        </div>
      </footer>
    </div>
  )
}
