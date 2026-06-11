'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import ScrollHero from '@/app/components/ScrollHero'
import ScrollBackground from '@/app/components/ScrollBackground'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, getTestimonials } from '@/lib/firestore'
import { Website, SiteSettings, Testimonial } from '@/types'
import { siteContent } from '@/lib/i18n'
import { useLanguage } from '@/contexts/LanguageContext'
import { T } from '@/components/T'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ExternalLink,
  ArrowRight,
  ArrowUpRight,
  Star,
  Code2,
  PenTool,
  Workflow,
} from 'lucide-react'
import PhoneInput, { validatePhone } from '@/components/PhoneInput'
import { ContactInquirySuccess } from '@/components/ContactInquirySuccess'
import { HomepageTracker } from '@/components/HomepageTracker'

const EASE = 'easeOut' as const

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: EASE },
}

export default function HomePage() {
  const { language } = useLanguage()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    projectType: 'Landing Page',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])

  const content = siteContent.home

  useEffect(() => {
    const loadData = async () => {
      try {
        const firebaseSettings = await getSettings()
        if (firebaseSettings) {
          setSettings(firebaseSettings)
        }
        const firebaseWebsites = await getWebsites()
        setWebsites(firebaseWebsites)
        const firebaseTestimonials = await getTestimonials()
        setTestimonials(firebaseTestimonials)
      } catch (error) {
        console.error('Error loading data from Firebase:', error)
        setWebsites([])
        setTestimonials([])
      }
    }

    loadData()
  }, [])

  const featuredWebsites = websites.filter(w => w.featured)
  const regularWebsites = websites.filter(w => !w.featured)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const localNumber = formData.phone.replace(/^\+\d+\s*/, '')
    if (formData.phone && !validatePhone(localNumber)) {
      setPhoneError('Please enter a valid phone number.')
      return
    }
    setPhoneError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitStatus('error')
        setTimeout(() => setSubmitStatus('idle'), 5000)
        return
      }
      setSubmitStatus('success')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        projectType: 'Landing Page',
        message: ''
      })
    } catch (error) {
      console.error('Form submission failed:', error)
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const scrollToPortfolio = () => {
    document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })
  }

  const capabilities = [
    {
      icon: Code2,
      title: content.customWebDevTitle[language],
      description: content.customWebDevDescription[language],
    },
    {
      icon: PenTool,
      title: content.uiUxDesignTitle[language],
      description: content.uiUxDesignDescription[language],
    },
    {
      icon: Workflow,
      title: content.automationTitle[language],
      description: content.automationDescription[language],
    },
  ]

  const processSteps = [
    { step: '01', title: content.step1Title[language], description: content.step1Description[language] },
    { step: '02', title: content.step2Title[language], description: content.step2Description[language] },
    { step: '03', title: content.step3Title[language], description: content.step3Description[language] },
    { step: '04', title: content.step4Title[language], description: content.step4Description[language] },
    { step: '05', title: content.step5Title[language], description: content.step5Description[language] },
  ]

  const whyPillars = [
    { title: content.whyPillar1Title[language], description: content.whyPillar1Description[language] },
    { title: content.whyPillar2Title[language], description: content.whyPillar2Description[language] },
    { title: content.whyPillar3Title[language], description: content.whyPillar3Description[language] },
  ]

  const featuredTestimonials = testimonials.filter(t => t.featured).slice(0, 3)

  const ctaPrimary = (
    <a
      href="/contact"
      className="group inline-flex items-center gap-2 rounded-full bg-[#4080E0] px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
    >
      {content.ctaFreeConsultation[language]}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </a>
  )

  return (
    <div id="home" className="min-h-screen bg-[#0a0a0a] text-white">
      <HomepageTracker />
      <Header />

      {/* 1 — Scroll-scrubbed cinematic hero */}
      <ScrollHero
        videoSrc="/hero.mp4"
        poster="/hero-poster.jpg"
        heightVh={300}
        mobileHeightVh={220}
        overlayStart={
          <div className="mx-auto max-w-4xl text-center">
            <p className="mb-6 text-[11px] font-medium uppercase tracking-[0.35em] text-[#80A0E0] sm:text-xs">
              {content.heroTagline[language]}
            </p>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {content.heroTitle[language]}
            </h1>
            <p className="mt-4 text-xl font-medium tracking-tight text-white/85 sm:text-2xl">
              {content.heroTitleLine2[language]}
            </p>
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              {content.heroSubtitle[language]}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              {ctaPrimary}
              <button
                onClick={scrollToPortfolio}
                className="inline-flex items-center gap-2 rounded-full border border-[#4080E0]/40 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#4080E0]/80 hover:bg-[#4080E0]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
              >
                {content.ctaViewWork[language]}
              </button>
            </div>
          </div>
        }
        overlayEnd={
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="border-none pb-0 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
              {content.heroOutroTitle[language]}
            </h2>
            <p className="mt-4 text-lg text-white/75">
              {content.heroOutroSubtitle[language]}
            </p>
            <div className="mt-8 flex justify-center">{ctaPrimary}</div>
          </div>
        }
      />

      {/* Sections 2-6 — cinematic navy/blue scroll-scrubbed canvas */}
      <ScrollBackground videoSrc="/sections.mp4" poster="/sections-poster.jpg">

        {/* 2 — What we build — bento dark-grid with corner-bracket hover */}
        <section className="py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 max-w-2xl">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#4080E0]">01</p>
              <h2 className="border-none pb-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {content.servicesTitle[language]}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">
                {content.servicesSubtitle[language]}
              </p>
            </motion.div>

            {/* Bento grid: two cards top row, one wide card bottom */}
            <div className="grid gap-3 md:grid-cols-2">
              {capabilities.slice(0, 2).map((cap, index) => (
                <motion.div
                  key={cap.title}
                  {...fadeUp}
                  transition={{ duration: 0.6, ease: EASE, delay: index * 0.08 }}
                  className="group relative overflow-visible rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-8 backdrop-blur-md transition-colors duration-300 hover:border-[#4080E0]/50 sm:p-10"
                >
                  {/* Corner brackets — appear on hover */}
                  <div className="pointer-events-none absolute inset-0 hidden group-hover:block">
                    <div className="absolute -left-[3px] -top-[3px] h-4 w-4 border-l-2 border-t-2 border-[#4080E0] rounded-tl" />
                    <div className="absolute -right-[3px] -top-[3px] h-4 w-4 border-r-2 border-t-2 border-[#4080E0] rounded-tr" />
                    <div className="absolute -left-[3px] -bottom-[3px] h-4 w-4 border-l-2 border-b-2 border-[#4080E0] rounded-bl" />
                    <div className="absolute -right-[3px] -bottom-[3px] h-4 w-4 border-r-2 border-b-2 border-[#4080E0] rounded-br" />
                  </div>
                  {/* Subtle inner glow on hover */}
                  <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-[#4080E0]/8 via-transparent to-transparent" />

                  <div className="relative z-10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#4080E0]/30 bg-[#4080E0]/10">
                      <cap.icon className="h-5 w-5 text-[#4080E0]" strokeWidth={1.5} />
                    </div>
                    <h3 className="mt-7 text-xl font-semibold tracking-tight text-white">
                      {cap.title}
                    </h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-white/72">
                      {cap.description}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Third card — full width, horizontal layout */}
              {capabilities[2] && (() => {
                const ThirdIcon = capabilities[2].icon
                return (
                  <motion.div
                    {...fadeUp}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.18 }}
                    className="group relative col-span-full overflow-visible rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-8 backdrop-blur-md transition-colors duration-300 hover:border-[#4080E0]/50 sm:p-10"
                  >
                    <div className="pointer-events-none absolute inset-0 hidden group-hover:block">
                      <div className="absolute -left-[3px] -top-[3px] h-4 w-4 border-l-2 border-t-2 border-[#4080E0] rounded-tl" />
                      <div className="absolute -right-[3px] -top-[3px] h-4 w-4 border-r-2 border-t-2 border-[#4080E0] rounded-tr" />
                      <div className="absolute -left-[3px] -bottom-[3px] h-4 w-4 border-l-2 border-b-2 border-[#4080E0] rounded-bl" />
                      <div className="absolute -right-[3px] -bottom-[3px] h-4 w-4 border-r-2 border-b-2 border-[#4080E0] rounded-br" />
                    </div>
                    <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100 bg-gradient-to-br from-[#4080E0]/8 via-transparent to-transparent" />

                    <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-12">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#4080E0]/30 bg-[#4080E0]/10">
                        <ThirdIcon className="h-5 w-5 text-[#4080E0]" strokeWidth={1.5} />
                      </div>
                      <div className="sm:border-l sm:border-[#4080E0]/15 sm:pl-12">
                        <h3 className="text-xl font-semibold tracking-tight text-white">
                          {capabilities[2].title}
                        </h3>
                        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-white/72">
                          {capabilities[2].description}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )
              })()}
            </div>
          </div>
        </section>

        {/* 3 — How we work — giant number behind each step */}
        <section className="border-t border-[#4080E0]/10 py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-20 max-w-2xl">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#4080E0]">02</p>
              <h2 className="border-none pb-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {content.processTitle[language]}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">
                {content.processSubtitle[language]}
              </p>
            </motion.div>

            <ol className="space-y-3">
              {processSteps.map((item, index) => (
                <motion.li
                  key={item.step}
                  {...fadeUp}
                  transition={{ duration: 0.55, ease: EASE, delay: index * 0.07 }}
                  className="group relative overflow-hidden rounded-2xl border border-[#4080E0]/15 bg-[#020d1c]/60 backdrop-blur-sm transition-all duration-300 hover:border-[#4080E0]/45 hover:bg-[#020d1c]/80"
                >
                  {/* Giant ghost number */}
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 select-none font-bold leading-none text-[#4080E0]/[0.06] transition-all duration-300 group-hover:text-[#4080E0]/[0.10]"
                    style={{ fontSize: 'clamp(5rem, 12vw, 9rem)' }}
                  >
                    {item.step}
                  </span>

                  {/* Left accent bar */}
                  <div className="absolute left-0 top-0 h-full w-[3px] rounded-l-2xl bg-[#4080E0]/0 transition-colors duration-300 group-hover:bg-[#4080E0]/60" />

                  <div className="relative z-10 grid grid-cols-1 gap-4 px-8 py-8 sm:grid-cols-[5rem_1fr_2fr] sm:items-center sm:gap-10 sm:px-10 sm:py-10">
                    {/* Step number badge */}
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[#4080E0]/30 bg-[#4080E0]/10 font-mono text-sm font-semibold text-[#4080E0] transition-colors duration-300 group-hover:border-[#4080E0]/60 group-hover:bg-[#4080E0]/20">
                      {item.step}
                    </div>
                    <h3 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                      {item.title}
                    </h3>
                    <p className="text-[15px] leading-relaxed text-white/72 sm:text-base">
                      {item.description}
                    </p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 — Our work — hover-reveal dimming grid */}
        <section id="portfolio" className="scroll-mt-20 border-t border-[#4080E0]/10 py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 max-w-2xl">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#4080E0]">03</p>
              <h2 className="border-none pb-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {content.portfolioTitle[language]}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">
                {content.portfolioSubtitle[language]}
              </p>
            </motion.div>

            {/* Combined grid — hover-reveal: hovering any card dims the rest */}
            {(featuredWebsites.length > 0 || regularWebsites.length > 0) && (
              <motion.div
                {...fadeUp}
                className="group grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
              >
                {[...featuredWebsites, ...regularWebsites].map((site, index) => (
                  <a
                    key={site.id}
                    href={`/preview/${site.id}`}
                    className={[
                      'relative overflow-hidden rounded-2xl bg-[#020d1c]/70 backdrop-blur-sm',
                      'cursor-pointer transition-all duration-500',
                      // All cards dim when group is hovered; hovered card snaps back
                      'group-hover:opacity-50 group-hover:scale-[0.98] group-hover:blur-[1px]',
                      'hover:!opacity-100 hover:!scale-[1.02] hover:!blur-none',
                      // Prominent ring on focus / hover
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]',
                      // Taller aspect for featured
                      featuredWebsites.includes(site) ? 'sm:col-span-1' : '',
                    ].join(' ')}
                  >
                    {/* Image */}
                    <div className={featuredWebsites.includes(site) ? 'aspect-[4/3]' : 'aspect-[4/3]'}>
                      {site.image ? (
                        <img
                          src={site.image}
                          alt={site.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.05]"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-[#4080E0]/20 to-[#002040]/40" />
                      )}
                    </div>

                    {/* Gradient overlay — always shown */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#010814]/90 via-[#010814]/30 to-transparent" />

                    {/* Blue glow on hover */}
                    <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/0 transition-all duration-300 hover:ring-[#4080E0]/40" />

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-[#80A0E0]">
                        {site.category}
                      </p>
                      <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-white">
                        {site.title}
                      </h3>
                      {featuredWebsites.includes(site) && site.description && (
                        <p className="mt-1 line-clamp-1 text-sm text-white/70">
                          {site.description}
                        </p>
                      )}
                    </div>

                    {/* Arrow pill — appears on hover */}
                    <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-white/10 bg-[#010814]/70 px-3 py-1.5 opacity-0 backdrop-blur-sm transition-opacity duration-300 hover:opacity-100">
                      <ArrowUpRight className="h-3.5 w-3.5 text-[#4080E0]" />
                      <span className="text-[11px] font-medium text-white/70">View</span>
                    </div>
                  </a>
                ))}
              </motion.div>
            )}
          </div>
        </section>

        {/* 5 — Why IGANI */}
        <section id="about" className="scroll-mt-20 border-t border-[#4080E0]/10 py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-14 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
              <motion.div {...fadeUp}>
                <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#4080E0]">04</p>
                <h2 className="border-none pb-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  <T>{settings.aboutTitle}</T>
                </h2>
                  <p className="mt-6 text-lg leading-relaxed text-white/75">
                  <T>{settings.aboutDescription}</T>
                </p>
              </motion.div>

              <div className="space-y-2">
                {whyPillars.map((pillar, index) => (
                  <motion.div
                    key={pillar.title}
                    {...fadeUp}
                    transition={{ duration: 0.55, ease: EASE, delay: index * 0.08 }}
                    className="rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-7 backdrop-blur-sm"
                  >
                    <h3 className="text-lg font-semibold tracking-tight text-white">
                      <span className="text-[#4080E0]">—</span>{' '}{pillar.title}
                    </h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/72">
                      {pillar.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>

            {featuredTestimonials.length > 0 && (
              <div className="mt-20 grid gap-6 md:grid-cols-3">
                {featuredTestimonials.map((testimonial, index) => (
                  <motion.figure
                    key={testimonial.id}
                    {...fadeUp}
                    transition={{ duration: 0.55, ease: EASE, delay: index * 0.08 }}
                    className="flex flex-col rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-7 backdrop-blur-sm"
                  >
                    <div className="flex items-center gap-1" aria-label={`${testimonial.rating} out of 5 stars`}>
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${i < testimonial.rating ? 'fill-[#4080E0] text-[#4080E0]' : 'text-white/20'}`}
                        />
                      ))}
                    </div>
                    <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-white/70">
                      &ldquo;{testimonial.message}&rdquo;
                    </blockquote>
                    <figcaption className="mt-6 text-sm">
                      <span className="font-semibold text-white">{testimonial.name}</span>
                      <span className="block text-white/60">
                        {testimonial.role}{testimonial.company ? ` · ${testimonial.company}` : ''}
                      </span>
                    </figcaption>
                  </motion.figure>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* 6 — Contact */}
        <section id="contact" className="scroll-mt-20 border-t border-[#4080E0]/10 py-28 sm:py-36">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <motion.div {...fadeUp} className="mb-16 max-w-2xl">
              <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#4080E0]">05</p>
              <h2 className="border-none pb-0 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                {content.contactTitle[language]}
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-white/75">
                {content.contactSubtitle[language]}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_1.4fr]">
              {/* Contact info */}
              <motion.div {...fadeUp} className="order-2 lg:order-1">
                <div className="space-y-3">
                  {[
                    { icon: Mail, label: 'Email', value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
                    { icon: Phone, label: 'Phone', value: settings.contactPhone, href: `tel:${settings.contactPhone?.replace(/\s/g, '')}` },
                    { icon: MapPin, label: 'Location', value: settings.contactLocation, href: undefined },
                  ].map((contact) => {
                    const inner = (
                      <>
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#4080E0]/30 bg-[#4080E0]/10">
                          <contact.icon className="h-5 w-5 text-[#4080E0]" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/55">{contact.label}</p>
                          <p className="mt-1 text-[15px] text-white">{contact.value}</p>
                        </div>
                      </>
                    )
                    return contact.href ? (
                      <a
                        key={contact.label}
                        href={contact.href}
                        className="flex items-center gap-4 rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-5 backdrop-blur-sm transition-colors hover:border-[#4080E0]/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
                      >
                        {inner}
                      </a>
                    ) : (
                      <div
                        key={contact.label}
                        className="flex items-center gap-4 rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-5 backdrop-blur-sm"
                      >
                        {inner}
                      </div>
                    )
                  })}
                </div>
              </motion.div>

              {/* Form */}
              <motion.div {...fadeUp} className="order-1 lg:order-2">
                <div className="relative">
                  <form
                    onSubmit={handleSubmit}
                    className="space-y-6 rounded-2xl border border-[#4080E0]/20 bg-[#020d1c]/80 p-7 backdrop-blur-sm sm:p-9"
                  >
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">{content.firstName[language]}</label>
                        <input
                          type="text"
                          name="firstName"
                          value={formData.firstName}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-[#4080E0]/20 bg-[#010814]/60 px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]"
                          required
                        />
                      </div>
                      <div>
                        <label className="mb-2 block text-sm font-medium text-white/80">{content.lastName[language]}</label>
                        <input
                          type="text"
                          name="lastName"
                          value={formData.lastName}
                          onChange={handleInputChange}
                          className="w-full rounded-lg border border-[#4080E0]/20 bg-[#010814]/60 px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">{content.email[language]}</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-[#4080E0]/20 bg-[#010814]/60 px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]"
                        required
                      />
                    </div>
                    <PhoneInput
                      value={formData.phone}
                      onChange={(val) => setFormData(f => ({ ...f, phone: val }))}
                      error={phoneError}
                      required
                    />
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">{content.projectType[language]}</label>
                      <select
                        name="projectType"
                        value={formData.projectType}
                        onChange={handleInputChange}
                        className="w-full rounded-lg border border-[#4080E0]/20 bg-[#010814]/60 px-4 py-3 text-white transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]"
                      >
                        <option>Landing Page</option>
                        <option>Small Business Website</option>
                        <option>Premium Brand Site</option>
                        <option>E-commerce Website</option>
                        <option>Custom Web App</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-white/80">{content.projectDetails[language]}</label>
                      <textarea
                        rows={5}
                        name="message"
                        value={formData.message}
                        onChange={handleInputChange}
                        className="w-full resize-none rounded-lg border border-[#4080E0]/20 bg-[#010814]/60 px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]"
                        placeholder={content.projectDetailsPlaceholder[language]}
                        required
                      ></textarea>
                    </div>

                    {submitStatus === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-400"
                      >
                        {content.errorMessage[language]}
                      </motion.div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4080E0] px-7 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Send className="h-4 w-4" />
                      {isSubmitting ? content.submitting[language] : content.submitButton[language]}
                    </button>
                  </form>

                  {submitStatus === 'success' && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl p-3 sm:p-4">
                      <div className="absolute inset-0 rounded-2xl bg-[#010814]/90 backdrop-blur-md" aria-hidden />
                      <div className="relative z-10 max-h-[min(92vh,calc(100%-0.5rem))] w-full overflow-y-auto">
                        <ContactInquirySuccess
                          onDismiss={() => setSubmitStatus('idle')}
                          submitAnotherLabel={content.inquirySuccessSubmitAnother[language]}
                          closeLabel={content.inquirySuccessCloseLabel[language]}
                          badge={content.inquirySuccessBadge[language]}
                          heading={content.inquirySuccessTitle[language]}
                          lead={content.inquirySuccessLead[language]}
                          bullets={[
                            content.inquirySuccessBullet1[language],
                            content.inquirySuccessBullet2[language],
                            content.inquirySuccessBullet3[language],
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <Footer />

      </ScrollBackground>
    </div>
  )
}
