'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { HelpCircle, Send, ArrowLeft, MessageSquare, AlertCircle } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { IganiLogo } from '@/components/IganiLogo'

const ISSUE_TYPES = [
  { value: 'bug', label: 'Bug' },
  { value: 'something_not_working', label: 'Something not working' },
  { value: 'feedback', label: 'Feedback' },
  { value: 'feature_request', label: 'Feature request' }
] as const

const PRODUCTS = [
  { value: 'AlmaLinks', label: 'AlmaLinks' },
  { value: 'Igani', label: 'Igani' },
  { value: 'Other', label: 'Other' }
] as const

export default function HelpPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    product: 'AlmaLinks',
    issueType: 'feedback',
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

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!form.email.trim()) next.email = 'Please enter your email.'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Please enter a valid email address.'
    if (!form.description.trim()) next.description = 'Please describe what happened.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setIsSubmitting(true)
    setErrors({})

    try {
      const body: Record<string, string> = {
        name: form.name.trim(),
        email: form.email.trim(),
        product: form.product,
        issueType: form.issueType,
        description: form.description.trim()
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
        setErrors({ form: data.error || 'Something went wrong. Please try again.' })
        return
      }
      setSubmitted(true)
      setForm({
        name: '',
        email: '',
        product: 'AlmaLinks',
        issueType: 'feedback',
        description: '',
        stepsToReproduce: '',
        pageOrFeature: '',
        deviceType: '',
        browser: ''
      })
      setAttachment(null)
    } catch (err) {
      setErrors({ form: 'Something went wrong. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <StarryBackground />
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      <Header showBackButton backButtonText="Back to Home" backButtonHref="/" />

      <div className="relative z-10 pt-28 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Branding */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <IganiLogo className="w-36 h-12 text-white" />
          </motion.div>

          {/* Header / intro */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-10"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <HelpCircle className="w-10 h-10 text-cyan-400" />
              Help & Support
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed mb-4">
              Igani builds products like <strong className="text-white">AlmaLinks</strong>. AlmaLinks is
              currently in <strong className="text-cyan-400">beta</strong>, and your feedback and bug reports
              directly help us improve the platform. We really appreciate you taking the time to reach out.
            </p>
            <p className="text-slate-400">
              All submissions are read by our team—we don’t send these to an external system or email; they go
              straight into our admin panel so we can follow up.
            </p>
          </motion.section>

          {/* Product context */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-8"
          >
            <p className="text-cyan-200 font-medium flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Reporting an issue with AlmaLinks?
            </p>
            <p className="text-slate-400 text-sm mt-1">
              AlmaLinks issues are handled right here. Choose &quot;AlmaLinks&quot; in the form below (or leave it as default).
            </p>
          </motion.section>

          {submitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 text-center"
            >
              <p className="text-xl text-white mb-2">
                Thanks for reporting this.
              </p>
              <p className="text-slate-300">
                Our team has received it and will take a look.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-6 px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-colors"
              >
                Submit another
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="help-name" className="block text-sm font-medium text-slate-300 mb-1">
                    Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="help-name"
                    name="name"
                    type="text"
                    required
                    value={form.name}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="Your name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'help-name-err' : undefined}
                  />
                  {errors.name && (
                    <p id="help-name-err" className="mt-1 text-sm text-red-400">{errors.name}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="help-email" className="block text-sm font-medium text-slate-300 mb-1">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    id="help-email"
                    name="email"
                    type="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="you@example.com"
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'help-email-err' : undefined}
                  />
                  {errors.email && (
                    <p id="help-email-err" className="mt-1 text-sm text-red-400">{errors.email}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="help-product" className="block text-sm font-medium text-slate-300 mb-1">
                  Product <span className="text-red-400">*</span>
                </label>
                <select
                  id="help-product"
                  name="product"
                  required
                  value={form.product}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  aria-describedby="help-product-desc"
                >
                  {PRODUCTS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
                <p id="help-product-desc" className="mt-1 text-xs text-slate-500">
                  Default: AlmaLinks. Change if you’re reporting for another Igani product.
                </p>
              </div>

              <div>
                <label htmlFor="help-issueType" className="block text-sm font-medium text-slate-300 mb-1">
                  Issue type <span className="text-red-400">*</span>
                </label>
                <select
                  id="help-issueType"
                  name="issueType"
                  required
                  value={form.issueType}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  {ISSUE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="help-description" className="block text-sm font-medium text-slate-300 mb-1">
                  Description <span className="text-red-400">*</span>
                </label>
                <textarea
                  id="help-description"
                  name="description"
                  required
                  rows={4}
                  value={form.description}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y min-h-[100px]"
                  placeholder="What happened? What did you expect to happen?"
                  aria-invalid={!!errors.description}
                  aria-describedby={errors.description ? 'help-desc-err' : 'help-desc-placeholder'}
                />
                <p id="help-desc-placeholder" className="mt-1 text-xs text-slate-500">
                  What happened? What did you expect to happen?
                </p>
                {errors.description && (
                  <p id="help-desc-err" className="mt-1 text-sm text-red-400">{errors.description}</p>
                )}
              </div>

              <div>
                <label htmlFor="help-steps" className="block text-sm font-medium text-slate-300 mb-1">
                  Steps to reproduce <span className="text-slate-500">(optional)</span>
                </label>
                <textarea
                  id="help-steps"
                  name="stepsToReproduce"
                  rows={2}
                  value={form.stepsToReproduce}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-y"
                  placeholder="1. Go to... 2. Click..."
                />
              </div>

              <div>
                <label htmlFor="help-page" className="block text-sm font-medium text-slate-300 mb-1">
                  Page or feature where it occurred <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="help-page"
                  name="pageOrFeature"
                  type="text"
                  value={form.pageOrFeature}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="e.g. Dashboard, Settings, Event page"
                />
              </div>

              <div>
                <label htmlFor="help-attachment" className="block text-sm font-medium text-slate-300 mb-1">
                  Screenshot or screen recording <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  id="help-attachment"
                  name="attachment"
                  type="file"
                  accept="image/*,.png,.jpg,.jpeg,.gif,.webp,video/*,.mp4,.webm"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-cyan-600 file:text-white file:text-sm"
                  aria-describedby="help-attachment-desc"
                />
                <p id="help-attachment-desc" className="mt-1 text-xs text-slate-500">
                  Max 10 MB. Images or short screen recordings help us debug.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="help-device" className="block text-sm font-medium text-slate-300 mb-1">
                    Device <span className="text-slate-500">(optional)</span>
                  </label>
                  <select
                    id="help-device"
                    name="deviceType"
                    value={form.deviceType}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  >
                    <option value="">Select</option>
                    <option value="desktop">Desktop</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="help-browser" className="block text-sm font-medium text-slate-300 mb-1">
                    Browser <span className="text-slate-500">(optional)</span>
                  </label>
                  <input
                    id="help-browser"
                    name="browser"
                    type="text"
                    value={form.browser}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    placeholder="e.g. Chrome, Safari"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-900"
                >
                  {isSubmitting ? (
                    'Sending…'
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Submit
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
