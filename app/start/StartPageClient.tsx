'use client'

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, CheckCircle2, ClipboardList } from 'lucide-react'
import PhoneInput, { validatePhone } from '@/components/PhoneInput'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { PageIntro, PageShell, SerifAccent } from '@/app/components/landing/fx/PageShell'
import { SpotlightCard } from '@/app/components/landing/fx/SpotlightCard'

/** Where "start a project" WhatsApp chats go. */
const WHATSAPP_NUMBER = '972584477757'
const WHATSAPP_DISPLAY = '+972 58-447-7757'

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'

const EASE = [0.22, 1, 0.36, 1] as const

export default function StartPageClient() {
  const [mode, setMode] = useState<'choose' | 'form'>('choose')
  // Packages pass ?plan=<name> so we know what they were looking at
  const [plan, setPlan] = useState('')
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '' })
  const [phoneError, setPhoneError] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [submittedName, setSubmittedName] = useState('')
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPlan(new URLSearchParams(window.location.search).get('plan')?.trim() || '')
  }, [])

  useEffect(() => {
    if (mode === 'form') {
      window.setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120)
    }
  }, [mode])

  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    plan ? `Hi IGANI, I'd like to start a project (${plan}).` : "Hi IGANI, I'd like to start a project."
  )}`

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const localNumber = form.phone.replace(/^\+\d+\s*/, '')
    if (!validatePhone(localNumber)) {
      setPhoneError('Please enter a valid phone number.')
      return
    }
    setPhoneError('')
    setStatus('submitting')
    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          source: 'main_site',
          sourceDetails: { page: '/start', form: 'start_project', ...(plan ? { campaign: plan } : {}) },
          message: [
            'Start a project request',
            `Company: ${form.company.trim() || '—'}`,
            plan ? `Interested in: ${plan}` : '',
          ]
            .filter(Boolean)
            .join(' · '),
        }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      setSubmittedName(form.name.trim().split(' ')[0])
      setForm({ name: '', email: '', phone: '', company: '' })
      setStatus('success')
    } catch (error) {
      console.error('Start form submission failed:', error)
      setStatus('error')
    }
  }

  return (
    <PageShell>
      <PageIntro
        label="Start a project"
        aside="two ways in. pick the easier one."
        title="Let’s *start*."
        sub={
          <>
            Message us on WhatsApp for a quick chat, or leave your details and we&rsquo;ll come back to you.
            {plan && (
              <span className="mt-4 flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-sm text-white/80">
                Interested in <span className="font-semibold text-white">{plan}</span>
              </span>
            )}
          </>
        }
      />

      <section className="relative pb-24 sm:pb-32">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Step 1: choose how to talk */}
          <div className="grid gap-4 md:grid-cols-2">
            <motion.a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}
              className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4080E0]"
            >
              <SpotlightCard className="group h-full p-7 sm:p-9" intensity={0.3}>
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#25D366]/15 text-[#5ee39a]">
                      <WhatsAppGlyph className="h-7 w-7" />
                    </span>
                    <ArrowUpRight className="h-5 w-5 text-white/40 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" />
                  </div>
                  <h2 className="mt-10 border-none pb-0 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                    <SerifAccent text="Talk on *WhatsApp*" />
                  </h2>
                  <p className="!mt-3 text-[15px] leading-relaxed text-white/65">
                    The quickest way in. Tell us what you&rsquo;re building and you&rsquo;re talking to a founder, not a form.
                  </p>
                  <p className="!mt-8 text-sm tabular-nums text-white/85">{WHATSAPP_DISPLAY}</p>
                </div>
              </SpotlightCard>
            </motion.a>

            <motion.button
              type="button"
              onClick={() => setMode('form')}
              aria-expanded={mode === 'form'}
              aria-controls="start-form"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
              className="block rounded-3xl text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#4080E0]"
            >
              <SpotlightCard
                className={`group h-full p-7 transition-colors sm:p-9 ${mode === 'form' ? '!border-[#4080E0]/60' : ''}`}
                intensity={0.3}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4080E0]/15 text-[#9ec0f5]">
                      <ClipboardList className="h-7 w-7" />
                    </span>
                    <ArrowRight
                      className={`h-5 w-5 text-white/40 transition-transform duration-300 group-hover:text-white ${
                        mode === 'form' ? 'rotate-90 text-white' : 'group-hover:translate-x-0.5'
                      }`}
                    />
                  </div>
                  <h2 className="mt-10 border-none pb-0 text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl">
                    <SerifAccent text="Leave your *details*" />
                  </h2>
                  <p className="!mt-3 text-[15px] leading-relaxed text-white/65">
                    Prefer we reach out? Four quick fields and we&rsquo;ll get back to you within a day.
                  </p>
                  <p className="!mt-8 text-sm text-white/85">Name · email · phone · company</p>
                </div>
              </SpotlightCard>
            </motion.button>
          </div>

          {/* Step 2: the form, if they chose it */}
          <AnimatePresence>
            {mode === 'form' && (
              <motion.div
                id="start-form"
                ref={formRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="mt-6 scroll-mt-28"
              >
                <div className="grid gap-10 rounded-[28px] border border-white/[0.08] bg-[#061225]/85 p-6 shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] backdrop-blur-2xl sm:p-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-14">
                  <div>
                    <p className="!mt-0 flex items-baseline gap-3 text-sm text-white/55">
                      <span className="font-display text-lg text-white/70">02</span>
                      your details
                    </p>
                    <h3 className="mt-4 text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.02em] text-white sm:text-4xl">
                      <SerifAccent text="Tell us who you *are*." />
                    </h3>
                    <p className="!mt-4 text-[15px] leading-relaxed text-white/65">
                      We&rsquo;ll reply within a day with a few real questions about what you need. No sales script.
                    </p>
                  </div>

                  {status === 'success' ? (
                    <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
                      <CheckCircle2 className="h-10 w-10 text-[#4080E0]" />
                      <div className="mt-4 text-2xl font-semibold">
                        Thanks{submittedName ? `, ${submittedName}` : ''}
                        <span className="text-[#4080E0]">.</span>
                      </div>
                      <p className="!mt-2 max-w-xs text-white/65">We&rsquo;ve got your details and will be in touch within a day.</p>
                    </div>
                  ) : (
                    <form onSubmit={onSubmit} className="space-y-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div>
                          <label htmlFor="start-name" className="mb-2 block text-sm font-medium text-white/80">
                            Full name <span className="text-red-400">*</span>
                          </label>
                          <input id="start-name" name="name" value={form.name} onChange={onChange} required autoComplete="name" className={INPUT} />
                        </div>
                        <div>
                          <label htmlFor="start-company" className="mb-2 block text-sm font-medium text-white/80">
                            Company <span className="font-normal text-white/40">(optional)</span>
                          </label>
                          <input id="start-company" name="company" value={form.company} onChange={onChange} autoComplete="organization" className={INPUT} />
                        </div>
                      </div>
                      <div>
                        <label htmlFor="start-email" className="mb-2 block text-sm font-medium text-white/80">
                          Email <span className="text-red-400">*</span>
                        </label>
                        <input id="start-email" name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" className={INPUT} />
                      </div>
                      <PhoneInput value={form.phone} onChange={(val) => setForm((f) => ({ ...f, phone: val }))} error={phoneError} required />

                      {status === 'error' && (
                        <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-300">
                          Something went wrong. Message us on WhatsApp or email info@igani.co.
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={status === 'submitting'}
                        className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#04101e] shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-12px_rgba(64,128,224,0.9)] transition-colors hover:bg-[#e6eefc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {status === 'submitting' ? 'Sending…' : 'Send my details'}
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </PageShell>
  )
}
