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
import { getSettings, getTeamMembers, getWebsites } from '@/lib/firestore'
import { caseStudies } from '@/lib/caseStudies'
import { SiteSettings, TeamMember, Website } from '@/types'
import { defaultSettings } from '@/data/defaultSettings'
import { ContactSection } from '@/app/components/landing/ContactSection'
import { HomeHero } from './HomeHero'
import { WorkSection } from './WorkSection'
import { WhyCrucial } from './WhyCrucial'
import { TeamSection } from './TeamSection'
import { ProcessSection } from './ProcessSection'

const RAIL = [
  { id: 'work', index: '01', label: 'Our work' },
  { id: 'why', index: '02', label: 'Why it matters' },
  { id: 'team', index: '03', label: 'Our team' },
  { id: 'process', index: '04', label: 'The process' },
  { id: 'contact', index: '05', label: 'Get in touch' },
]

/**
 * Home page, in the order: hero → our work (two before/afters, then every
 * site we've built) → why this change is crucial → our team → the process →
 * the contact form.
 */
export function NewHome() {
  const [websites, setWebsites] = useState<Website[]>([])
  const [team, setTeam] = useState<TeamMember[]>([])
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getWebsites().catch(() => [] as Website[]),
      getTeamMembers().catch(() => [] as TeamMember[]),
      getSettings().catch(() => null),
    ])
      .then(([w, t, p]) => {
        setWebsites([...w].sort((a, b) => Number(b.featured) - Number(a.featured) || a.order - b.order))
        setTeam(t.filter((m) => m.published).sort((a, b) => a.order - b.order))
        if (p) setSettings(p)
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <div id="home" className={`relative min-h-screen bg-[#030814] text-white ${displaySerif.variable}`}>
      <HomepageTracker />
      <GrainOverlay />
      <CursorGlow />
      <SectionRail items={RAIL} />
      <Header />

      <HoldStill className="relative z-0 pb-10">
        <HomeHero onCheckWork={() => scrollToSection('work')} />
      </HoldStill>

      {/* Chapters slide up over one another; one light chapter (why it matters) as the break, blue to close */}
      <SectionSheet hold veilPrevious id="sheet-work" layer={1} fill={false} className="bg-[#081833]">
        <WorkSection studies={caseStudies} websites={websites} loading={loading} />
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
