'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55 } }
const num = (n: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)
const FIELD = 'w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white focus:border-[#4080E0] focus:outline-none focus:ring-1 focus:ring-[#4080E0]'

/** What a missed deal costs: the visitor types their own numbers. An illustration, not a promise. */
export function RoiCalculator() {
  const [cur, setCur] = useState('₪')
  const [closings, setClosings] = useState(2)
  const [extra, setExtra] = useState(1)
  const [value, setValue] = useState(40000)
  const [days, setDays] = useState(22)
  const month = Math.max(0, extra) * Math.max(0, value) * Math.max(0, days)
  const now = closings * value * days
  const field = (label: string, v: number, set: (n: number) => void, step = 1) => (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-white/75">{label}</span>
      <input type="number" min={0} step={step} value={Number.isFinite(v) ? v : 0} onChange={(e) => set(Number(e.target.value))} className={FIELD} />
    </label>
  )
  return (
    <section id="roi" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">One more closing a day. What is that worth to you?</h2>
        <p className="mt-4 text-lg text-white/60">Put in your own numbers. When a rep says the wrong thing, you do not see a bad call. You lose a deal you already paid to get.</p>
      </motion.div>
      <div className="mx-auto mt-10 grid max-w-4xl gap-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-6 sm:p-8 md:grid-cols-2">
        <div className="grid gap-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-white/75">Currency</span>
            <select value={cur} onChange={(e) => setCur(e.target.value)} className={FIELD}>
              <option value="₪">₪ Shekel</option><option value="$">$ Dollar</option><option value="€">€ Euro</option>
            </select>
          </label>
          {field('Closings your team makes per day today', closings, setClosings)}
          {field(`Value of one closing (${cur})`, value, setValue, 1000)}
          {field('Extra closings per day you want', extra, setExtra)}
          {field('Working days per month', days, setDays)}
        </div>
        <div className="flex flex-col justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-6 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Extra revenue per month</div>
          <div className="mt-2 text-4xl font-bold tabular-nums text-white sm:text-5xl" aria-live="polite">{cur}{num(month)}</div>
          <p className="mt-3 text-sm text-white/60">From {closings} to {closings + extra} closings a day. Today that is {cur}{num(now)} a month.</p>
          <p className="mt-4 text-xs text-white/40">This is arithmetic on your own numbers, not a promise of results. We will look at your real calls together on the demo.</p>
        </div>
      </div>
    </section>
  )
}

/** The origin of the method, told without a name. */
export function Origin() {
  const points = [
    ['Not a generic AI opinion', 'The AI is not left to improvise. It reads each call against a fixed, proven method.'],
    ['Built from real recordings', 'A multi-million-dollar sales leader spent many hours recording himself selling. We turned that into a clear system.'],
    ['Proven on a huge team', 'He led thousands of salespeople. The method is what they were taught.'],
  ]
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <motion.div {...fade} className="mx-auto max-w-3xl text-center">
          <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">This is not an AI guessing. It is a real salesman’s method.</h2>
          <p className="mt-4 text-lg text-white/60">Anyone can plug a chatbot into a call recording. The value is in what it is measuring against.</p>
        </motion.div>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {points.map(([t, d]) => (
            <motion.div key={t} {...fade} className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7">
              <h3 className="border-0 text-xl font-semibold text-white">{t}</h3>
              <p className="mt-2 text-base leading-7 text-white/65">{d}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-white/45">We keep his name private. We are glad to tell you more on a call.</p>
      </div>
    </section>
  )
}

type Out = { id: string; title: string; status: 'live' | 'build'; pitch: string }
const OUTPUTS: Out[] = [
  { id: 'score', title: 'Score and coaching', status: 'live', pitch: 'Every call scored, with the exact moment it slipped and better words to use.' },
  { id: 'script', title: 'Did they say it?', status: 'live', pitch: 'Check the rep covered what must be said: the offer, the price, the next step.' },
  { id: 'obj', title: 'Objections', status: 'live', pitch: 'See which objections come up most, and how each rep handles them.' },
  { id: 'prep', title: 'Lead prep brief', status: 'build', pitch: 'Before the call, scan the lead’s website and hand the rep what to talk about.' },
  { id: 'board', title: 'Live team board', status: 'build', pitch: 'See who is on a call right now and for how long.' },
]

const PREP: Record<string, { title: string; found: string[]; open: string }> = {
  agency: { title: 'Web agency · lead’s website', found: ['Takes 6.4 seconds to load on a phone', 'No clear button to contact them above the fold', 'Nothing shows up when you search their business name'], open: '“I looked at your site before calling. On a phone it takes about six seconds to load, and I think that is costing you enquiries. Can I show you?”' },
  realestate: { title: 'Real estate · lead’s listing', found: ['Listing has 3 photos and no floor plan', 'Same flat listed 40 days ago at a higher price', 'Description does not mention the neighbourhood'], open: '“Your listing has been up for six weeks. I noticed it only has three photos. Would you like to hear what usually helps flats like this move?”' },
  insurance: { title: 'Insurance · lead’s company', found: ['Company hired 12 people this year', 'No employee benefits page on their site', 'Opened a second branch in March'], open: '“I saw you opened a second branch. When a team grows that fast, cover usually has gaps. Who looks after yours today?”' },
}

/** Beyond the review: everything the same call data can produce. Built and not-yet-built items are labelled honestly. */
export function Outputs() {
  const [sel, setSel] = useState('prep')
  const [ind, setInd] = useState('agency')
  const o = OUTPUTS.find((x) => x.id === sel)!
  const p = PREP[ind]
  return (
    <section id="outputs" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        <h2 className="border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl">More than a score</h2>
        <p className="mt-4 text-lg text-white/60">Once every call is recorded and read, a lot becomes possible. Pick one to see it. It is the same system whatever you sell.</p>
      </motion.div>
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="flex flex-wrap justify-center gap-2" role="tablist">
          {OUTPUTS.map((x) => (
            <button key={x.id} role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${sel === x.id ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/65 hover:bg-white/10'}`}>{x.title}</button>
          ))}
        </div>
        <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-white/70">{o.pitch}</p>
            {o.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300"><Check className="h-3.5 w-3.5" aria-hidden />Working today</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300"><Clock className="h-3.5 w-3.5" aria-hidden />We build it for you</span>
            )}
          </div>
          <div className="mt-5">
            {sel === 'score' && (
              <div className="grid gap-3 sm:grid-cols-3">
                {[['Opening', 82, '#34d399'], ['Questions', 74, '#34d399'], ['Pitch', 55, '#fbbf24'], ['Objection', 31, '#f87171'], ['Close', 20, '#64748b']].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-xl bg-white/[0.04] p-4"><div className="flex justify-between text-sm text-white/80"><span>{l}</span><span>{v}</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full" style={{ width: `${v}%`, background: c as string }} /></div></div>
                ))}
              </div>
            )}
            {sel === 'script' && (
              <ul className="grid gap-2">
                {[['Introduced the company', true], ['Asked what the prospect needs', true], ['Said the price clearly', false], ['Offered a next step', false], ['Confirmed contact details', true]].map(([l, ok]) => (
                  <li key={l as string} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-white/85"><span>{l}</span><span className={ok ? 'text-emerald-300' : 'text-red-300'}>{ok ? 'Said' : 'Missed'}</span></li>
                ))}
              </ul>
            )}
            {sel === 'obj' && (
              <div className="grid gap-2">
                {[['“It’s too expensive”', 14, 'Reps asked a question first in 3 of 14'], ['“We already have someone”', 9, 'Reps offered a discount in 6 of 9'], ['“Send me an email”', 7, 'Next step booked in 1 of 7']].map(([l, n, d]) => (
                  <div key={l as string} className="rounded-xl bg-white/[0.04] px-4 py-3"><div className="flex justify-between text-white/90"><span>{l}</span><span className="text-white/50">{n} times</span></div><div className="mt-1 text-sm text-white/55">{d}</div></div>
                ))}
              </div>
            )}
            {sel === 'prep' && (
              <div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-white/60">Industry:
                  {Object.entries({ agency: 'Websites', realestate: 'Real estate', insurance: 'Insurance' }).map(([k, v]) => (
                    <button key={k} onClick={() => setInd(k)} className={`rounded-full px-3 py-1 text-xs font-semibold ${ind === k ? 'bg-white text-[#06142e]' : 'bg-white/10 text-white/70'}`}>{v}</button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#0b1b33] p-5">
                  <div className="text-xs uppercase tracking-[0.16em] text-white/40">{p.title}</div>
                  <ul className="mt-3 grid gap-2">{p.found.map((f) => <li key={f} className="flex gap-2 text-white/85"><span className="text-amber-300">•</span>{f}</li>)}</ul>
                  <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Open with</div><p className="mt-1 !mt-1 text-[15px] text-white/90">{p.open}</p></div>
                </div>
              </div>
            )}
            {sel === 'board' && (
              <div className="grid gap-2">
                {[['Rep A', 'On a call', '04:12'], ['Rep B', 'Between calls', '—'], ['Rep C', 'On a call', '11:40'], ['Rep D', 'Offline', '—']].map(([n, s, t]) => (
                  <div key={n} className="flex items-center justify-between rounded-xl bg-white/[0.04] px-4 py-3 text-white/85"><span>{n}</span><span className={s === 'On a call' ? 'text-emerald-300' : 'text-white/45'}>{s}{t !== '—' ? ` · ${t}` : ''}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/40">All figures, names and quotes on this page are sample data. Items marked “We build it for you” are not in the system yet and would be built to your needs.</p>
      </div>
    </section>
  )
}
