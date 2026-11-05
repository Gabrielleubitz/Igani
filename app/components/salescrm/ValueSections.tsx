'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Clock } from 'lucide-react'

const fade = { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: '-60px' }, transition: { duration: 0.55 } }
const H2 = 'border-0 pb-0 text-3xl font-bold tracking-tight text-white sm:text-4xl'
const CARD = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-7'
const PANEL = 'rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7'

/** Three winners: the manager, the salesman, the company. */
export function Everyone() {
  const cols = [
    ['The manager', 'Finally in control', ['Hear what is really said, on every call, not just the ones you sit in on', 'See whether the product is being sold correctly', 'Know which rep needs help, and with what, without guessing']],
    ['The salesman', 'Gets better every week', ['Clear feedback after every call, on his own words', 'Learns just by using the system, so he stays motivated', 'Closes more, earns more, and is happier doing it']],
    ['The company', 'More from the leads it pays for', ['Fewer leads lost to the wrong words', 'Reps who improve instead of leaving', 'More closings from the same lead spend']],
  ] as const
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        <h2 className={H2}>Everybody wins. That is why it is huge.</h2>
        <p className="mt-4 text-lg text-white/60">A manager who feels in control. A salesman who learns. A company that makes more money.</p>
      </motion.div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {cols.map(([who, line, items]) => (
          <motion.div key={who} {...fade} className={CARD}>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#80a0e0]">{who}</div>
            <h3 className="mt-2 border-0 text-xl font-semibold text-white">{line}</h3>
            <ul className="mt-4 grid gap-3">
              {items.map((i) => (
                <li key={i} className="flex gap-2.5 text-base leading-6 text-white/70"><Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" aria-hidden />{i}</li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

/** The money argument, made with a worked example. */
export function MissedClosing() {
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <motion.div {...fade} className="mx-auto max-w-3xl text-center">
          <h2 className={H2}>One more closing a day pays for everything.</h2>
          <p className="mt-4 text-lg leading-8 text-white/65">You already pay for the lead. The call is where it is won or lost. And a lost call usually does not look lost: it just looks like “not interested”.</p>
        </motion.div>
        <motion.div {...fade} className={`mx-auto mt-10 max-w-3xl ${PANEL}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#80a0e0]">Example: real estate</div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[['One closing is worth', '₪40,000'], ['Your team closes', '2 a day'], ['A third closing a day', '+₪880,000 a month']].map(([l, v]) => (
              <div key={l} className="rounded-2xl bg-white/[0.04] p-4 text-center"><div className="text-sm text-white/55">{l}</div><div className="mt-1 text-2xl font-bold text-white">{v}</div></div>
            ))}
          </div>
          <p className="mt-5 text-center text-base leading-7 text-white/70">That third closing was already on the phone, talking to one of your salesmen. If the wrong thing was said, you never knew. Now you know, and so does he.</p>
          <p className="mt-2 text-center text-xs text-white/40">₪40,000 × 1 extra closing × 22 working days. Your own numbers will differ.</p>
        </motion.div>
      </div>
    </section>
  )
}

/** The origin of the method, told without a name. */
export function Origin() {
  const points = [
    ['Not a chatbot guessing', 'Plugging an AI into call recordings gives you opinions. This reads every call against one fixed, proven method.'],
    ['Built from real recordings', 'A very successful salesman sat for hours and hours recording himself selling. We turned that into a clear, simple system.'],
    ['Real track data', 'It comes from what actually closed, not from theory or a generic prompt.'],
  ]
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        <h2 className={H2}>It is a real salesman’s method, not an AI blabbering.</h2>
        <p className="mt-4 text-lg text-white/60">The value is in what every call is measured against.</p>
      </motion.div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {points.map(([t, d]) => (
          <motion.div key={t} {...fade} className={CARD}><h3 className="border-0 text-xl font-semibold text-white">{t}</h3><p className="mt-2 text-base leading-7 text-white/65">{d}</p></motion.div>
        ))}
      </div>
      <p className="mt-8 text-center text-sm text-white/50">We cannot name him. We are glad to tell you more on a call. <a href="#demo" className="text-[#8fb4f5] underline underline-offset-4">Book a demo</a></p>
    </section>
  )
}

/** Depth: why this is hard to copy. */
export function HardToCopy() {
  const rows = [
    ['A fixed method', 'Every call is read stage by stage: opening, questions, pitch, objection, close.'],
    ['A checklist of 14 questions', 'Did they do what the best do? Yes or no, with the line from the call as proof.'],
    ['Objection handling', 'The objection, what the rep answered, whether it worked, and what to say instead.'],
    ['Live hints', 'A short prompt on the rep’s screen while the call is still going.'],
    ['Weekly coaching', 'Each rep gets the one habit to work on. Managers get the trend.'],
    ['Your own domain and server', 'Your system, separate from every other company, with your own branding.'],
  ]
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <motion.div {...fade} className="mx-auto max-w-3xl text-center"><h2 className={H2}>It is not simple underneath. It looks simple on purpose.</h2></motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {rows.map(([t, d]) => (
            <motion.div key={t} {...fade} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="font-semibold text-white">{t}</div><p className="mt-1 text-white/60">{d}</p></motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

type Out = { id: string; title: string; status: 'live' | 'build'; pitch: string }
const OUTPUTS: Out[] = [
  { id: 'score', title: 'Score and stages', status: 'live', pitch: 'Every call scored, stage by stage, with the moment it slipped.' },
  { id: 'checks', title: 'Did they do it?', status: 'live', pitch: 'A checklist of what the best salesmen do, answered yes or no with the proof from the call.' },
  { id: 'obj', title: 'Objections', status: 'live', pitch: 'The objection, the rep’s answer, whether it worked, and a better answer.' },
  { id: 'talk', title: 'Talk time', status: 'live', pitch: 'Who did the talking. Good salesmen listen more than they speak.' },
  { id: 'import', title: 'Import a recording', status: 'build', pitch: 'Upload a call recorded anywhere, and get it reviewed.' },
  { id: 'board', title: 'Live team board', status: 'build', pitch: 'See who is on a call right now, and for how long.' },
  { id: 'alert', title: 'Bad-call alerts', status: 'build', pitch: 'A message to the manager when a call goes badly, while there is still time to call back.' },
  { id: 'follow', title: 'Follow-up written for you', status: 'build', pitch: 'After the call, the message to send is already written from what was said.' },
  { id: 'script', title: 'Your own script checks', status: 'build', pitch: 'Check that your price, your offer and your next step were said, in your words.' },
  { id: 'pack', title: 'Industry packs', status: 'build', pitch: 'The same system tuned for real estate, agencies, insurance and more.' },
]

const Bar = ({ l, v, c }: { l: string; v: number; c: string }) => (
  <div className="rounded-xl bg-white/[0.04] p-4"><div className="flex justify-between text-sm text-white/80"><span>{l}</span><span>{v}</span></div><div className="mt-2 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full" style={{ width: `${v}%`, background: c }} /></div></div>
)
const Row = ({ a, b, tone }: { a: string; b?: string; tone?: string }) => (
  <div className="flex items-center justify-between gap-3 rounded-xl bg-white/[0.04] px-4 py-3 text-white/85"><span>{a}</span>{b ? <span className={tone ?? 'text-white/50'}>{b}</span> : null}</div>
)

/** Everything the system can produce. What is working today and what we would build are labelled. */
export function Outputs() {
  const [sel, setSel] = useState('checks')
  const o = OUTPUTS.find((x) => x.id === sel)!
  return (
    <section id="outputs" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <motion.div {...fade} className="mx-auto max-w-3xl text-center">
        <h2 className={H2}>More than a score. See what you get.</h2>
        <p className="mt-4 text-lg text-white/60">Once every call is recorded and read, a lot becomes possible. Pick one.</p>
      </motion.div>
      <div className="mx-auto mt-10 max-w-4xl">
        <div className="flex flex-wrap justify-center gap-2" role="tablist">
          {OUTPUTS.map((x) => (
            <button key={x.id} role="tab" aria-selected={sel === x.id} onClick={() => setSel(x.id)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${sel === x.id ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/65 hover:bg-white/10'}`}>{x.title}</button>
          ))}
        </div>
        <div className={`mt-6 ${PANEL}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-white/70">{o.pitch}</p>
            {o.status === 'live' ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300"><Check className="h-3.5 w-3.5" aria-hidden />Working today</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-300"><Clock className="h-3.5 w-3.5" aria-hidden />We build it for you</span>
            )}
          </div>
          <div className="mt-5 grid gap-2">
            {sel === 'score' && <div className="grid gap-3 sm:grid-cols-3">{[['Opening', 82, '#34d399'], ['Questions', 74, '#34d399'], ['Pitch', 55, '#fbbf24'], ['Objection', 31, '#f87171'], ['Close', 20, '#64748b']].map(([l, v, c]) => <Bar key={l as string} l={l as string} v={v as number} c={c as string} />)}</div>}
            {sel === 'checks' && [['Opened with a clear reason for the call', 'Yes', '“Hi Dana, I’m calling about the form you filled in…”'], ['Asked what the customer wants before pitching', 'Yes', '“What are you hoping to change?”'], ['Repeated the problem back in their words', 'No', 'Went straight to the offer'], ['Asked a question before answering an objection', 'No', 'Offered a discount at 3:12'], ['Asked for the next step', 'No', 'Call ended without a time']].map(([a, b, c]) => (
              <div key={a} className="rounded-xl bg-white/[0.04] px-4 py-3"><div className="flex justify-between gap-3 text-white/90"><span>{a}</span><span className={b === 'Yes' ? 'text-emerald-300' : 'text-red-300'}>{b}</span></div><div className="mt-1 text-sm text-white/50">{c}</div></div>
            ))}
            {sel === 'obj' && [['“It’s too expensive”', 'Rep: “I can do 10% off.”', 'Did not work', 'Try: “Compared to what?”'], ['“We already have someone”', 'Rep: “We’re cheaper.”', 'Did not work', 'Try: “How are they doing for you?”']].map(([a, b, c, d]) => (
              <div key={a} className="rounded-xl bg-white/[0.04] px-4 py-3"><div className="text-white/90">{a}</div><div className="mt-1 text-sm text-white/55">{b} · <span className="text-red-300">{c}</span></div><div className="mt-1 text-sm text-emerald-300">{d}</div></div>
            ))}
            {sel === 'talk' && <><Bar l="Rep talked" v={64} c="#f87171" /><Bar l="Customer talked" v={36} c="#34d399" /><p className="text-sm text-white/50">Longest rep monologue: 1 minute 48 seconds.</p></>}
            {sel === 'import' && <div className="rounded-xl border border-dashed border-white/20 p-8 text-center text-white/60">Drop a recording here · MP3, M4A, WAV</div>}
            {sel === 'board' && [['Rep A', 'On a call · 04:12', 'text-emerald-300'], ['Rep B', 'Between calls', 'text-white/45'], ['Rep C', 'On a call · 11:40', 'text-emerald-300'], ['Rep D', 'Offline', 'text-white/45']].map(([n, s, t]) => <Row key={n} a={n} b={s} tone={t} />)}
            {sel === 'alert' && <div className="rounded-xl border border-red-400/30 bg-red-400/10 p-4 text-white/90"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-red-300">Alert to manager · 2 minutes ago</div><p className="mt-1 !mt-1">Rep C’s call with a ₪40,000 lead ended at 3:10 with no next step. Score 31.</p></div>}
            {sel === 'follow' && <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-white/90"><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Ready to send</div><p className="mt-1 !mt-1">“Hi Dana, thanks for the chat. You said follow-up is slow and you get most work from referrals. I’ve booked Thursday 10:00 to show you how we fix that.”</p></div>}
            {sel === 'script' && [['Said the price', 'Said', 'text-emerald-300'], ['Said the guarantee', 'Missed', 'text-red-300'], ['Offered the free first month', 'Missed', 'text-red-300'], ['Booked the next step', 'Said', 'text-emerald-300']].map(([a, b, t]) => <Row key={a} a={a} b={b} tone={t} />)}
            {sel === 'pack' && <div className="grid gap-2 sm:grid-cols-3">{['Real estate', 'Agencies', 'Insurance'].map((n) => <div key={n} className="rounded-xl bg-white/[0.04] p-4 text-center text-white/85">{n}<div className="mt-1 text-xs text-white/45">its own objections, its own checks</div></div>)}</div>}
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/40">Names, figures and quotes on this page are sample content. “We build it for you” means it is not in the system today and would be built for your team.</p>
      </div>
    </section>
  )
}

/** Short, by industry. Real estate is labelled as an example. */
export function Industries() {
  const items = [
    ['Real estate', 'Example', 'One lead can be worth ₪40,000. See which agent loses them, and at which sentence.'],
    ['Agencies and web services', '', 'Hear whether the offer, the price and the next step were really said.'],
    ['Insurance and finance', '', 'Check that the required wording was used on every call.'],
    ['Any team that calls', '', 'If people talk to customers on the phone, the system fits.'],
  ]
  return (
    <section className="border-y border-white/5 bg-white/[0.02]">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <motion.div {...fade} className="mx-auto max-w-3xl text-center"><h2 className={H2}>The same system, whatever you sell</h2></motion.div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map(([t, tag, d]) => (
            <motion.div key={t} {...fade} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"><div className="flex items-center gap-2 font-semibold text-white">{t}{tag ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/60">{tag}</span> : null}</div><p className="mt-2 text-sm leading-6 text-white/60">{d}</p></motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Only integrations that exist in the CRM today. */
export function Integrations() {
  const list = ['Phone calls and SMS', 'Browser dialer', 'Recording and transcription', 'AI call review', 'Email inbox sync', 'Calendar and booking pages', 'Offers and e-signed contracts', 'Leads from your website forms', 'Call lists']
  return (
    <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <motion.h2 {...fade} className="border-0 pb-0 text-2xl font-bold text-white sm:text-3xl">Already connected</motion.h2>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">{list.map((l) => <span key={l} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/75">{l}</span>)}</div>
    </section>
  )
}
