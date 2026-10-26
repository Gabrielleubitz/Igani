'use client'

import { ChangeEvent, FormEvent, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { MagneticButton } from '@/app/components/landing/fx/MagneticButton'
import { SideNote } from '@/app/components/landing/fx/SideNote'
import { SettleHeadline } from '@/app/components/funnel-shared/SettleHeadline'

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
    <section id="build" className="relative scroll-mt-20">
      <SettleHeadline
        className="pt-20"
        backdrop={
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 overflow-hidden whitespace-nowrap">
            {[0, 1].map((i) => (
              <span key={i} className="funnel-marquee shrink-0 pr-[0.3em] font-display text-[20vw] leading-none text-white/[0.08] md:text-[12rem]" style={{ animationDuration: '60s' }}>
                {MARQUEE.repeat(3)}
              </span>
            ))}
          </div>
        }
        cue={<SideNote arrow="down" className="!text-white/85">your turn</SideNote>}
      >
        <div className="mb-8 flex items-baseline justify-center gap-3 text-[13px] text-white/70">
          <span className="font-display text-lg leading-none text-white">04</span>
          <span>The bottom line</span>
        </div>
        <h2 className="border-none pb-0 text-balance text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white sm:text-7xl lg:text-8xl">
          Ready for a site that <span className="font-display pr-[0.04em] text-[1.08em] font-normal text-[#e9f0ff]">actually closes</span> for you?
        </h2>
      </SettleHeadline>

      <motion.div
        id="build-form"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-xl scroll-mt-28 px-4 pb-28 sm:px-6"
      >
        <p className="!mt-0 mb-6 text-center text-lg leading-relaxed text-white/85">
          Leave your details. We&rsquo;ll call you today — a real conversation, not a brochure.
        </p>
        <div className="relative rounded-3xl border border-white/10 bg-[#04101e] shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)]">
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
      </motion.div>
    </section>
  )
}
