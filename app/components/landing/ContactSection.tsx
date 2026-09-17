'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Mail, MapPin, Phone, Send } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { siteContent } from '@/lib/i18n'
import { landingContent } from '@/lib/landingContent'
import { getWhatsAppChatHref } from '@/lib/siteSocial'
import { useSiteSettings } from '@/hooks/useSiteSettings'
import { SiteSettings } from '@/types'
import PhoneInput, { validatePhone } from '@/components/PhoneInput'
import { ContactInquirySuccess } from '@/components/ContactInquirySuccess'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { SectionHeading } from './fx/SectionHeading'
import { SpotlightCard } from './fx/SpotlightCard'

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'

export function ContactSection({ settings }: { settings: SiteSettings }) {
  const { language } = useLanguage()
  const content = siteContent.home
  const c = landingContent.contact
  const { settings: social } = useSiteSettings()
  const whatsappHref = getWhatsAppChatHref(social, siteContent.navigation.whatsappPrefillMessage[language])

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    projectType: 'Landing Page',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [phoneError, setPhoneError] = useState('')

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
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
        body: JSON.stringify(formData),
      })
      await res.json().catch(() => ({}))
      if (!res.ok) {
        setSubmitStatus('error')
        setTimeout(() => setSubmitStatus('idle'), 5000)
        return
      }
      setSubmitStatus('success')
      setFormData({ firstName: '', lastName: '', email: '', phone: '', projectType: 'Landing Page', message: '' })
    } catch (error) {
      console.error('Form submission failed:', error)
      setSubmitStatus('error')
      setTimeout(() => setSubmitStatus('idle'), 5000)
    } finally {
      setIsSubmitting(false)
    }
  }

  const contacts = [
    { icon: Mail, label: 'Email', value: settings.contactEmail, href: `mailto:${settings.contactEmail}` },
    { icon: Phone, label: 'Phone', value: settings.contactPhone, href: `tel:${settings.contactPhone?.replace(/\s/g, '')}` },
    { icon: MapPin, label: 'Location', value: settings.contactLocation, href: undefined },
  ]

  return (
    <section id="contact" className="relative scroll-mt-20 border-t border-white/[0.06] py-20 sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 right-0 h-[600px] w-[600px] rounded-full bg-[#4080E0]/12 blur-[160px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          index={c.index}
          label={c.label[language]}
          aside={c.aside[language]}
          title={c.title[language]}
          sub={c.sub[language]}
          className="mb-12"
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1.5fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="order-2 grid content-start gap-3 lg:order-1"
          >
            {/* WhatsApp first: it's how most people actually reach us */}
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]"
            >
              <SpotlightCard intensity={0.3}>
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#25D366]/15 text-[#5ee39a]">
                    <WhatsAppGlyph className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="font-display block text-lg leading-tight text-[#dbe6ff]">{c.whatsappLead[language]}</span>
                    <span className="mt-1 block text-sm text-white/60">{c.whatsappCta[language]}</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-white/40" />
                </div>
              </SpotlightCard>
            </a>

            {contacts.map((item) => {
              const inner = (
                <div className="flex items-center gap-4 p-5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03]">
                    <item.icon className="h-5 w-5 text-[#9ec0f5]" strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs text-white/45">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[15px] text-white">{item.value}</span>
                  </div>
                </div>
              )
              return item.href ? (
                <a key={item.label} href={item.href} className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0]">
                  <SpotlightCard intensity={0.2}>{inner}</SpotlightCard>
                </a>
              ) : (
                <SpotlightCard key={item.label} intensity={0.2}>
                  {inner}
                </SpotlightCard>
              )
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="order-1 lg:order-2"
          >
            <SpotlightCard intensity={0.12} className="relative">
              <form onSubmit={handleSubmit} className="space-y-5 p-7 sm:p-9">
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">{content.firstName[language]}</label>
                    <input type="text" name="firstName" value={formData.firstName} onChange={handleInputChange} className={INPUT} required />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-white/80">{content.lastName[language]}</label>
                    <input type="text" name="lastName" value={formData.lastName} onChange={handleInputChange} className={INPUT} required />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">{content.email[language]}</label>
                  <input type="email" name="email" value={formData.email} onChange={handleInputChange} className={INPUT} required />
                </div>
                <PhoneInput
                  value={formData.phone}
                  onChange={(val) => setFormData((f) => ({ ...f, phone: val }))}
                  error={phoneError}
                  required
                />
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">{content.projectType[language]}</label>
                  <select name="projectType" value={formData.projectType} onChange={handleInputChange} className={INPUT}>
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
                    className={`${INPUT} resize-none`}
                    placeholder={content.projectDetailsPlaceholder[language]}
                    required
                  />
                </div>

                {submitStatus === 'error' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-300"
                  >
                    {content.errorMessage[language]}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#04101e] transition-colors hover:bg-[#e6eefc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? content.submitting[language] : content.submitButton[language]}
                </button>
              </form>

              {submitStatus === 'success' && (
                <div className="absolute inset-0 z-30 flex items-center justify-center rounded-3xl p-3 sm:p-4">
                  <div className="absolute inset-0 rounded-3xl bg-[#030814]/92 backdrop-blur-md" aria-hidden />
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
            </SpotlightCard>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
