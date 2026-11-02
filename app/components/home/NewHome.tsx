'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { HomepageTracker } from '@/components/HomepageTracker'
import { SectionRail } from '@/app/components/landing/fx/SectionRail'
import { GrainOverlay } from '@/app/components/landing/fx/GrainOverlay'
import { CursorGlow } from '@/app/components/landing/fx/CursorGlow'
import { displaySerif } from '@/app/components/landing/fx/fonts'
import { HoldStill, SectionSheet, scrollToSection } from '@/app/components/funnel-shared/SectionSheet'
import { getSettings, getTeamMembers } from '@/lib/firestore'
import { SiteSettings, TeamMember } from '@/types'
import { defaultSettings } from '@/data/defaultSettings'
import { ContactSection } from '@/app/components/landing/ContactSection'
import { HomeHero } from './HomeHero'
import { WorkSection } from './WorkSection'
import { WhyCrucial } from './WhyCrucial'
import { TeamSection } from './TeamSection'
import { CONTACT_FORM_ID } from '@/lib/contactLink'
import { ProcessSection } from './ProcessSection'

const RAIL = [
  { id: 'work', index: '01', label: 'Our work' },
  { id: 'why', index: '02', label: 'Why it matters' },
  { id: 'team', index: '03', label: 'Our team' },
  { id: 'process', index: '04', label: 'The process' },
  { id: 'contact', index: '05', label: 'Get in touch' },
]

/**
 * Home page, in the order: hero → our work (the pinned site gallery, then a ticker of
 * everyone we've built for) → why this change is crucial → our team → the process →
 * the contact form.
 */
export function NewHome() {
  const [team, setTeam] = useState<TeamMember[]>([])
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTeamMembers().catch(() => [] as TeamMember[]),
      getSettings().catch(() => null),
    ])
      .then(([t, p]) => {
        setTeam(t.filter((m) => m.published).sort((a, b) => a.order - b.order))
        if (p) setSettings(p)
      })
      .catch(() => undefined)
      .finally(() => setLoading(false))
  }, [])

  // A link like /#contact from another page lands on its target once the page has laid out. Content above it (the team data, images)
  // keeps settling after load, so check a few times and correct if it has drifted off screen; stop the moment the visitor scrolls.
  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hash) return
    // /#contact means "I want to get in touch", so it opens on the form rather than the section's heading
    const id = hash === 'contact' ? CONTACT_FORM_ID : hash
    let userScrolled = false
    const stop = () => {
      userScrolled = true
    }
    const events = ['wheel', 'touchmove', 'keydown', 'mousedown'] as const
    events.forEach((e) => window.addEventListener(e, stop, { passive: true }))
    const timers = [450, 1400, 2800, 4500].map((ms) =>
      window.setTimeout(() => {
        if (userScrolled) return
        const top = document.getElementById(id)?.getBoundingClientRect().top
        if (top === undefined || top < 0 || top > window.innerHeight * 0.4) scrollToSection(id, 'auto')
      }, ms),
    )
    return () => {
      timers.forEach(window.clearTimeout)
      events.forEach((e) => window.removeEventListener(e, stop))
    }
  }, [loading])

  return (
    <div id="home" className={`relative min-h-screen bg-[#030814] text-white ${displaySerif.variable}`}>
      <HomepageTracker />
      <GrainOverlay />
      <CursorGlow />
      <SectionRail items={RAIL} />
      <Header />

      <HoldStill className="relative z-0 pb-10">
        <HomeHero onCheckWork={() => scrollToSection('work')} onStart={() => scrollToSection(CONTACT_FORM_ID)} />
      </HoldStill>

      {/* Chapters slide up over one another; one light chapter (why it matters) as the break, blue to close */}
      <SectionSheet hold veilPrevious id="sheet-work" layer={1} fill={false} className="bg-[#081833]">
        <WorkSection onWant={() => scrollToSection(CONTACT_FORM_ID)} />
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-why" layer={2} fill={false} className="bg-[#EEF1F6]">
        <WhyCrucial />
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-team" layer={3} fill={false} className="bg-[#030814]">
        <TeamSection team={team} loading={loading} />
      </SectionSheet>

      <SectionSheet hold veilPrevious id="sheet-process" layer={4} fill={false} className="bg-[#081833]">
        <ProcessSection />
      </SectionSheet>

      {/* Last chapter doesn't hold, so the footer can never cover the form */}
      <SectionSheet
        veilPrevious
        id="sheet-contact"
        layer={5}
        fill={false}
        className="bg-[radial-gradient(120%_70%_at_50%_0%,#1d4fa3_0%,#0c2552_45%,#0a1f47_100%)]"
      >
        <ContactSection settings={settings} />
      </SectionSheet>

      <div className="relative z-[6] -mt-6 rounded-t-[32px] bg-[#030814] pt-6 shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.5)]">
        <Footer />
      </div>
    </div>
  )
}
