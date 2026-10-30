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
import { SectionSheet } from '@/app/components/funnel-shared/SectionSheet'
import { ScrollProgress } from '@/app/components/funnel-shared/ScrollProgress'

const PROGRESS = [
  { id: 'sheet-reason', label: 'The reason' },
  { id: 'sheet-proof', label: 'The proof' },
  { id: 'sheet-build-what', label: 'What we build' },
  { id: 'sheet-build', label: 'The bottom line' },
]

const scrollToForm = () => document.getElementById('build-form')?.scrollIntoView({ behavior: 'smooth' })

export default function Funnel2Page() {
  const [showStickyCTA, setShowStickyCTA] = useState(false)

  // Mobile sticky CTA: show after the hero, hide once the form is on screen
  useEffect(() => {
    const handleScroll = () => {
      const form = document.getElementById('build-form')
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


      <ScrollProgress
        items={PROGRESS}
        barClass="mt-2 border border-[#E2D9CB] bg-[#F7F3EC]/85"
        trackClass="bg-[#A9845A]/20"
        fillClass="bg-[#A9845A]"
        labelClass="uppercase tracking-[0.2em] text-[#A9845A]/60"
        activeLabelClass="uppercase tracking-[0.2em] text-[#A9845A]"
      />

      {/* Each section is a sheet that slides over the last, alternating surfaces so every chapter reads as a stop */}
      <main className="relative z-10">
        {/* Opening screen shares the closing section's gold so the page starts on its boldest note */}
        <div className="bg-[linear-gradient(165deg,#D2B07C_0%,#B08D5E_50%,#8C6B44_100%)]">
          <header className="relative z-20 px-6 py-6 sm:px-10">
            <div className="mx-auto flex max-w-6xl items-center justify-between border-b border-[#1F1C18]/20 pb-6">
              <ElegantLogo />
              <button
                onClick={scrollToForm}
                className="hidden text-[11px] uppercase tracking-[0.32em] text-[#1F1C18] underline-offset-8 transition-colors hover:text-[#F7F3EC] hover:underline sm:block"
              >
                Begin
              </button>
            </div>
          </header>

          <FunnelBanner />
          <Hero onCta={scrollToForm} />
        </div>
        <SectionSheet id="sheet-reason" layer={1} className="bg-[#EFE8DC]">
          <CompareSlider />
        </SectionSheet>
        <SectionSheet id="sheet-proof" layer={2} fill={false} className="bg-[#1F1C18]">
          <Proof />
        </SectionSheet>
        <SectionSheet id="sheet-build-what" layer={3} className="bg-[#F7F3EC]">
          <WhatWeBuild />
        </SectionSheet>
        <SectionSheet id="sheet-build" layer={4} fill={false} className="bg-[linear-gradient(165deg,#D2B07C_0%,#B08D5E_50%,#8C6B44_100%)]">
          <FinalCTA />
        </SectionSheet>
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
