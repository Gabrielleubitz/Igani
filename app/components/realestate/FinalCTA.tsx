'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { WhatsAppGlyph } from '@/components/SocialGlyphs'
import { caseStudy } from '@/lib/funnelCaseStudy'
import { WhoWeAre } from './WhoWeAre'
import { WHATSAPP_HREF } from './contact'

const MARQUEE = 'win the listing · capture the lead · own your brand · '

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'

const EMPTY = { website: '', name: '', email: '', phone: '' }

/** 06 — The bottom line: ask for a call back (or message us on WhatsApp), with who we are right below it. */
export function FinalCTA() {
  const [form, setForm] = useState(EMPTY)
  const [submittedName, setSubmittedName] = useState('')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const quote = caseStudy.quote

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      // Leads are stored on the main domain
      const apiUrl = window.location.hostname.includes('funnels.') ? 'https://www.igani.co/api/leads' : '/api/leads'
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          source: 'landing_page',
          sourceDetails: { page: '/realestate', form: 'call_back', campaign: 'real_estate' },
          message: `Call-back request (real estate agent) — website: ${form.website.trim()}. Call them back.`,
        }),
      })
      if (response.ok) {
        setStatus('success')
        setSubmittedName(form.name.trim().split(' ')[0])
        setForm(EMPTY)
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error('Form submission failed:', error)
      setStatus('error')
    }
  }

  return (
    <section id="build" className="relative scroll-mt-20 overflow-hidden">
      {/* The headline: a normal screen, no long pinned scroll */}
      <div className="relative flex min-h-[62svh] flex-col justify-center px-4 pb-10 pt-28 text-center sm:px-6">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 overflow-hidden whitespace-nowrap">
          {[0, 1].map((i) => (
            <span key={i} className="funnel-marquee shrink-0 pr-[0.3em] font-display text-[20vw] leading-none text-white/[0.08] md:text-[12rem]" style={{ animationDuration: '60s' }}>
              {MARQUEE.repeat(3)}
            </span>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto max-w-5xl"
        >
          <div className="mb-8 flex items-baseline justify-center gap-3 text-[13px] text-white/70">
            <span className="font-display text-lg leading-none text-white">06</span>
            <span>The bottom line</span>
          </div>
          <h2 className="mx-auto max-w-5xl border-none pb-0 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-white sm:text-7xl lg:text-8xl">
            Stop losing <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">buyers</span> to agents with better websites
            <span className="text-white">.</span>
          </h2>
        </motion.div>
      </div>

      {/* The form pops up in one go, with its heading inside, then the text and WhatsApp below it */}
      <motion.div
        id="build-form"
        initial={{ opacity: 0, y: 60, scale: 0.94 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ type: 'spring', stiffness: 170, damping: 18, mass: 0.9 }}
        className="relative mx-auto max-w-xl scroll-mt-28 px-4 pb-16 sm:px-6"
      >
        <div className="relative rounded-3xl border border-white/10 bg-[#04101e] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
          {status !== 'success' && (
            <div className="px-6 pt-7 text-center sm:px-8 sm:pt-8">
              <div className="flex items-baseline justify-center gap-3 text-[13px] text-white/60">
                <span className="font-display text-lg leading-none text-white">talk</span>
                to a founder, not a sales rep
              </div>
              <h3 className="mt-3 text-balance text-3xl font-semibold leading-[1.05] tracking-[-0.025em] text-white sm:text-4xl">
                Leave your number. <span className="font-display font-normal text-[#e9f0ff]">We&rsquo;ll call you back.</span>
              </h3>
            </div>
          )}
          {status === 'success' ? (
            <div className="flex flex-col items-center p-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-[#4080E0]" />
              <div className="mt-4 text-2xl font-semibold">
                Got it{submittedName ? `, ${submittedName}` : ''}
                <span className="text-[#4080E0]">.</span>
              </div>
              <div className="mt-2 max-w-xs text-white/65">We&rsquo;ll call you back within one business day.</div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-4 p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="re-name">
                    Name
                  </label>
                  <input id="re-name" name="name" value={form.name} onChange={onChange} required autoComplete="name" className={INPUT} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="re-phone">
                    Phone
                  </label>
                  <input id="re-phone" name="phone" type="tel" value={form.phone} onChange={onChange} required autoComplete="tel" className={INPUT} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="re-email">
                    Email
                  </label>
                  <input id="re-email" name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" className={INPUT} />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="re-website">
                    Your website
                  </label>
                  <input id="re-website" name="website" inputMode="url" autoComplete="url" placeholder="youragentsite.com" value={form.website} onChange={onChange} required className={INPUT} />
                </div>
              </div>
              {status === 'error' && (
                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-300">
                  Something went wrong. Email us at info@igani.co.
                </div>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-white px-7 py-4 text-sm font-semibold text-[#04101e] shadow-[0_0_0_1px_rgba(255,255,255,0.15),0_12px_40px_-12px_rgba(64,128,224,0.9)] transition-colors hover:bg-[#e6eefc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4080E0] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'submitting' ? 'Sending…' : 'I want a site like this'}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="!mt-4 text-center text-[13px] leading-relaxed text-white/60">No spam. No pitch deck. Just a call from a real person.</p>
            </form>
          )}
        </div>

        <p className="!mt-6 text-center text-lg leading-relaxed text-white/85">
          Leave your details and we&rsquo;ll call you within one business day to talk through what a site that wins listings would look like for you.
        </p>
        <div className="mt-5 flex justify-center">
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/[0.06] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.12]"
          >
            <WhatsAppGlyph className="h-4 w-4" />
            Rather chat? Talk to us on WhatsApp
          </a>
        </div>

        {quote && (
          <figure className="mx-auto mt-8 max-w-md rounded-2xl border border-white/15 bg-white/[0.08] p-5 text-left backdrop-blur-md">
            <blockquote className="text-[15px] leading-relaxed text-white/90">&ldquo;{quote.text}&rdquo;</blockquote>
            <figcaption className="mt-3 text-[13px] text-white/65">
              <span className="font-semibold text-white">{quote.author}</span>
              {quote.role ? ` · ${quote.role}` : ''} · {caseStudy.anonymous ? caseStudy.industry : caseStudy.client}
            </figcaption>
          </figure>
        )}
      </motion.div>

      <WhoWeAre />
    </section>
  )
}
