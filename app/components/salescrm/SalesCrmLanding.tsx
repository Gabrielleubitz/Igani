'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, BarChart3, Check, Headphones, LineChart, ListChecks, Mic, PhoneCall, ScrollText, Sparkles, Users } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import { ReviewMock } from './ReviewMock'
import { ProductTour } from './ProductTour'
import { Origin, Outputs, RoiCalculator } from './ValueSections'

const INPUT =
  'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white placeholder-white/30 transition-colors focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'
const LABEL = 'mb-1.5 block text-sm font-medium text-white/80'

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55 } }

const STEPS = [
  { icon: PhoneCall, title: 'Call from the CRM', text: 'Your reps dial from the browser. No apps, no special hardware. Every call is tied to its lead automatically.' },
  { icon: Mic, title: 'Recorded and transcribed', text: 'When the call ends, the full recording and word-for-word transcript are usually ready within a minute or two.' },
  { icon: Sparkles, title: 'Reviewed for rep and manager', text: 'A score, the moments that mattered, better words to use, and a picture of where the call went off track.' },
]

const FEATURES = [
  { icon: Headphones, title: 'Browser dialer with recording', text: 'Call leads straight from their record. The result of each call becomes the lead’s status.' },
  { icon: ScrollText, title: 'Instant transcript', text: 'Read what was said, with timestamps. Click any line to play that moment.' },
  { icon: Sparkles, title: 'AI review after every call', text: 'Strengths, what to fix, and the exact words to try next time, with quotes and times so every point can be checked.' },
  { icon: LineChart, title: 'The call, drawn on a line', text: 'See at a glance where the rep stayed on track and where the call slipped, and how ready the buyer was to act.' },
  { icon: ListChecks, title: 'Live hints during the call', text: 'Short, quiet prompts on the rep’s screen while they talk. Optional, and each rep can switch it off.' },
  { icon: BarChart3, title: 'Weekly scorecards', text: 'Each rep sees their strengths and weak spots. Managers see every rep’s week and trend.' },
]

const FAQ = [
  { q: 'Do my reps need new phones or apps?', a: 'No. They call from the CRM in the browser. A headset helps, nothing else is needed.' },
  { q: 'Is recording calls allowed?', a: 'Recording rules differ by country and state. We set recording up together with you for where you call, and we recommend checking the rules with your own legal advisor.' },
  { q: 'What languages does it support?', a: 'Calls and reviews are in English today.' },
  { q: 'Is our data separate from other companies?', a: 'Yes. Each company gets its own separate system on its own domain.' },
  { q: 'How accurate is the review?', a: 'It is an AI reading of the transcript, written to help coaching, not a measurement. Every point comes with the quote and the time, so reps and managers can check it themselves.' },
  { q: 'What does it cost?', a: 'It comes as part of the website we build for you, and the price depends on the size of your team and the features you choose. Book a demo and we will give you a clear number.' },
]

type Status = 'idle' | 'sending' | 'success' | 'error'

export function SalesCrmLanding() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', team: '4 to 10', calls: '20 to 50', notes: '' })
  const [status, setStatus] = useState<Status>('idle')
  const [trap, setTrap] = useState('')
  const openedAt = useRef(0)
  useEffect(() => {
    openedAt.current = Date.now()
  }, [])
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.company.trim()) return setStatus('error')
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
          sourceDetails: { page: '/salescrm', form: 'sales-crm-demo', campaign: 'sales_crm', ...utm },
          message: `Sales CRM demo request\nCompany: ${form.company.trim()}\nTeam size: ${form.team}\nCalls per day: ${form.calls}${form.notes.trim() ? `\nNotes: ${form.notes.trim()}` : ''}`,
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
        <Link href="/" aria-label="Igani home">
          <IganiLogo className="h-9 w-28" />
        </Link>
        <a href="#demo" className="rounded-full bg-[#4080E0] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#5a93ea]">
          Book a demo
        </a>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:px-8 lg:pb-24 lg:pt-14">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block rounded-full border border-[#4080E0]/40 bg-[#4080E0]/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#9bbcf5]">Sales CRM with AI call review</span>
            <h1 className="mt-5 border-0 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-[3.4rem]">
              Your reps talk to the leads you paid for. <span className="bg-gradient-to-r from-[#6ea1f2] to-[#7ee0b0] bg-clip-text text-transparent">Do you know what they say?</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white/70">
              Most sales teams are never listened to. This CRM records every call and checks it against a proven sales method. Managers finally see what is being said. Reps learn after every call, stay motivated, and close more.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="#demo" className="inline-flex items-center gap-2 rounded-full bg-[#4080E0] px-6 py-3.5 text-base font-semibold text-white shadow-[0_12px_34px_-12px_rgba(64,128,224,0.9)] transition hover:bg-[#5a93ea]">
                See it on your own calls <ArrowRight className="h-4 w-4" aria-hidden />
              </a>
              <a href="#how" className="rounded-full border border-white/15 px-6 py-3.5 text-base font-medium text-white/85 transition hover:border-white/40">
                How it works
              </a>
            </div>
            <p className="mt-4 text-sm text-white/50">No payment. We review one of your recordings, or make a test call together.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.1 }}>
            <ReviewMock />
          </motion.div>
        </section>

        {/* Problem */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-20">
            <motion.div {...fade}>
              <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">You pay for the leads. Then the call happens in the dark.</h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
                A lead fills in your form after you paid to get them. A rep calls. And then? Only the rep and the buyer know what was said. In most CRMs, a terrible call looks exactly like a great one.
              </p>
              <ul className="mx-auto mt-8 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                {['How many calls does your team make a day?', 'How many turn into a real next step?', 'Which rep loses the lead, and where in the call?'].map((q) => (
                  <li key={q} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-base font-medium text-white/90">
                    {q}
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-white/60">With call review, you can answer all three.</p>
            </motion.div>
          </div>
        </section>

        <RoiCalculator />
        <Origin />

        {/* How it works */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <motion.div {...fade} className="mx-auto max-w-2xl text-center">
            <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">How it works</h2>
            <p className="mt-4 text-lg text-white/60">Three steps, and nothing extra for your reps to do.</p>
          </motion.div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <motion.div key={s.title} {...fade} transition={{ duration: 0.55, delay: i * 0.08 }} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4080E0]/15 text-[#8fb4f5]">
                    <s.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold tracking-[0.2em] text-[#80a0e0]">0{i + 1}</span>
                </div>
                <h3 className="mt-5 border-0 text-xl font-semibold text-white">{s.title}</h3>
                <p className="mt-2 text-base leading-7 text-white/65">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Interactive product tour */}
        <section id="tour" className="mx-auto max-w-6xl scroll-mt-20 px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <motion.div {...fade} className="mx-auto max-w-2xl text-center">
            <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">See it inside the CRM</h2>
            <p className="mt-4 text-lg text-white/60">Click through a call from dial to review.</p>
          </motion.div>
          <ProductTour />
        </section>

        <Outputs />

        {/* Reps and managers */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
          <div className="grid gap-5 md:grid-cols-2">
            {[
              { icon: Users, title: 'For every rep', items: ['A review after every call: score, key moments, and better words to use', 'Optional live hints on screen while you talk', 'Your week: strengths, where you slip, what to practice next', 'The result you pick after the call becomes the lead’s status'] },
              { icon: BarChart3, title: 'For every manager', items: ['See every call and its review, without listening to hours of audio', 'Each rep’s weekly view and trend, side by side', 'Every call creates or finds the lead, so two reps never chase the same one', 'Leads, board and tasks in one place'] },
            ].map((col, i) => (
              <motion.div key={col.title} {...fade} transition={{ duration: 0.55, delay: i * 0.08 }} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-8">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <col.icon className="h-5 w-5" aria-hidden />
                  </span>
                  <h3 className="border-0 text-xl font-semibold text-white">{col.title}</h3>
                </div>
                <ul className="mt-5 space-y-3">
                  {col.items.map((t) => (
                    <li key={t} className="flex gap-3 text-base leading-7 text-white/75">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="border-y border-white/5 bg-white/[0.02]">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
            <motion.div {...fade} className="mx-auto max-w-2xl text-center">
              <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">What you get</h2>
            </motion.div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f, i) => (
                <motion.div key={f.title} {...fade} transition={{ duration: 0.5, delay: (i % 3) * 0.07 }} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <f.icon className="h-6 w-6 text-[#8fb4f5]" aria-hidden />
                  <h3 className="mt-4 border-0 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-[15px] leading-7 text-white/65">{f.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Comes with the website */}
        <section className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:py-24">
          <motion.div {...fade}>
            <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">It comes with your website</h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/65">
              The CRM is part of the back end of the custom website Igani builds for your company: your own system, on your own domain, separate from everyone else’s. Your website’s enquiry form sends every new lead straight into it, ready to call.
            </p>
          </motion.div>
        </section>

        {/* Demo + form */}
        <section id="demo" className="relative scroll-mt-16 bg-[#0a1f47] py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-8">
            <motion.div {...fade}>
              <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">See it on your own calls</h2>
              <p className="mt-4 text-lg leading-8 text-white/70">
                Send us a recording of one of your sales calls and we will show you its review. Or we make a short test call together. No payment, no commitment.
              </p>
              <ul className="mt-6 space-y-3 text-white/80">
                {['A real review of a real call', 'A short session, at a time that suits you', 'You decide afterwards, with no pressure'].map((t) => (
                  <li key={t} className="flex gap-3">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div {...fade} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 sm:p-8">
              {status === 'success' ? (
                <div className="py-10 text-center" role="status">
                  <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                    <Check className="h-7 w-7" aria-hidden />
                  </span>
                  <h3 className="mt-5 border-0 text-2xl font-semibold text-white">Thank you, we got it.</h3>
                  <p className="mt-2 text-white/65">We will be in touch shortly to set up your demo.</p>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4" noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="sc-name">Your name *</label>
                      <input id="sc-name" className={INPUT} value={form.name} onChange={set('name')} autoComplete="name" required />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="sc-company">Company *</label>
                      <input id="sc-company" className={INPUT} value={form.company} onChange={set('company')} autoComplete="organization" required />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="sc-email">Work email *</label>
                      <input id="sc-email" type="email" className={INPUT} value={form.email} onChange={set('email')} autoComplete="email" required />
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="sc-phone">Phone</label>
                      <input id="sc-phone" type="tel" className={INPUT} value={form.phone} onChange={set('phone')} autoComplete="tel" />
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={LABEL} htmlFor="sc-team">Sales team size</label>
                      <select id="sc-team" className={INPUT} value={form.team} onChange={set('team')}>
                        {['1 to 3', '4 to 10', '11 to 30', 'More than 30'].map((o) => (
                          <option key={o} value={o} className="bg-[#0a1f47]">{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={LABEL} htmlFor="sc-calls">Calls your team makes a day</label>
                      <select id="sc-calls" className={INPUT} value={form.calls} onChange={set('calls')}>
                        {['Fewer than 20', '20 to 50', '50 to 150', 'More than 150'].map((o) => (
                          <option key={o} value={o} className="bg-[#0a1f47]">{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className={LABEL} htmlFor="sc-notes">Anything we should know? (optional)</label>
                    <textarea id="sc-notes" rows={3} className={INPUT} value={form.notes} onChange={set('notes')} />
                  </div>
                  {/* Hidden trap field for bots */}
                  <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
                    <label>
                      Website
                      <input tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
                    </label>
                  </div>
                  {status === 'error' ? (
                    <p role="alert" className="text-sm text-rose-300">
                      Please fill in your name, company and email, then try again. If it keeps failing, email us and we will help.
                    </p>
                  ) : null}
                  <button type="submit" disabled={status === 'sending'} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#4080E0] px-6 py-3.5 text-base font-semibold text-white transition hover:bg-[#5a93ea] disabled:opacity-60">
                    {status === 'sending' ? 'Sending…' : 'Book my demo'} <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                  <p className="text-center text-xs text-white/45">
                    We use your details only to contact you about the demo. See our <Link href="/privacy" className="underline underline-offset-2">privacy policy</Link>.
                  </p>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:py-24">
          <motion.h2 {...fade} className="border-0 pb-0 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">Questions</motion.h2>
          <div className="mt-10 divide-y divide-white/10 rounded-3xl border border-white/10 bg-white/[0.03]">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                  {f.q}
                  <span aria-hidden className="text-xl leading-none text-[#80a0e0] transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-white/65">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 px-4 py-8 text-center text-sm text-white/40">
        © {new Date().getFullYear()} Igani ·{' '}
        <Link href="/privacy" className="underline-offset-2 hover:underline">Privacy</Link> ·{' '}
        <Link href="/terms" className="underline-offset-2 hover:underline">Terms</Link>
      </footer>
    </div>
  )
}
