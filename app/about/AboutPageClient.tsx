'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Plus, Mail, Instagram, Linkedin, ArrowRight } from 'lucide-react'
import { PageIntro, PageShell, SerifAccent } from '@/app/components/landing/fx/PageShell'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { getAboutUsSections, getAboutUsSettings, getPackageFAQs, getTeamMembers } from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings, PackageFAQ, TeamMember } from '@/types'
import { T } from '@/components/T'

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

function TeamMemberCard({
  member,
  index,
  expanded,
  onToggleBio,
}: {
  member: TeamMember
  index: number
  expanded: boolean
  onToggleBio: () => void
}) {
  const whatsappHref = member.phone ? phoneToWhatsAppHref(member.phone) : ''
  const emailTrimmed = member.email?.trim() ?? ''
  const mailtoHref = emailTrimmed ? `mailto:${emailTrimmed}` : ''
  const hasContact = !!(
    whatsappHref ||
    mailtoHref ||
    member.instagramUrl?.trim() ||
    member.linkedinUrl?.trim()
  )
  const showReadMore = member.bio.length > TEAM_BIO_READ_MORE_AT

  return (
    <motion.div
      id={teamMemberSlug(member.name)}
      initial={{ y: 30 }}
      whileInView={{ y: 0 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      className={`flex h-full flex-col overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#061225]/80 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl ${hasContact ? 'group' : ''}`}
    >
      {/* Image fills top of card */}
      <div className="relative aspect-[3/4] w-full min-h-[260px] sm:min-h-[300px]">
        {member.imageUrl ? (
          <img
            src={member.imageUrl}
            alt={member.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#4080E0]/25 to-[#081833]">
            <User className="h-20 w-20 text-[#9ec0f5]/80 sm:h-24 sm:w-24" />
          </div>
        )}
        {hasContact && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[#030814]/90 opacity-0 transition-opacity duration-300 ease-out pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
            <span className="text-xs text-white/60">
              Contact
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-emerald-400 transition-colors hover:bg-white/20 hover:text-emerald-300"
                  title={`WhatsApp ${member.phone}`}
                  aria-label={`Message ${member.name} on WhatsApp`}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </a>
              )}
              {mailtoHref && (
                <a
                  href={mailtoHref}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
                  title={emailTrimmed}
                  aria-label={`Email ${member.name}`}
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
              {member.instagramUrl?.trim() && (
                <a
                  href={member.instagramUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-pink-400 transition-colors hover:bg-white/20 hover:text-pink-300"
                  title="Instagram"
                  aria-label={`${member.name} on Instagram`}
                >
                  <Instagram className="h-4 w-4" />
                </a>
              )}
              {member.linkedinUrl?.trim() && (
                <a
                  href={member.linkedinUrl.trim()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-sky-400 transition-colors hover:bg-white/20 hover:text-sky-300"
                  title="LinkedIn"
                  aria-label={`${member.name} on LinkedIn`}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col border-t border-white/[0.08] p-6 md:p-7">
        <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">
          <Link
            href={`/about/team/${teamMemberSlug(member.name)}`}
            className="transition-colors hover:text-[#80A0E0]"
          >
            {member.name}
          </Link>
        </h3>
        <p className="font-display mb-3 text-lg text-[#dbe6ff]">{member.position}</p>
        <p
          className={`text-[15px] leading-relaxed text-white/70 ${!expanded && showReadMore ? 'line-clamp-4' : ''}`}
        >
          {member.bio}
        </p>
        {showReadMore && (
          <button
            type="button"
            onClick={onToggleBio}
            className="mt-4 self-start text-sm font-medium text-[#9ec0f5] underline decoration-white/20 underline-offset-4 transition-colors hover:text-white"
            aria-expanded={expanded}
          >
            {expanded ? <T>Read less</T> : <T>Read more</T>}
          </button>
        )}
        <Link
          href={`/about/team/${teamMemberSlug(member.name)}`}
          className="group/link mt-auto inline-flex items-center gap-2 self-start pt-6 text-sm font-semibold text-white transition-colors hover:text-[#9ec0f5]"
        >
          <T>View profile</T>
          <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-0.5" />
        </Link>
      </div>
    </motion.div>
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
        setTeamMembers(teamData.filter(m => m.published).sort((a, b) => a.order - b.order))
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

  return (
    <PageShell>
      <PageIntro label="About" aside="three founders, one room." title={settings.pageTitle} sub={settings.pageSubtitle} />

      {/* Story: editorial rows — index + title on the left, the words on the right */}
      <section className="relative pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="space-y-6" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} className="h-48 animate-pulse rounded-3xl border border-white/[0.06] bg-white/[0.02]" />
              ))}
            </div>
          ) : (
            <div>
              {(sections.length > 0
                ? sections.map((sec) => ({ id: sec.id, title: sec.title, html: sec.content }))
                : defaultSections.map((sec) => ({ id: sec.id, title: sec.title, paragraphs: sec.paragraphs }))
              ).map((section, index) => (
                <motion.div
                  key={section.id}
                  initial={{ y: 30 }}
                  whileInView={{ y: 0 }}
                  viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="grid gap-6 border-t border-white/[0.12] py-12 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16 lg:py-16"
                >
                  <div>
                    <span className="font-display text-5xl italic leading-none text-[#4080E0]">0{index + 1}</span>
                    <h2 className="mt-4 border-none pb-0 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                      <SerifAccent text={section.title} />
                    </h2>
                  </div>
                  {'html' in section && section.html ? (
                    <div
                      className="max-w-none text-lg leading-relaxed text-white/70 [&_a]:text-[#9ec0f5] [&_a]:underline [&_li]:mt-2 [&_p+p]:mt-4 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:list-disc [&_ul]:ps-5"
                      dangerouslySetInnerHTML={{ __html: section.html }}
                    />
                  ) : (
                    <div className="space-y-4 text-lg leading-relaxed text-white/70">
                      {'paragraphs' in section &&
                        section.paragraphs?.map((para) => (
                          <p key={para} className="first:!mt-0">
                            <T>{para}</T>
                          </p>
                        ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Team */}
      {teamMembers.length > 0 && (
        <section id="team" className="relative scroll-mt-24 bg-[#081833] py-24 sm:py-32" aria-labelledby="team-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mb-10 flex items-baseline justify-between gap-6 border-t border-white/[0.12] pt-3 text-[13px] text-white/60">
              <span>The team</span>
              <span className="hidden sm:block">you&rsquo;ll talk to us, not an account manager.</span>
            </div>
            <h2
              id="team-heading"
              className="mb-12 max-w-3xl border-none pb-0 text-balance text-4xl font-semibold leading-[1.0] tracking-[-0.025em] text-white sm:text-5xl lg:text-6xl"
            >
              <SerifAccent text={settings.teamSectionTitle || 'The people *doing the work*.'} />
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {teamMembers.map((member, index) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  index={index}
                  expanded={expandedTeamMemberId === member.id}
                  onToggleBio={() => {
                    setExpandedTeamMemberId((prev) => (prev === member.id ? null : member.id))
                  }}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="relative py-24 sm:py-32">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16 lg:px-8">
            <div>
              <div className="mb-8 border-t border-white/[0.12] pt-3 text-[13px] text-white/60">Questions</div>
              <h2 className="border-none pb-0 text-4xl font-semibold leading-[1.0] tracking-[-0.025em] text-white sm:text-5xl">
                <SerifAccent text="Asked *often*." />
              </h2>
            </div>
            <div className="border-b border-white/[0.12]">
              {faqs.map((faq) => {
                const open = !!expandedFAQ[faq.id]
                return (
                  <div key={faq.id} className="border-t border-white/[0.12]">
                    <button
                      type="button"
                      onClick={() => toggleFAQ(faq.id)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-6 py-6 text-left"
                    >
                      <h3 className="text-lg font-semibold text-white">{faq.question}</h3>
                      <Plus className={`h-5 w-5 shrink-0 text-white/60 transition-transform duration-300 ${open ? 'rotate-45 text-white' : ''}`} />
                    </button>
                    {open && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pb-6">
                        <p className="!mt-0 max-w-2xl leading-relaxed text-white/70">{faq.answer}</p>
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* Closing call to action — the same blue the home page ends on */}
      <section className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_50%_0%,#1d4fa3_0%,#0c2552_50%,#0a1f47_100%)] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="mx-auto max-w-4xl border-none pb-0 text-balance text-[clamp(40px,6vw,88px)] font-semibold leading-[0.98] tracking-[-0.035em] text-white">
            <SerifAccent text="Ready to work *together*?" />
          </h2>
          <p className="mx-auto !mt-6 max-w-xl text-lg leading-relaxed text-white/75">
            Tell us what you&rsquo;re building. We&rsquo;ll come back with real questions, not a brochure.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <MagneticButton href="/start">
              Start a project
              <ArrowRight className="h-4 w-4" />
            </MagneticButton>
            <MagneticButton variant="ghost" href="/packages">
              See packages
            </MagneticButton>
          </div>
        </div>
      </section>
    </PageShell>
  )
}
