'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Target, Heart, Lightbulb, Award, Users, ChevronDown, ChevronUp, Mail, Instagram, Linkedin } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAboutUsSections, getAboutUsSettings, getPackageFAQs, getTeamMembers } from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings, PackageFAQ, TeamMember } from '@/types'
import { T } from '@/components/T'

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
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className={`flex h-full flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/60 shadow-xl shadow-slate-950/50 backdrop-blur-sm ${hasContact ? 'group' : ''}`}
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
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/25 to-blue-500/20">
            <User className="h-20 w-20 text-cyan-400/90 sm:h-24 sm:w-24" />
          </div>
        )}
        {hasContact && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 opacity-0 transition-opacity duration-300 ease-out pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
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

      <div className="flex flex-1 flex-col border-t border-slate-700/50 p-5 md:p-6">
        <h3 className="text-xl font-bold text-white">{member.name}</h3>
        <p className="mb-3 text-sm font-medium text-cyan-400">{member.position}</p>
        <p
          className={`text-sm leading-relaxed text-slate-300 ${!expanded && showReadMore ? 'line-clamp-4' : ''}`}
        >
          {member.bio}
        </p>
        {showReadMore && (
          <button
            type="button"
            onClick={onToggleBio}
            className="mt-4 self-start text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
            aria-expanded={expanded}
          >
            {expanded ? <T>Read less</T> : <T>Read more</T>}
          </button>
        )}
      </div>
    </motion.div>
  )
}

export default function AboutPage() {
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

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'mission': return Target
      case 'values': return Heart
      case 'team': return Users
      case 'story': return Lightbulb
      default: return Award
    }
  }

  const toggleFAQ = (faqId: string) => {
    setExpandedFAQ(prev => ({
      ...prev,
      [faqId]: !prev[faqId]
    }))
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 relative">
        <StarryBackground />
        <SplashCursor />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-slate-400"><T>Loading about us...</T></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <StarryBackground />
      
      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>
      
      {/* Header with Back Button */}
      <Header
        showBackButton={true}
        backButtonText="Back to Home"
        backButtonHref="/"
      />
      
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-6 px-2"
            >
              {settings.pageTitle}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-slate-400 max-w-3xl mx-auto"
            >
              {settings.pageSubtitle}
            </motion.p>
          </div>
        </section>

        {/* Dynamic Sections */}
        {sections.length > 0 ? (
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-24">
                {sections.map((section, index) => {
                  const Icon = getSectionIcon(section.type)
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                          {section.title}
                        </h2>
                      </div>
                      <div 
                        className="text-lg text-slate-300 leading-relaxed prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        ) : (
          // Default content when no sections are configured
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-24">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      <T>Our Mission</T>
                    </h2>
                  </div>
                  <div className="text-lg text-slate-300 leading-relaxed">
                    <p className="mb-4">
                      <T>At IGANI, we're passionate about creating exceptional digital experiences that drive real business results. We believe that great design and flawless functionality should go hand in hand, delivering websites and applications that not only look stunning but perform beautifully.</T>
                    </p>
                    <p>
                      <T>Our team combines technical expertise with creative vision to help businesses establish a powerful online presence that sets them apart from the competition.</T>
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <Heart className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      <T>Our Values</T>
                    </h2>
                  </div>
                  <div className="text-lg text-slate-300 leading-relaxed">
                    <p className="mb-4">
                      <strong className="text-white"><T>Quality First:</T></strong> <T>We never compromise on quality, ensuring every project meets the highest standards of design and development.</T>
                    </p>
                    <p className="mb-4">
                      <strong className="text-white"><T>Client Partnership:</T></strong> <T>We work closely with our clients as true partners, understanding their vision and bringing it to life.</T>
                    </p>
                    <p>
                      <strong className="text-white"><T>Innovation:</T></strong> <T>We stay at the forefront of technology and design trends to deliver cutting-edge solutions.</T>
                    </p>
                  </div>
                </motion.div>
              </div>
            </div>
          </section>
        )}

        {/* Team Members Section */}
        {teamMembers.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-white mb-10 text-center"
              >
                {settings.teamSectionTitle || 'Our Team'}
              </motion.h2>
              <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map((member, index) => (
                  <TeamMemberCard
                    key={member.id}
                    member={member}
                    index={index}
                    expanded={expandedTeamMemberId === member.id}
                    onToggleBio={() => {
                      setExpandedTeamMemberId((prev) =>
                        prev === member.id ? null : member.id
                      )
                    }}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section className="py-16 px-4">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  <T>Frequently Asked Questions</T>
                </h2>
              </div>

              <div className="space-y-4">
                {faqs.map((faq) => (
                  <motion.div
                    key={faq.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleFAQ(faq.id)}
                      className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                    >
                      <h3 className="text-white font-semibold">{faq.question}</h3>
                      {expandedFAQ[faq.id] ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </button>
                    {expandedFAQ[faq.id] && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="px-6 pb-4"
                      >
                        <p className="text-slate-300 leading-relaxed">{faq.answer}</p>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                <T>Ready to Work Together?</T>
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                <T>Let's discuss your project and create something amazing together.</T>
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <AnimatedButton
                variant="primary"
                size="large"
                onClick={() => window.location.href = '/contact'}
              >
                <T>Start Your Project</T>
              </AnimatedButton>

              <AnimatedButton
                variant="secondary"
                size="large"
                onClick={() => window.location.href = '/packages'}
              >
                <T>View Our Services</T>
              </AnimatedButton>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <Footer />
      </div>
    </div>
  )
}