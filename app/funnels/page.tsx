'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Script from 'next/script'
import { IganiLogo } from '@/components/IganiLogo'
import { FunnelBanner } from '@/app/components/funnels/FunnelBanner'
import { Hero } from '@/app/components/funnels/Hero'
import { CompareSlider } from '@/app/components/funnels/CompareSlider'
import { ProofCards } from '@/app/components/funnels/ProofCards'
import { BentoBuild } from '@/app/components/funnels/BentoBuild'
import { FinalCTA } from '@/app/components/funnels/FinalCTA'
import { clashDisplay, funnelMono } from '@/app/components/funnels/fonts'

const scrollToForm = () => document.getElementById('build')?.scrollIntoView({ behavior: 'smooth' })

export default function FunnelsPage() {
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
    <div className={`funnels-root ${clashDisplay.variable} ${funnelMono.variable} relative min-h-screen overflow-x-clip bg-[#0A0A0C] text-white selection:bg-[#00F0FF]/30`}>
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

      {/* Faint grid backdrop */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]"
      />

      {/* Mobile Sticky CTA */}
      <AnimatePresence>
        {showStickyCTA && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-[#0A0A0C]/85 p-4 backdrop-blur-xl lg:hidden"
          >
            <button
              onClick={scrollToForm}
              className="w-full rounded-full bg-gradient-to-r from-[#00F0FF] to-[#7000FF] py-3.5 font-mono text-sm font-medium uppercase tracking-[0.2em] text-[#0A0A0C]"
            >
              [ Fix your front door ]
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="relative z-20 px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <IganiLogo className="h-10 w-32" />
        </div>
      </header>

      <FunnelBanner />

      <main className="relative z-10">
        <Hero onCta={scrollToForm} />
        <CompareSlider />
        <ProofCards />
        <BentoBuild />
        <FinalCTA />
      </main>

      <footer className="relative z-10 border-t border-white/10 px-4 pb-28 pt-8 text-center lg:pb-8">
        <p className="font-mono text-xs text-white/40">
          © 2026 IGANI. All rights reserved. •{' '}
          <a href="mailto:info@igani.co" className="text-[#00F0FF] hover:text-white">
            info@igani.co
          </a>
        </p>
      </footer>
    </div>
  )
}
