'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowButton } from './GlowButton'

const MARQUEE = 'EAT WITH YOUR EYES • CONVERT WITH STYLE • '

function Marquee({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden whitespace-nowrap" aria-hidden>
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`funnel-marquee shrink-0 pr-[0.3em] font-clash text-[18vw] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.09)] md:text-[11rem] ${
            reverse ? '[animation-direction:reverse]' : ''
          }`}
        >
          {MARQUEE.repeat(3)}
        </span>
      ))}
    </div>
  )
}

const inputClass =
  'w-full rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-white placeholder:text-white/35 backdrop-blur transition-colors focus:border-[#00F0FF]/70 focus:bg-white/[0.06] focus:outline-none'

export function FinalCTA() {
  const [form, setForm] = useState({ name: '', email: '', phone: '' })
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')

  const onChange = (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [e.target.name]: e.target.value })

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setStatus('submitting')
    try {
      // Construct API URL - use main domain if on subdomain
      const apiUrl = window.location.hostname.includes('funnels.')
        ? 'https://www.igani.co/api/leads'
        : '/api/leads'

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          source: 'landing_page',
          sourceDetails: { page: '/funnels', form: 'final_cta', campaign: 'front_door' },
          message: 'Funnels landing page submission - Build my site',
        }),
      })
      if (response.ok) {
        setStatus('success')
        setForm({ name: '', email: '', phone: '' })
      } else {
        setStatus('error')
      }
    } catch (error) {
      console.error('Form submission failed:', error)
      setStatus('error')
    }
  }

  return (
    <section id="build" className="relative scroll-mt-8 overflow-hidden py-28">
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4">
        <Marquee />
        <Marquee reverse />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7000FF]/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-xl px-4 text-center sm:px-6"
      >
        <h2 className="border-0 pb-0 font-clash text-4xl font-bold leading-tight text-white sm:text-6xl">
          Ready for a site that <span className="bg-gradient-to-r from-[#00F0FF] to-[#7000FF] bg-clip-text text-transparent">actually closes</span> for you?
        </h2>

        {status === 'success' ? (
          <div className="mt-10 rounded-2xl border border-[#00F0FF]/50 bg-[#00F0FF]/10 p-6 text-white shadow-[0_0_40px_-10px_rgba(0,240,255,0.7)]">
            <p className="font-clash text-2xl font-semibold">You&rsquo;re in.</p>
            <p className="mt-1 text-white/70">We&rsquo;ll call you today.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-10 space-y-3 text-left">
            <input name="name" value={form.name} onChange={onChange} required autoComplete="name" placeholder="Your name" aria-label="Your name" className={inputClass} />
            <input name="phone" type="tel" value={form.phone} onChange={onChange} required autoComplete="tel" placeholder="Phone number" aria-label="Phone number" className={inputClass} />
            <input name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" placeholder="Email address" aria-label="Email address" className={inputClass} />
            <GlowButton type="submit" disabled={status === 'submitting'} className="!mt-6 w-full">
              {status === 'submitting' ? 'BUILDING…' : 'BUILD MY SITE'}
            </GlowButton>
            {status === 'error' && (
              <p role="alert" className="text-center text-sm text-red-400">
                Something went wrong. Email us at info@igani.co.
              </p>
            )}
            <p className="pt-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              We call you today · No obligation
            </p>
          </form>
        )}
      </motion.div>
    </section>
  )
}
