'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { HomepageTracker } from '@/components/HomepageTracker'
import PortfolioInfiniteScroll from '@/app/components/PortfolioInfiniteScroll'
import { Hero } from '@/app/components/landing/hero/Hero'
import { ProofStrip } from '@/app/components/landing/ProofStrip'
import { Capabilities } from '@/app/components/landing/Capabilities'
import { HorizontalProcess } from '@/app/components/landing/HorizontalProcess'
import { WhySection } from '@/app/components/landing/WhySection'
import { ContactSection } from '@/app/components/landing/ContactSection'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { GrainOverlay } from '@/app/components/landing/fx/GrainOverlay'
import { CursorGlow } from '@/app/components/landing/fx/CursorGlow'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, getTestimonials } from '@/lib/firestore'
import { Website, SiteSettings, Testimonial } from '@/types'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomePage() {
  const { language } = useLanguage()
  const content = siteContent.home

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [firebaseSettings, firebaseWebsites, firebaseTestimonials] = await Promise.all([
          getSettings(),
          getWebsites(),
          getTestimonials(),
        ])
        if (firebaseSettings) setSettings(firebaseSettings)
        setWebsites(firebaseWebsites)
        setTestimonials(firebaseTestimonials)
      } catch (error) {
        console.error('Error loading data from Firebase:', error)
        setWebsites([])
        setTestimonials([])
      }
    }
    loadData()
  }, [])

  const portfolioWebsites = [...websites.filter((w) => w.featured), ...websites.filter((w) => !w.featured)].sort(
    (a, b) => a.order - b.order
  )
  const featuredTestimonials = testimonials.filter((t) => t.featured).slice(0, 3)

  const scrollToCapabilities = () => {
    document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div id="home" className="relative min-h-screen bg-[#030814] text-white">
      <HomepageTracker />
      <GrainOverlay />
      <CursorGlow />
      <Header />

      <Hero onSeeWork={scrollToCapabilities} />

      <ProofStrip projectsLive={websites.length} />

      <Capabilities />

      <HorizontalProcess />

      {/* Work */}
      <section id="portfolio" className="relative scroll-mt-20 border-t border-white/[0.06] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            kicker={landingContent.work.kicker[language]}
            title={content.portfolioTitle[language]}
            sub={content.portfolioSubtitle[language]}
            className="mb-16"
          />
        </div>
        {portfolioWebsites.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.7 }}
            className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"
          >
            <PortfolioInfiniteScroll websites={portfolioWebsites} />
          </motion.div>
        )}
      </section>

      <WhySection settings={settings} testimonials={featuredTestimonials} />

      <ContactSection settings={settings} />

      <Footer />
    </div>
  )
}
