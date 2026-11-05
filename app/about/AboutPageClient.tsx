'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { User, Plus, Mail, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import { NewSiteShell } from '@/components/newsite/NewSiteShell'
import { getAboutUsSections, getAboutUsSettings, getPackageFAQs, getTeamMembers, orderFounders } from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings, PackageFAQ, TeamMember } from '@/types'
import { T } from '@/components/T'
import { CONTACT_HREF } from '@/lib/contactLink'

function teamMemberSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/** Long bios get line-clamped until expanded */
const TEAM_BIO_READ_MORE_AT = 140

/** WhatsApp wa.me expects full international number, digits only (no + or spaces). */
function phoneToWhatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (!digits) return ''
  return `https://wa.me/${digits}`
}

/** "Our *story*" -> the starred word in the display italic, like the headlines on the new site. */
function Accent({ text }: { text: string }) {
  return (
    <>
      {text.split('*').map((seg, i) => (i % 2 === 1 ? <em key={i}>{seg}</em> : <span key={i}>{seg}</span>))}
    </>
  )
}

function TeamMemberCard({ member, expanded, onToggleBio }: { member: TeamMember; expanded: boolean; onToggleBio: () => void }) {
  const whatsappHref = member.phone ? phoneToWhatsAppHref(member.phone) : ''
  const emailTrimmed = member.email?.trim() ?? ''
  const mailtoHref = emailTrimmed ? `mailto:${emailTrimmed}` : ''
  const showReadMore = member.bio.length > TEAM_BIO_READ_MORE_AT
  const profile = `/about/team/${teamMemberSlug(member.name)}`
  return (
    <div id={teamMemberSlug(member.name)} className="ab__m">
      <div className="ab__mh">
        {member.imageUrl ? (
          <img src={member.imageUrl} alt={member.name} className="ab__ph" />
        ) : (
          <div className="ab__ph ab__ph--none">
            <User size={22} />
          </div>
        )}
        <div>
          <h3>
            <Link href={profile}>{member.name}</Link>
          </h3>
          <p className="ab__pos">{member.position}</p>
        </div>
      </div>
      <p className={expanded ? 'ab__bio' : 'ab__bio ab__bio--clamp'}>{member.bio}</p>
      {showReadMore && (
        <button type="button" className="ab__more" onClick={onToggleBio} aria-expanded={expanded}>
          {expanded ? <T>Read less</T> : <T>Read more</T>}
        </button>
      )}
      <div className="ab__links">
        <Link href={profile} className="ab__prof">
          <T>View profile</T> <ArrowRight size={14} />
        </Link>
        <span className="ab__ic">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" title={`WhatsApp ${member.phone}`} aria-label={`Message ${member.name} on WhatsApp`}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
            </a>
          )}
          {mailtoHref && (
            <a href={mailtoHref} title={emailTrimmed} aria-label={`Email ${member.name}`}>
              <Mail size={18} />
            </a>
          )}
          {member.instagramUrl?.trim() && (
            <a href={member.instagramUrl.trim()} target="_blank" rel="noopener noreferrer" title="Instagram" aria-label={`${member.name} on Instagram`}>
              <Instagram size={18} />
            </a>
          )}
          {member.linkedinUrl?.trim() && (
            <a href={member.linkedinUrl.trim()} target="_blank" rel="noopener noreferrer" title="LinkedIn" aria-label={`${member.name} on LinkedIn`}>
              <Linkedin size={18} />
            </a>
          )}
        </span>
      </div>
    </div>
  )
}

export default function AboutPageClient() {
  const [sections, setSections] = useState<AboutUsSection[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  /** Only one team member bio expanded at a time */
  const [expandedTeamMemberId, setExpandedTeamMemberId] = useState<string | null>(null)
  const [faqs, setFAQs] = useState<PackageFAQ[]>([])
  const [settings, setSettings] = useState<AboutUsSettings>({
    pageTitle: 'About IGANI',
    pageSubtitle: 'Crafting digital experiences with passion and precision',
    metaDescription: 'Learn about IGANI - your trusted partner for premium web development and digital solutions.'
  })
  const [expandedFAQ, setExpandedFAQ] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const [sectionsData, settingsData, faqsData, teamData] = await Promise.all([
          getAboutUsSections(),
          getAboutUsSettings(),
          getPackageFAQs(),
          getTeamMembers()
        ])

        setSections(sectionsData.filter(s => s.published).sort((a, b) => a.order - b.order))
        setTeamMembers(orderFounders(teamData.filter(m => m.published)))
        setFAQs(faqsData.filter(f => f.published))

        if (settingsData) {
          setSettings(settingsData)
        }
      } catch (error) {
        console.error('Error loading about us data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(prev => ({
      ...prev,
      [faqId]: !prev[faqId]
    }))
  }

  const defaultSections = [
    {
      id: 'mission',
      title: 'Our Mission',
      paragraphs: [
        "At IGANI, we're passionate about creating exceptional digital experiences that drive real business results. We believe that great design and flawless functionality should go hand in hand, delivering websites and applications that not only look stunning but perform beautifully.",
        'Our team combines technical expertise with creative vision to help businesses establish a powerful online presence that sets them apart from the competition.',
      ],
    },
    {
      id: 'values',
      title: 'Our Values',
      paragraphs: [
        'Quality first: we never compromise on quality, ensuring every project meets the highest standards of design and development.',
        'Client partnership: we work closely with our clients as true partners, understanding their vision and bringing it to life.',
        'Innovation: we stay at the forefront of technology and design trends to deliver cutting-edge solutions.',
      ],
    },
  ]

  const stories = sections.length > 0
    ? sections.map((sec) => ({ id: sec.id, title: sec.title, html: sec.content, paragraphs: [] as string[] }))
    : defaultSections.map((sec) => ({ id: sec.id, title: sec.title, html: '', paragraphs: sec.paragraphs }))

  return (
    <NewSiteShell>
      <section className="ab ab--intro">
        <div className="ab__w">
          <p className="crumbs">
            <a href="/">Home</a> <span>/</span> About
          </p>
          <h1>{settings.pageTitle}</h1>
          <p className="ab__sub">{settings.pageSubtitle}</p>
        </div>
      </section>

      <section className="ab">
        <div className="ab__w">
          {isLoading ? (
            <p aria-busy="true" className="ab__sub">Loading…</p>
          ) : (
            stories.map((section, index) => (
              <div key={section.id} className="ab__row">
                <div className="ab__k">
                  <span>0{index + 1}</span>
                  <h2><Accent text={section.title} /></h2>
                </div>
                {section.html ? (
                  <div className="ab__html" dangerouslySetInnerHTML={{ __html: section.html }} />
                ) : (
                  <div className="ab__html">
                    {section.paragraphs.map((para) => (
                      <p key={para}><T>{para}</T></p>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {teamMembers.length > 0 && (
        <section id="team" className="ab ab--tint" aria-labelledby="team-heading">
          <div className="ab__w">
            <p className="ab__eb">The team</p>
            <h2 id="team-heading" className="ab__h2"><Accent text={settings.teamSectionTitle || 'The people *doing the work*.'} /></h2>
            <div className="ab__grid">
              {teamMembers.map((member) => (
                <TeamMemberCard key={member.id} member={member} expanded={expandedTeamMemberId === member.id} onToggleBio={() => setExpandedTeamMemberId((cur) => (cur === member.id ? null : member.id))} />
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="ab">
          <div className="ab__w">
            <p className="ab__eb">Questions</p>
            <h2 className="ab__h2"><Accent text="Asked *often*." /></h2>
            <div className="ab__faq">
              {faqs.map((faq) => {
                const open = !!expandedFAQ[faq.id]
                return (
                  <div key={faq.id} className="ab__q">
                    <button type="button" onClick={() => toggleFAQ(faq.id)} aria-expanded={open}>
                      <h3>{faq.question}</h3>
                      <Plus size={20} className={open ? 'ab__plus ab__plus--open' : 'ab__plus'} />
                    </button>
                    {open && <p>{faq.answer}</p>}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      <section className="ab ab--cta">
        <div className="ab__w">
          <h2 className="ab__h2"><Accent text="Ready to work *together*?" /></h2>
          <p className="ab__sub">Tell us what you&rsquo;re building. We&rsquo;ll come back with real questions, not a brochure.</p>
          <a className="bt bt--dark" href={CONTACT_HREF}>Book a consultation</a>
        </div>
      </section>
    </NewSiteShell>
  )
}
