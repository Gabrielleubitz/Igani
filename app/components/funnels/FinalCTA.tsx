'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { GlowButton } from './GlowButton'
import { SettleHeadline } from '@/app/components/funnel-shared/SettleHeadline'

const MARQUEE = 'EAT WITH YOUR EYES • CONVERT WITH STYLE • '

function Marquee({ reverse = false }: { reverse?: boolean }) {
  return (
    <div className="flex overflow-hidden whitespace-nowrap" aria-hidden>
      {[0, 1].map((i) => (
        <span
          key={i}
          className={`funnel-marquee shrink-0 pr-[0.3em] font-clash text-[18vw] font-bold leading-none text-transparent [-webkit-text-stroke:1px_rgba(255,255,255,0.14)] md:text-[11rem] ${
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
    <section id="build" className="relative">
      <SettleHeadline
        backdrop={
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-center gap-4">
            <Marquee />
            <Marquee reverse />
          </div>
        }
        cue={
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-white/70">
            Your move <span className="inline-block animate-bounce">↓</span>
          </div>
        }
      >
        <h2 className="border-0 pb-0 font-clash text-6xl font-bold leading-[0.98] text-white sm:text-8xl lg:text-[9rem]">
          Stop <span className="text-[#00F0FF] drop-shadow-[0_0_30px_rgba(0,240,255,0.6)]">leaking</span> clients.
        </h2>
      </SettleHeadline>

      <motion.div
        id="build-form"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-xl scroll-mt-16 px-4 pb-28 sm:px-6"
      >
        <div className="text-center font-mono text-xs uppercase tracking-[0.25em] text-white/70">Leave your details · we call you today</div>

        {status === 'success' ? (
          <div className="mt-8 rounded-2xl border border-[#00F0FF]/50 bg-[#0A0A0C]/60 p-6 text-white shadow-[0_0_40px_-10px_rgba(0,240,255,0.7)]">
            <p className="font-clash text-2xl font-semibold">You&rsquo;re in.</p>
            <p className="mt-1 text-white/70">We&rsquo;ll call you today.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-3 rounded-3xl border border-white/15 bg-[#0A0A0C]/55 p-5 text-left backdrop-blur-xl sm:p-7">
            <input name="name" value={form.name} onChange={onChange} required autoComplete="name" placeholder="Your name" aria-label="Your name" className={inputClass} />
            <input name="phone" type="tel" value={form.phone} onChange={onChange} required autoComplete="tel" placeholder="Phone number" aria-label="Phone number" className={inputClass} />
            <input name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" placeholder="Email address" aria-label="Email address" className={inputClass} />
            <GlowButton type="submit" disabled={status === 'submitting'} className="!mt-6 w-full">
              {status === 'submitting' ? 'BUILDING…' : 'BUILD MY SITE'}
            </GlowButton>
            {status === 'error' && (
              <p role="alert" className="text-center text-sm text-red-300">
                Something went wrong. Email us at info@igani.co.
              </p>
            )}
            <p className="pt-2 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-white/50">
              We call you today · No obligation
            </p>
          </form>
        )}
      </motion.div>
    </section>
  )
}
