'use client'

import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle, Send, MessageSquare, AlertCircle } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { IganiLogo } from '@/components/IganiLogo'
import type { HelpProductConfig } from '@/lib/help-product-config'

interface HelpPageTemplateProps {
  config: HelpProductConfig
  sourceUrl: string
}

const TEXT = {
  en: {
    back: '← Back',
    poweredBy: 'Powered by Igani',
    reportingIssue: (name: string) => `Reporting an issue with ${name}?`,
    reportTagged: (name: string) => `Your report will be tagged for ${name} and sent to our team.`,
    thanks: 'Thanks for reporting this.',
    teamReceived: 'Our team has received it and will take a look.',
    submitAnother: 'Submit another',
    errorSomethingWrong: 'Something went wrong. Please try again.',
    labelName: 'Name',
    labelEmail: 'Email',
    labelPhone: 'Phone',
    labelIssueType: 'Issue type',
    labelDescription: 'Description',
    labelSteps: 'Steps to reproduce',
    labelPage: 'Page or feature where it occurred',
    labelAttachment: 'Screenshot or screen recording',
    labelDevice: 'Device',
    labelBrowser: 'Browser',
    optional: '(optional)',
    placeholderName: 'Your name',
    placeholderEmail: 'you@example.com',
    placeholderPhone: '+1 555 000 0000',
    placeholderDescription: 'What happened? What did you expect to happen?',
    placeholderSteps: '1. Go to... 2. Click...',
    placeholderPage: 'e.g. Dashboard, Settings',
    placeholderBrowser: 'e.g. Chrome, Safari',
    selectDevice: 'Select',
    deviceDesktop: 'Desktop',
    deviceMobile: 'Mobile',
    maxFileSize: 'Max 10 MB.',
    submitButton: 'Submit',
    submitting: 'Sending…',
    validName: 'Please enter your name.',
    validEmail: 'Please enter your email.',
    validEmailFormat: 'Please enter a valid email address.',
    validPhone: 'Please enter your phone number.',
    validDescription: 'Please describe what happened.',
  },
  he: {
    back: 'חזרה →',
    poweredBy: 'מופעל על ידי Igani',
    reportingIssue: (name: string) => `מדווח על בעיה עם ${name}?`,
    reportTagged: (name: string) => `הדיווח שלך יסומן עבור ${name} וישלח לצוות שלנו.`,
    thanks: 'תודה על הדיווח.',
    teamReceived: 'הצוות שלנו קיבל את הדיווח ויבדוק אותו.',
    submitAnother: 'שלח דיווח נוסף',
    errorSomethingWrong: 'משהו השתבש. נסה שוב.',
    labelName: 'שם',
    labelEmail: 'אימייל',
    labelPhone: 'טלפון',
    labelIssueType: 'סוג הבעיה',
    labelDescription: 'תיאור',
    labelSteps: 'שלבים לשחזור הבעיה',
    labelPage: 'עמוד או תכונה שבהם הבעיה אירעה',
    labelAttachment: 'צילום מסך או הקלטת מסך',
    labelDevice: 'מכשיר',
    labelBrowser: 'דפדפן',
    optional: '(אופציונלי)',
    placeholderName: 'שמך',
    placeholderEmail: 'you@example.com',
    placeholderPhone: '+972 50 000 0000',
    placeholderDescription: 'מה קרה? מה ציפית שיקרה?',
    placeholderSteps: '1. עבור ל... 2. לחץ על...',
    placeholderPage: 'לדוגמה: לוח בקרה, הגדרות',
    placeholderBrowser: 'לדוגמה: Chrome, Safari',
    selectDevice: 'בחר',
    deviceDesktop: 'מחשב',
    deviceMobile: 'נייד',
    maxFileSize: 'גודל מקסימלי 10 MB.',
    submitButton: 'שלח',
    submitting: 'שולח…',
    validName: 'נא להזין שם.',
    validEmail: 'נא להזין אימייל.',
    validEmailFormat: 'נא להזין כתובת אימייל תקינה.',
    validPhone: 'נא להזין מספר טלפון.',
    validDescription: 'נא לתאר מה קרה.',
  },
} as const

export function HelpPageTemplate({ config, sourceUrl }: HelpPageTemplateProps) {
  const locale = config.locale ?? 'en'
  const t = TEXT[locale]
  const isRtl = locale === 'he'

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    issueType: config.issueCategories?.[0]?.value ?? 'feedback',
    description: '',
    stepsToReproduce: '',
    pageOrFeature: '',
    deviceType: '',
    browser: ''
  })
  const [attachment, setAttachment] = useState<File | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = t.validName
    if (!form.email.trim()) next.email = t.validEmail
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = t.validEmailFormat
    if (!form.phone.trim()) next.phone = t.validPhone
    if (!form.description.trim()) next.description = t.validDescription
    setErrors(next)
    return Object.keys(next).length === 0
  }, [form.name, form.email, form.phone, form.description, t])

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target
      setForm((prev) => ({ ...prev, [name]: value }))
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
    },
    [errors]
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    setErrors({})

    const referrer = typeof document !== 'undefined' ? document.referrer || '' : ''
    const urlToSend = (typeof window !== 'undefined' && window.location?.href) ? window.location.href : sourceUrl

    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        product: config.defaultProductValue,
        productSlug: config.productSlug,
        productName: config.productName,
        issueType: form.issueType,
        description: form.description.trim(),
        sourceUrl: urlToSend,
        referrer
      }
      if (form.stepsToReproduce.trim()) body.stepsToReproduce = form.stepsToReproduce.trim()
      if (form.pageOrFeature.trim()) body.pageOrFeature = form.pageOrFeature.trim()
      if (form.deviceType) body.deviceType = form.deviceType
      if (form.browser.trim()) body.browser = form.browser.trim()

      let res: Response
      if (attachment && attachment.size > 0) {
        const formData = new FormData()
        Object.entries(body).forEach(([k, v]) => formData.append(k, v))
        formData.append('attachment', attachment)
        res = await fetch('/api/help', { method: 'POST', body: formData })
      } else {
        res = await fetch('/api/help', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      }

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setErrors({ form: data.error || t.errorSomethingWrong })
        return
      }
      setSubmitted(true)
      setForm({
        name: '',
        email: '',
        phone: '',
        issueType: config.issueCategories?.[0]?.value ?? 'feedback',
        description: '',
        stepsToReproduce: '',
        pageOrFeature: '',
        deviceType: '',
        browser: ''
      })
      setAttachment(null)
    } catch {
      setErrors({ form: t.errorSomethingWrong })
    } finally {
      setIsSubmitting(false)
    }
  }

  const categories = config.issueCategories?.length
    ? config.issueCategories
    : [
        { value: 'bug', label: 'Bug' },
        { value: 'something_not_working', label: 'Something not working' },
        { value: 'feedback', label: 'Feedback' },
        { value: 'feature_request', label: 'Feature request' }
      ]

  const inputClass = 'w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent'

  return (
    <div className="min-h-screen bg-slate-900 relative" dir={isRtl ? 'rtl' : 'ltr'}>
      <StarryBackground />
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      {/* Minimal top: no main nav, just back */}
      <div className="relative z-10 pt-8 pb-4 px-4 flex justify-between items-center max-w-2xl mx-auto">
        <a href="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          {t.back}
        </a>
        <span className="text-slate-500 text-xs">{t.poweredBy}</span>
      </div>

      <div className="relative z-10 pt-4 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Branding: top logo only for products that don't have a partnership block */}
          {config.productSlug !== 'almalinks' && config.productSlug !== 'callmap' && config.productSlug !== 'caleno' && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center mb-8"
            >
              {config.logoPath ? (
                <img
                  src={config.logoPath}
                  alt={config.productName}
                  className="h-12 w-auto object-contain"
                />
              ) : (
                <IganiLogo className="w-36 h-12 text-white" />
              )}
            </motion.div>
          )}

          {/* Igani × Alma Links partnership in liquid glass (Alma Links help page only) */}
          {config.productSlug === 'almalinks' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mb-8 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)] p-6"
            >
              <div className="flex items-center justify-center gap-4">
                <IganiLogo className="w-24 h-8 text-white opacity-90" />
                <span className="text-slate-400 font-light text-lg" aria-hidden>×</span>
                <img src="/alma-logo.svg" alt="Alma Links" className="h-8 w-auto object-contain opacity-95" />
                <span className="sr-only">Igani and Alma Links partnership</span>
              </div>
            </motion.div>
          )}

          {/* Igani × Caleno partnership in liquid glass (Caleno help page only) */}
          {config.productSlug === 'caleno' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mb-8 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)] py-8 px-10"
            >
              <div className="flex items-center justify-center gap-8">
                {/* Igani */}
                <div className="flex flex-col items-center gap-2">
                  <IganiLogo className="w-36 h-12 text-white" />
                </div>

                {/* Divider */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-slate-400 text-2xl font-thin leading-none select-none" aria-hidden>×</span>
                </div>

                {/* Caleno */}
                <div className="flex flex-col items-center gap-2">
                  <img
                    src="/calenologo.png"
                    alt="Caleno"
                    className="h-12 w-auto object-contain"
                  />
                </div>

                <span className="sr-only">Igani and Caleno partnership</span>
              </div>
            </motion.div>
          )}

          {/* Igani × Callmap partnership in liquid glass (Callmap help page only) */}
          {config.productSlug === 'callmap' && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="mb-8 rounded-2xl border border-white/30 bg-white/15 backdrop-blur-xl shadow-[0_0_40px_-8px_rgba(255,255,255,0.15)] p-6"
            >
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center justify-center gap-4">
                  <IganiLogo className="w-24 h-8 text-white opacity-90" />
                  <span className="text-slate-400 font-light text-lg" aria-hidden>×</span>
                  {config.logoPath ? (
                    <img src={config.logoPath} alt="Callmap" className="h-8 w-auto object-contain opacity-95" />
                  ) : (
                    <span className="text-xl font-semibold text-white">Callmap</span>
                  )}
                  <span className="sr-only">Igani and Callmap partnership</span>
                </div>
                <p className="text-slate-400 text-sm">
                  For more info on Callmap, go to{' '}
                  <a href="https://callmap.ai" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                    callmap.ai
                  </a>
                </p>
              </div>
            </motion.div>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <HelpCircle className="w-10 h-10 text-cyan-400" />
              {config.introTitle}
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              {config.introBody}
            </p>
            {config.betaMessage && (
              <p className="text-cyan-400 font-medium">{config.betaMessage}</p>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-8"
          >
            <p className="text-cyan-200 font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              {t.reportingIssue(config.productName)}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {t.reportTagged(config.productName)}
            </p>
          </motion.section>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center"
            >
              <p className="text-xl text-white mb-2">{t.thanks}</p>
              <p className="text-slate-300">{t.teamReceived}</p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
              >
                {t.submitAnother}
              </button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit}
              className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 shadow-xl space-y-5"
            >
              {errors.form && (
                <div
                  role="alert"
                  className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  {errors.form}
                </div>
              )}

              <input type="hidden" name="product" value={config.defaultProductValue} />

              {/* Name + Email */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="help-name" className="block text-sm font-medium text-slate-300 mb-1">
                    {t.labelName} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="help-name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t.placeholderName}
                    aria-invalid={!!errors.name}
                  />
                  {errors.name && <p className="mt-1 text-sm text-red-400">{errors.name}</p>}
                </div>
                <div>
                  <label htmlFor="help-email" className="block text-sm font-medium text-slate-300 mb-1">
                    {t.labelEmail} <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="help-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t.placeholderEmail}
                    aria-invalid={!!errors.email}
                  />
                  {errors.email && <p className="mt-1 text-sm text-red-400">{errors.email}</p>}
                </div>
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="help-phone" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelPhone} <span className="text-red-400">*</span>
                </label>
                <input
                  id="help-phone"
                  name="phone"
                  type="tel"
                  required
                  value={form.phone}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder={t.placeholderPhone}
                  aria-invalid={!!errors.phone}
                  dir="ltr"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-400">{errors.phone}</p>}
              </div>

              {/* Issue type */}
              <div>
                <label htmlFor="help-issueType" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelIssueType} <span className="text-red-400">*</span>
                </label>
                <select
                  id="help-issueType"
                  name="issueType"
                  required
                  value={form.issueType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  {categories.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="help-description" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelDescription} <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="help-description"
                  name="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  className={`${inputClass} resize-y min-h-[100px]`}
                  placeholder={t.placeholderDescription}
                  aria-invalid={!!errors.description}
                />
                {errors.description && <p className="mt-1 text-sm text-red-400">{errors.description}</p>}
              </div>

              {/* Steps to reproduce */}
              <div>
                <label htmlFor="help-steps" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelSteps} <span className="text-slate-500">{t.optional}</span>
                </label>
                <textarea
                  id="help-steps"
                  name="stepsToReproduce"
                  rows={2}
                  value={form.stepsToReproduce}
                  onChange={handleChange}
                  className={`${inputClass} resize-y`}
                  placeholder={t.placeholderSteps}
                />
              </div>

              {/* Page or feature */}
              <div>
                <label htmlFor="help-page" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelPage} <span className="text-slate-500">{t.optional}</span>
                </label>
                <input
                  id="help-page"
                  name="pageOrFeature"
                  type="text"
                  value={form.pageOrFeature}
                  onChange={handleChange}
                  className={inputClass}
                  placeholder={t.placeholderPage}
                />
              </div>

              {/* Attachment */}
              <div>
                <label htmlFor="help-attachment" className="block text-sm font-medium text-slate-300 mb-1">
                  {t.labelAttachment} <span className="text-slate-500">{t.optional}</span>
                </label>
                <input
                  id="help-attachment"
                  name="attachment"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.gif,.webp,video/*,.mp4,.webm"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:text-sm"
                />
                <p className="mt-1 text-xs text-slate-500">{t.maxFileSize}</p>
              </div>

              {/* Device + Browser */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="help-device" className="block text-sm font-medium text-slate-300 mb-1">
                    {t.labelDevice} <span className="text-slate-500">{t.optional}</span>
                  </label>
                  <select
                    id="help-device"
                    name="deviceType"
                    value={form.deviceType}
                    onChange={handleChange}
                    className={inputClass}
                  >
                    <option value="">{t.selectDevice}</option>
                    <option value="desktop">{t.deviceDesktop}</option>
                    <option value="mobile">{t.deviceMobile}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="help-browser" className="block text-sm font-medium text-slate-300 mb-1">
                    {t.labelBrowser} <span className="text-slate-500">{t.optional}</span>
                  </label>
                  <input
                    id="help-browser"
                    name="browser"
                    type="text"
                    value={form.browser}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={t.placeholderBrowser}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {isSubmitting ? t.submitting : (<><Send className="w-5 h-5" /> {t.submitButton}</>)}
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>

      <div className="relative z-10 py-6 text-center">
        <p className="text-slate-600 text-xs">{t.poweredBy}</p>
      </div>
    </div>
  )
}
