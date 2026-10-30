'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Script from 'next/script'
import { MessageSquare } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import { FunnelBanner } from '@/app/components/funnels/FunnelBanner'
import { GrainOverlay } from '@/app/components/landing/fx/GrainOverlay'
import { CursorGlow } from '@/app/components/landing/fx/CursorGlow'
import { SectionRail } from '@/app/components/landing/fx/SectionRail'
import { displaySerif } from '@/app/components/landing/fx/fonts'
import { Hero } from '@/app/components/funnel3/Hero'
import { CompareSlider } from '@/app/components/funnel3/CompareSlider'
import { Proof } from '@/app/components/funnel3/Proof'
import { OurWork } from '@/app/components/funnel3/OurWork'
import { WhatWeBuild } from '@/app/components/funnel3/WhatWeBuild'
import { FinalCTA } from '@/app/components/funnel3/FinalCTA'
import { SectionSheet } from '@/app/components/funnel-shared/SectionSheet'
import { ScrollProgress } from '@/app/components/funnel-shared/ScrollProgress'

const scrollTo = (id: string) => () => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
const scrollToForm = scrollTo('build-form')

const RAIL = [
  { id: 'reason', index: '01', label: 'The reason' },
  { id: 'proof', index: '02', label: 'The proof' },
  { id: 'work', index: '03', label: 'Our work' },
  { id: 'build-what', index: '04', label: 'What we build' },
  { id: 'build', index: '05', label: 'The bottom line' },
]

const PROGRESS = RAIL.map((r) => ({ id: `sheet-${r.id}`, label: r.label }))

export default function Funnel3Page() {
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
    <div className={`relative min-h-screen bg-[#030814] text-white ${displaySerif.variable}`}>
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
      <GrainOverlay />
      <CursorGlow />
      <SectionRail items={RAIL} />
      <ScrollProgress
        items={PROGRESS}
        positionClass="top-[70px] sm:top-[86px]"
        barClass="border border-white/10 bg-[#04101e]/70"
        trackClass="bg-white/10"
        fillClass="bg-[#4080E0]"
        labelClass="text-white/40"
        activeLabelClass="text-white"
      />

      {/* Floating pill header, same shape as the home page's */}
      <header className="fixed inset-x-0 top-3 z-50 px-3 sm:top-4 sm:px-6">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between rounded-full border border-white/10 bg-[#04101e]/70 py-2.5 pl-5 pr-2.5 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.8)] backdrop-blur-xl sm:pl-8">
          <IganiLogo className="h-9 w-28" />
          <button
            onClick={scrollToForm}
            className="inline-flex items-center gap-2 rounded-full bg-[#2f6fd8] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4080E0] sm:px-5"
          >
            <MessageSquare className="h-4 w-4" />
            Get in touch today
          </button>
        </div>
      </header>

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#030814]/85 p-4 backdrop-blur-xl lg:hidden"
          >
            <button
              onClick={scrollToForm}
              className="w-full rounded-full bg-white py-3.5 text-sm font-semibold text-[#04101e]"
            >
              Get in touch today
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Each section is a sheet that slides over the last, alternating surfaces so every chapter reads as a stop */}
      <main className="relative">
        {/* Opening screen shares the closing section's brand blue so the page starts on its boldest note */}
        <div className="bg-[radial-gradient(120%_80%_at_50%_0%,#5b95ee_0%,#2f6fd8_40%,#1a4fae_100%)]">
          <FunnelBanner className="mt-[76px] sm:mt-[92px]" />
          <Hero onCta={scrollToForm} onSeeWhy={scrollTo('reason')} />
        </div>
        <SectionSheet id="sheet-reason" layer={1} className="bg-[#061225]">
          <CompareSlider />
        </SectionSheet>
        <SectionSheet id="sheet-proof" layer={2} fill={false} className="bg-[#EEF3FC]">
          <Proof />
        </SectionSheet>
        <SectionSheet id="sheet-work" layer={3} fill={false} className="bg-[#061225]">
          <OurWork onWant={scrollToForm} />
        </SectionSheet>
        <SectionSheet id="sheet-build-what" layer={4} className="bg-[#030814]">
          <WhatWeBuild />
        </SectionSheet>
        <SectionSheet
          id="sheet-build"
          layer={5}
          fill={false}
          className="bg-[radial-gradient(120%_80%_at_50%_0%,#5b95ee_0%,#2f6fd8_40%,#1a4fae_100%)]"
        >
          <FinalCTA />
        </SectionSheet>
      </main>

      <footer className="relative z-[6] bg-[#030814] px-4 pb-28 pt-8 text-center text-[13px] text-white/45 lg:pb-8">
        © 2026 IGANI. All rights reserved. ·{' '}
        <a href="mailto:info@igani.co" className="text-[#9ec0f5] hover:text-white">
          info@igani.co
        </a>
      </footer>
    </div>
  )
}
