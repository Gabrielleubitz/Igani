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
import { SideNote } from '@/app/components/landing/fx/SideNote'
import { SectionRail } from '@/app/components/landing/fx/SectionRail'
import { GrainOverlay } from '@/app/components/landing/fx/GrainOverlay'
import { CursorGlow } from '@/app/components/landing/fx/CursorGlow'
import { displaySerif } from '@/app/components/landing/fx/fonts'
import { HoldStill, SectionSheet, scrollToSection } from '@/app/components/funnel-shared/SectionSheet'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'
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
    scrollToSection('capabilities')
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

      {/* Opening chapter: hero + proof strip. Holds still for its last screen so the first sheet visibly covers it */}
      <HoldStill className="relative z-0 pb-10">
        <Hero onSeeWork={scrollToCapabilities} latestProject={latestProject} />
        <ProofStrip projectsLive={websites.length} founders={team.length} />
      </HoldStill>

      {/* Chapters: each sheet slides up over the last one, which holds still and darkens beneath it.
          Surfaces alternate navy / deep navy, with one light chapter (process) as the break and blue to close. */}
      <SectionSheet hold veilPrevious id="sheet-capabilities" layer={1} fill={false} className="bg-[#081833]">
        <Capabilities />
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-founders" layer={2} fill={false} className="bg-[#030814]">
        <FoundersStatement team={team} />
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-process" layer={3} fill={false} className="bg-[#EEF1F6]">
        <HorizontalProcess />
      </SectionSheet>

      {/* Work */}
      <SectionSheet hold veilPrevious id="sheet-portfolio" layer={4} fill={false} className="bg-[#081833]">
        <section id="portfolio" className="relative scroll-mt-20">
          <ChapterOpener index={work.index} label={work.label[language]} aside={workAside} title={work.title[language]}>
            <div className="mt-8 hidden sm:block [@media(pointer:coarse)]:!hidden">
              <SideNote arrow="down">{work.note[language]}</SideNote>
            </div>
          </ChapterOpener>
          <ChapterBody className="bg-[#081833] pb-24 pt-14 sm:pb-32 sm:pt-20">
            {/* Full bleed: the carousel runs edge to edge */}
            {portfolioWebsites.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-80px' }}
                transition={{ duration: 0.7 }}
              >
                <PortfolioInfiniteScroll websites={portfolioWebsites} />
              </motion.div>
            )}
          </ChapterBody>
        </section>
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-about" layer={5} fill={false} className="bg-[#030814]">
        <WhySection settings={settings} testimonials={featuredTestimonials} />
      </SectionSheet>

      <SectionSheet
        hold
        veilPrevious
        id="sheet-contact"
        layer={6}
        fill={false}
        className="bg-[radial-gradient(120%_70%_at_50%_0%,#1d4fa3_0%,#0c2552_45%,#0a1f47_100%)]"
      >
        <ContactSection settings={settings} />
      </SectionSheet>

      <div className="relative z-[7] -mt-6 rounded-t-[32px] bg-[#030814] pt-6 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.5)]">
      <Footer />
        {/* Sign-off: the page clearly ends here */}
        <div
          aria-hidden
          className="select-none overflow-hidden pb-[1vw] pt-6 text-center text-[20vw] font-semibold leading-[0.8] tracking-[-0.06em] text-[#081833]"
        >
          Igani
        </div>
      </div>
    </div>
  )
}
