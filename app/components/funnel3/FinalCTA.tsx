'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { SectionHeading } from '@/app/components/landing/fx/SectionHeading'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'

const MARQUEE = 'eat with your eyes · convert with style · '

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-white/25 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'

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
          sourceDetails: { page: '/funnel3', form: 'final_cta', campaign: 'front_door_brand' },
          message: 'Funnel 3 (home style) landing page submission - Build my site',
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
    <section id="build" className="relative scroll-mt-20 overflow-hidden py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-40 right-0 h-[600px] w-[600px] rounded-full bg-[#4080E0]/12 blur-[160px]" />
      </div>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 overflow-hidden whitespace-nowrap">
        {[0, 1].map((i) => (
          <span key={i} className="funnel-marquee shrink-0 pr-[0.3em] font-display text-[20vw] leading-none text-white/[0.035] md:text-[12rem]" style={{ animationDuration: '60s' }}>
            {MARQUEE.repeat(3)}
          </span>
        ))}
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1fr] lg:px-8">
        <SectionHeading
          index="04"
          label="The bottom line"
          title="Ready for a site that *actually closes* for you?"
          sub="Leave your details. We’ll call you today — a real conversation, not a brochure."
        />

        <div className="relative self-end rounded-3xl border border-white/[0.08] bg-[#061225]/70 backdrop-blur-xl">
          {status === 'success' ? (
            <div className="flex flex-col items-center p-10 text-center">
              <CheckCircle2 className="h-10 w-10 text-[#4080E0]" />
              <div className="mt-4 text-2xl font-semibold">
                You&rsquo;re <span className="font-display font-normal text-[#dbe6ff]">in</span>.
              </div>
              <div className="mt-2 text-white/65">We&rsquo;ll call you today.</div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-5 p-7 sm:p-9">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="f3-name">Name</label>
                <input id="f3-name" name="name" value={form.name} onChange={onChange} required autoComplete="name" className={INPUT} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="f3-phone">Phone number</label>
                <input id="f3-phone" name="phone" type="tel" value={form.phone} onChange={onChange} required autoComplete="tel" className={INPUT} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80" htmlFor="f3-email">Email</label>
                <input id="f3-email" name="email" type="email" value={form.email} onChange={onChange} required autoComplete="email" className={INPUT} />
              </div>
              {status === 'error' && (
                <div role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm font-medium text-red-300">
                  Something went wrong. Email us at info@igani.co.
                </div>
              )}
              <div className="pt-2">
                <MagneticButton type="submit" disabled={status === 'submitting'} strength={0.15}>
                  {status === 'submitting' ? 'Sending…' : 'Build my site'}
                  <ArrowRight className="h-4 w-4" />
                </MagneticButton>
              </div>
              <div className="text-center font-display text-[1.05rem] text-[#b9cdf3]">we call you today · no obligation</div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
