'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { ElegantButton } from './ElegantButton'

const MARQUEE = 'Eat with your eyes · Convert with style · '

const inputClass =
  'w-full border-0 border-b border-[#F7F3EC]/25 bg-transparent px-0 py-4 text-lg text-[#F7F3EC] placeholder:text-[#F7F3EC]/40 transition-colors duration-500 focus:border-[#C9A774] focus:outline-none focus:ring-0'

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
          sourceDetails: { page: '/funnel2', form: 'final_cta', campaign: 'front_door_elegant' },
          message: 'Funnel 2 (elegant) landing page submission - Build my site',
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
    <section id="build" className="relative overflow-hidden bg-[#1F1C18] py-32 text-[#F7F3EC]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 overflow-hidden whitespace-nowrap">
        {[0, 1].map((i) => (
          <span key={i} className="elegant-marquee shrink-0 pr-[0.4em] font-cormorant text-[22vw] italic leading-none text-[#F7F3EC]/[0.05] md:text-[13rem]">
            {MARQUEE.repeat(3)}
          </span>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-xl px-6 text-center"
      >
        <span className="text-[11px] uppercase tracking-[0.4em] text-[#C9A774]">IV. The bottom line</span>
        <h2 className="mt-6 border-0 pb-0 font-cormorant text-5xl font-normal leading-[1.05] sm:text-6xl">
          Ready for a site that <em className="text-[#C9A774]">actually closes</em> for you?
        </h2>

        {status === 'success' ? (
          <div className="mt-14 border-t border-[#C9A774]/40 pt-10">
            <div className="font-cormorant text-4xl italic">Thank you.</div>
            <div className="mt-2 text-[#F7F3EC]/70">We&rsquo;ll call you today.</div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-12 space-y-2 text-left">
            <input name="name" value={form.name} onChange={onChange} required autoComplete="name" placeholder="Your name" aria-label="Your name" className={inputClass} />
            <input name="phone" type="tel" value={form.phone} onChange={onChange} required autoComplete="tel" placeholder="Phone number" aria-label="Phone number" className={inputClass} />
            <input name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" placeholder="Email address" aria-label="Email address" className={inputClass} />
            <div className="pt-10 text-center">
              <ElegantButton type="submit" tone="ivory" disabled={status === 'submitting'}>
                {status === 'submitting' ? 'One moment…' : 'Build my site'}
              </ElegantButton>
            </div>
            {status === 'error' && (
              <div role="alert" className="pt-2 text-center text-sm text-[#E8A598]">
                Something went wrong. Email us at info@igani.co.
              </div>
            )}
            <div className="pt-6 text-center text-[10px] uppercase tracking-[0.3em] text-[#F7F3EC]/40">
              We call you today · No obligation
            </div>
          </form>
        )}
      </motion.div>
    </section>
  )
}
