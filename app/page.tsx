'use client'

import { useState, useEffect } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { IganiLogo } from '@/components/IganiLogo'
import {
  Hero,
  Services,
  HowWeWork,
  Community,
  FinalCTA,
  ProjectGrid,
  TestimonialsSection
} from '@/components/landing'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, saveContactSubmission, getTestimonials } from '@/lib/firestore'
import { siteContent } from '@/lib/i18n'
import { useLanguage } from '@/contexts/LanguageContext'
import type { Website, SiteSettings, Testimonial } from '@/types'

export default function HomePage() {
  const { language } = useLanguage()
  const content = siteContent.home
  const footer = siteContent.footer

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectType: 'Landing Page',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [projectsError, setProjectsError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setProjectsError(null)
        const [firebaseSettings, firebaseWebsites, firebaseTestimonials] = await Promise.all([
          getSettings(),
          getWebsites(),
          getTestimonials()
        ])
        if (firebaseSettings) setSettings(firebaseSettings)
        setWebsites(firebaseWebsites)
        setTestimonials(firebaseTestimonials)
      } catch (err) {
        console.error('Error loading data:', err)
        setWebsites([])
        setTestimonials([])
        setProjectsError('Unable to load projects.')
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')
    try {
      await saveContactSubmission(formData)
      setSubmitStatus('success')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        projectType: 'Landing Page',
        message: ''
      })
    } catch {
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setSubmitStatus('idle'), 4000)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 font-sans">
      <Header />

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <Hero settings={settings} />
        <Services />
        <ProjectGrid
          websites={websites}
          isLoading={isLoading}
          error={projectsError}
          title={content.portfolioTitle[language]}
          subtitle={content.portfolioSubtitle[language]}
        />
        <HowWeWork />
        <Community />
        <TestimonialsSection testimonials={testimonials} />

        {/* Contact section */}
        <section id="contact" className="landing-section scroll-mt-20" aria-label="Contact">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {content.contactTitle[language]}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {content.contactSubtitle[language]}
            </p>
            <div className="mt-10 grid gap-10 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <h3 className="text-lg font-medium text-foreground">
                  {content.contactInfo[language]}
                </h3>
                <ul className="mt-4 space-y-4">
                  {[
                    { icon: Mail, label: 'Email', value: settings.contactEmail },
                    { icon: Phone, label: 'Phone', value: settings.contactPhone },
                    { icon: MapPin, label: 'Location', value: settings.contactLocation }
                  ].map(({ icon: Icon, label, value }) => (
                    <li key={label} className="flex items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <div>
                        <span className="text-sm font-medium text-foreground">{label}</span>
                        <p className="text-sm text-muted-foreground">{value}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                <form
                  onSubmit={handleSubmit}
                  className="glass-card space-y-4 p-6 sm:p-8"
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-foreground">
                        {content.firstName[language]}
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-foreground">
                        {content.lastName[language]}
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                      {content.email[language]}
                    </label>
                    <input
                      id="email"
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label htmlFor="projectType" className="block text-sm font-medium text-foreground">
                      {content.projectType[language]}
                    </label>
                    <select
                      id="projectType"
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option>Landing Page</option>
                      <option>Small Business Website</option>
                      <option>Premium Brand Site</option>
                      <option>E-commerce Website</option>
                      <option>Custom Web App</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-foreground">
                      {content.projectDetails[language]}
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={4}
                      value={formData.message}
                      onChange={handleInputChange}
                      required
                      placeholder={content.projectDetailsPlaceholder[language]}
                      className="mt-1.5 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {submitStatus === 'success' && (
                    <p className="rounded-lg bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                      {content.successMessage[language]}
                    </p>
                  )}
                  {submitStatus === 'error' && (
                    <p className="rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                      {content.errorMessage[language]}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmitting ? content.submitting[language] : content.submitButton[language]}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        <FinalCTA />
      </main>

      <footer className="border-t border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <IganiLogo className="h-9 w-auto" />
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                {settings.tagline}
              </p>
            </div>
            <div className="text-center sm:text-right">
              <p className="text-sm text-muted-foreground">
                © {new Date().getFullYear()} {settings.siteName}. {footer.allRightsReserved[language]}
              </p>
              <div className="mt-2 flex flex-wrap justify-center gap-4 sm:justify-end">
                <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  {footer.privacy[language]}
                </a>
                <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  {footer.terms[language]}
                </a>
                <a href="/contact" className="text-sm text-muted-foreground hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                  {footer.contact[language]}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
