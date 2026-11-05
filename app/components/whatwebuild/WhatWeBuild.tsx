'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Clock } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import Footer from '@/components/Footer'
import { ProductTour } from '@/app/components/salescrm/ProductTour'

const INPUT = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'
const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55 } }
const H2 = 'border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl'
const PANEL = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7'

type Tag = 'running' | 'order'
type Item = { id: string; title: string; text: string; tag: Tag; link?: { href: string; label: string } }
type Group = { id: string; label: string; blurb: string; items: Item[] }

const GROUPS: Group[] = [
  {
    id: 'found', label: 'Get found and look credible', blurb: 'Your website is the first thing a customer sees. It has to look right and load fast.',
    items: [
      { id: 'site', title: 'Your website', text: 'Designed and built for your business, on your own domain.', tag: 'running' },
      { id: 'offers', title: 'Offer pages', text: 'A private page for each customer with your offer, which you can see when they open it.', tag: 'running' },
    ],
  },
  {
    id: 'win', label: 'Win more customers', blurb: 'Most deals are won or lost in the conversation. Make it visible.',
    items: [
      { id: 'crm', title: 'Sales CRM with AI call review', text: 'Every call recorded, transcribed and reviewed, so reps improve and managers see what is said.', tag: 'running', link: { href: '/salescrm', label: 'See the full page' } },
      { id: 'contracts', title: 'Contracts signed online', text: 'Send an agreement, get both signatures and a signed PDF back.', tag: 'running' },
    ],
  },
  {
    id: 'leads', label: 'Stop losing leads', blurb: 'A lead that nobody follows up is money you already paid for.',
    items: [
      { id: 'intake', title: 'Website forms into your CRM', text: 'Every form on your website lands as a lead, with its source, and alerts your team.', tag: 'running' },
      { id: 'lists', title: 'Call lists and a browser dialer', text: 'Call from the browser, log the result, and the lead moves on.', tag: 'running' },
      { id: 'follow', title: 'Follow-up written for you', text: 'After a call, the message to send is already written from what was said.', tag: 'order' },
    ],
  },
  {
    id: 'team', label: 'Run the team better', blurb: 'Know what your team is doing without sitting next to them.',
    items: [
      { id: 'tasks', title: 'Tasks and team meetings', text: 'Who does what by when, with notes from every meeting.', tag: 'running' },
      { id: 'board', title: 'Live team board', text: 'See who is on a call right now and for how long.', tag: 'order' },
    ],
  },
  {
    id: 'book', label: 'Sell or book online', blurb: 'Let customers do the next step without waiting for you.',
    items: [
      { id: 'booking', title: 'Booking pages with your calendar', text: 'Customers pick a free time, it lands in your calendar, and both get an invite.', tag: 'running' },
      { id: 'store', title: 'Online store or payments', text: 'Sell products or services on your site and get paid.', tag: 'order' },
    ],
  },
]

const TagChip = ({ t }: { t: Tag }) =>
  t === 'running' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300"><Check className="h-3 w-3" aria-hidden />Built and running</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300"><Clock className="h-3 w-3" aria-hidden />Built for you</span>
  )

/** Tiny booking picker: pick a day and a time, see it confirmed. Sample only. */
function BookingDemo() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu']
  const times = ['09:00', '10:30', '13:00', '15:30']
  const [d, setD] = useState<string | null>(null)
  const [t, setT] = useState<string | null>(null)
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1b33] p-4">
      <div className="flex flex-wrap gap-2">{days.map((x) => <button key={x} onClick={() => setD(x)} className={`rounded-lg px-3 py-1.5 text-sm ${d === x ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/70'}`}>{x}</button>)}</div>
      <div className="mt-2 flex flex-wrap gap-2">{times.map((x) => <button key={x} onClick={() => setT(x)} className={`rounded-lg px-3 py-1.5 text-sm ${t === x ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/70'}`}>{x}</button>)}</div>
      <p className="mt-3 text-sm text-white/60">{d && t ? `Booked: ${d} at ${t}. A calendar invite is on its way.` : 'Pick a day and a time.'}</p>
    </div>
  )
}

/** A private offer page's life: sent, opened, signed. Sample only. */
function OfferDemo() {
  const steps = ['Sent', 'Opened', 'Signed']
  const [n, setN] = useState(0)
  return (
    <div className="mt-3 rounded-2xl border border-white/10 bg-[#0b1b33] p-4">
      <div className="flex items-center gap-2">{steps.map((s, i) => <div key={s} className={`flex-1 rounded-lg px-3 py-2 text-center text-sm ${i <= n ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/5 text-white/40'}`}>{s}</div>)}</div>
      <button onClick={() => setN((x) => (x + 1) % 3)} className="mt-3 text-sm text-[#8fb4f5] underline underline-offset-4">Next step</button>
    </div>
  )
}

type Status = 'idle' | 'sending' | 'success' | 'error'

export function WhatWeBuild() {
  const [gid, setGid] = useState(GROUPS[1]!.id)
  const [open, setOpen] = useState<string | null>(null)
  const g = GROUPS.find((x) => x.id === gid)!
  const [form, setForm] = useState({ name: '', email: '', phone: '', need: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [trap, setTrap] = useState('')
  const openedAt = useRef(0)
  useEffect(() => {
    openedAt.current = Date.now()
  }, [])
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.need.trim()) return setStatus('error')
    setStatus('sending')
    const utm = Object.fromEntries(Array.from(new URLSearchParams(window.location.search)).filter(([k]) => k.startsWith('utm_')))
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          source: 'landing_page',
          sourceDetails: { page: '/what-we-build', form: 'what-we-build', campaign: 'what_we_build', ...utm },
          message: `What we build: enquiry\nWhat they need: ${form.need.trim()}`,
          website_url: trap,
          _elapsed: openedAt.current ? Date.now() - openedAt.current : null,
        }),
      })
      setStatus(res.ok ? 'success' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-[#06142e] text-white antialiased">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 right-[-10%] h-[620px] w-[620px] rounded-full bg-[#4080E0]/20 blur-[150px]" />
        <div className="absolute bottom-[-20%] left-[-10%] h-[520px] w-[520px] rounded-full bg-[#2f66bd]/15 blur-[150px]" />
      </div>
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" aria-label="Igani home"><IganiLogo className="h-9 w-28" /></Link>
        <a href="#start" className="rounded-full bg-[#4080E0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a93ea]">Tell us what you need</a>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl px-4 pb-16 pt-10 text-center sm:px-6 lg:pb-24 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block rounded-full border border-[#4080E0]/40 bg-[#4080E0]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9bbcf5]">What we build</span>
            <h1 className="mt-5 border-0 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              We build your website, <span className="bg-gradient-to-r from-[#6ea1f2] to-[#7ee0b0] bg-clip-text text-transparent">and whatever your business needs behind it.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">It starts with a website. Then the systems that make it work for you: capturing leads, calling them, reviewing the calls, booking, contracts. Everything below is something we have built. And it is only a few examples.</p>
            <div className="mt-8"><a href="#start" className="inline-flex items-center gap-2 rounded-full bg-[#4080E0] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#5a93ea]">Tell us what you need <ArrowRight className="h-4 w-4" aria-hidden /></a></div>
          </motion.div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <motion.div {...fade} className="grid gap-5 md:grid-cols-3">
            {[['1', 'The website', 'Always first. Designed and built for your business, on your own domain.'], ['2', 'The systems behind it', 'What your business runs on: CRM, call review, booking, offers, contracts.'], ['3', 'Anything else', 'If your business does it, we can build it. Describe the problem, we build the answer.']].map(([n, t, d]) => (
              <div key={n} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7">
                <div className="text-sm font-semibold tracking-[0.2em] text-[#80a0e0]">0{n}</div>
                <h3 className="mt-3 border-0 text-xl font-semibold text-white">{t}</h3>
                <p className="mt-2 text-base leading-7 text-white/65">{d}</p>
              </div>
            ))}
          </motion.div>
        </section>

        <section id="examples" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <motion.div {...fade} className="mx-auto max-w-3xl text-center">
            <h2 className={H2}>Start from your problem</h2>
            <p className="mt-4 text-lg text-white/60">Pick what you want to fix. These are examples of what we have built, not a menu.</p>
          </motion.div>
          <div className="mx-auto mt-10 max-w-4xl">
            <div role="tablist" className="flex flex-wrap justify-center gap-2">
              {GROUPS.map((x) => <button key={x.id} role="tab" aria-selected={gid === x.id} onClick={() => { setGid(x.id); setOpen(null) }} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${gid === x.id ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/65 hover:bg-white/10'}`}>{x.label}</button>)}
            </div>
            <p className="mx-auto mt-4 max-w-xl text-center text-white/60">{g.blurb}</p>
            <div className="mt-6 grid gap-4">
              {g.items.map((it) => (
                <div key={it.id} className={PANEL}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><h3 className="border-0 text-xl font-semibold text-white">{it.title}</h3><p className="mt-1 text-white/65">{it.text}</p></div>
                    <TagChip t={it.tag} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
                    {['crm', 'booking', 'offers'].includes(it.id) ? <button onClick={() => setOpen(open === it.id ? null : it.id)} className="text-[#8fb4f5] underline underline-offset-4">{open === it.id ? 'Hide the example' : 'Try an example'}</button> : null}
                    {it.link ? <Link href={it.link.href} className="text-[#8fb4f5] underline underline-offset-4">{it.link.label}</Link> : null}
                  </div>
                  {open === it.id && it.id === 'crm' ? <ProductTour /> : null}
                  {open === it.id && it.id === 'booking' ? <BookingDemo /> : null}
                  {open === it.id && it.id === 'offers' ? <OfferDemo /> : null}
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-xs text-white/40">Examples use sample content. “Built for you” means we create it to fit your business.</p>
          </div>
        </section>

        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-20">
            <motion.div {...fade}>
              <h2 className={H2}>One team. One build. One bill.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">We build the front end and the back end together. The system sits on your own domain and your own server, separate from every other company, with your own branding.</p>
            </motion.div>
          </div>
        </section>

        <section id="start" className="relative scroll-mt-16 bg-[#0a1f47] py-16 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <motion.div {...fade} className="text-center">
              <h2 className={H2}>Tell us what you need</h2>
              <p className="mt-4 text-lg text-white/60">If it is not on this page, ask anyway. We build whatever your business needs.</p>
            </motion.div>
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              {status === 'success' ? (
                <div className="py-6 text-center"><Check className="mx-auto h-10 w-10 text-emerald-300" aria-hidden /><h3 className="mt-3 border-0 text-2xl font-semibold text-white">Thank you</h3><p className="mt-2 text-white/65">We will be in touch soon.</p></div>
              ) : (
                <form onSubmit={submit} className="grid gap-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="mb-1.5 block text-sm font-medium text-white/80">Your name</span><input className={INPUT} value={form.name} onChange={set('name')} autoComplete="name" required /></label>
                    <label className="block"><span className="mb-1.5 block text-sm font-medium text-white/80">Email</span><input type="email" className={INPUT} value={form.email} onChange={set('email')} autoComplete="email" required /></label>
                  </div>
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-white/80">Phone (optional)</span><input type="tel" className={INPUT} value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
                  <label className="block"><span className="mb-1.5 block text-sm font-medium text-white/80">What do you need?</span><textarea rows={4} className={INPUT} value={form.need} onChange={set('need')} required /></label>
                  <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Website<input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} /></label></div>
                  {status === 'error' ? <p className="text-sm text-red-300" role="alert">Please fill in your name, email and what you need, then try again.</p> : null}
                  <button type="submit" disabled={status === 'sending'} className="rounded-full bg-[#4080E0] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#5a93ea] disabled:opacity-60">{status === 'sending' ? 'Sending…' : 'Send'}</button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
