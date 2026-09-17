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
import { FoundersStatement } from '@/app/components/landing/FoundersStatement'
import { HorizontalProcess } from '@/app/components/landing/HorizontalProcess'
import { WhySection } from '@/app/components/landing/WhySection'
import { ContactSection } from '@/app/components/landing/ContactSection'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { SideNote } from '@/app/components/landing/fx/SideNote'
import { SectionRail } from '@/app/components/landing/fx/SectionRail'
import { GrainOverlay } from '@/app/components/landing/fx/GrainOverlay'
import { CursorGlow } from '@/app/components/landing/fx/CursorGlow'
import { displaySerif } from '@/app/components/landing/fx/fonts'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, getTestimonials, getTeamMembers } from '@/lib/firestore'
import { Website, SiteSettings, Testimonial, TeamMember } from '@/types'
import { landingContent } from '@/lib/landingContent'
import { useLanguage } from '@/contexts/LanguageContext'

export default function HomePage() {
  const { language } = useLanguage()

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        const [firebaseSettings, firebaseWebsites, firebaseTestimonials, firebaseTeam] = await Promise.all([
          getSettings(),
          getWebsites(),
          getTestimonials(),
          getTeamMembers().catch(() => [] as TeamMember[]),
        ])
        if (firebaseSettings) setSettings(firebaseSettings)
        setWebsites(firebaseWebsites)
        setTestimonials(firebaseTestimonials)
        setTeam(firebaseTeam)
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

  const latestProject = [...websites]
    .filter((w) => w.createdAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]?.title

  const scrollToCapabilities = () => {
    document.getElementById('capabilities')?.scrollIntoView({ behavior: 'smooth' })
  }

  const work = landingContent.work
  const rail = [
    { id: 'capabilities', index: landingContent.capabilities.index, label: landingContent.capabilities.label[language] },
    { id: 'process', index: landingContent.process.index, label: landingContent.process.label[language] },
    { id: 'portfolio', index: work.index, label: work.label[language] },
    { id: 'about', index: landingContent.why.index, label: landingContent.why.label[language] },
    { id: 'contact', index: landingContent.contact.index, label: landingContent.contact.label[language] },
  ]
  const workAside =
    websites.length > 0
      ? `${websites.length} ${websites.length === 1 ? work.asideOne[language] : work.asideMany[language]}`
      : undefined

  return (
    <div id="home" className={`relative min-h-screen bg-[#030814] text-white ${displaySerif.variable}`}>
      <HomepageTracker />
      <GrainOverlay />
      <CursorGlow />
      <SectionRail items={rail} />
      <Header />

      <Hero onSeeWork={scrollToCapabilities} latestProject={latestProject} />

      <ProofStrip projectsLive={websites.length} founders={team.length} />

      <Capabilities />

      <FoundersStatement team={team} />

      <HorizontalProcess />

      {/* Work */}
      <section id="portfolio" className="relative scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            index={work.index}
            label={work.label[language]}
            aside={workAside}
            title={work.title[language]}
            className="mb-12"
          />
          <div className="mb-6 hidden sm:block [@media(pointer:coarse)]:!hidden">
            <SideNote arrow="down">{work.note[language]}</SideNote>
          </div>
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
