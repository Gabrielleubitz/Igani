'use client'

import { useState } from 'react'

/** Interactive model of the CRM (sample data only, nothing here is a real call): live call → review → weekly scorecard → manager view. */

type Tab = 'live' | 'review' | 'week' | 'team'
const TABS: { id: Tab; label: string; blurb: string }[] = [
  { id: 'live', label: '1 · On the call', blurb: 'The rep dials from the browser. The call is recorded and a short hint appears while they talk.' },
  { id: 'review', label: '2 · Review', blurb: 'Minutes later the call is transcribed and scored. Click a stage to see what happened and what to say instead.' },
  { id: 'week', label: '3 · Rep scorecard', blurb: 'Each rep sees their week: score trend and the one habit to work on next.' },
  { id: 'team', label: '4 · Manager view', blurb: 'Managers see every rep and every call, and can open any review.' },
]

const STAGES = [
  { id: 'open', label: 'Opening', state: 'On the line', color: '#34d399', x: 70, at: '0:00',
    note: 'Clear introduction and a reason for the call within the first 20 seconds.', better: '' },
  { id: 'q', label: 'Questions', state: 'On the line', color: '#34d399', x: 185, at: '1:05',
    note: 'Three open questions about how the prospect finds customers today. Good pace, the prospect did most of the talking.', better: '' },
  { id: 'pitch', label: 'Pitch', state: 'Shaky', color: '#fbbf24', x: 300, at: '2:10',
    note: 'The pitch started before the prospect’s problem was repeated back, so it sounded generic.', better: '“So if I’ve got this right, leads come in but follow-up is slow. Is that the main thing?”' },
  { id: 'obj', label: 'Objection', state: 'Slipped', color: '#f87171', x: 415, at: '3:12',
    note: 'On “we already have a system”, the rep moved straight to a discount instead of asking about it.', better: '“Fair question. How are most of your customers finding you right now?”' },
  { id: 'close', label: 'Close', state: 'Not reached', color: '#64748b', x: 520, at: '—',
    note: 'The call ended without a next step booked.', better: '“Would Thursday at 10 work for a 20 minute walkthrough?”' },
]

const WEEK = [62, 55, 58, 66, 71]
const REPS = [
  { name: 'Rep A', calls: 31, score: 74, trend: '+6', talk: 41 },
  { name: 'Rep B', calls: 27, score: 66, trend: '+2', talk: 52 },
  { name: 'Rep C', calls: 19, score: 58, trend: '-3', talk: 63 },
  { name: 'Rep D', calls: 12, score: 52, trend: '+4', talk: 58 },
]

const Chip = ({ children, tone }: { children: React.ReactNode; tone: 'g' | 'a' | 'r' | 'n' }) => (
  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${tone === 'g' ? 'bg-emerald-400/15 text-emerald-300' : tone === 'a' ? 'bg-amber-400/15 text-amber-300' : tone === 'r' ? 'bg-red-400/15 text-red-300' : 'bg-white/10 text-white/60'}`}>{children}</span>
)

function Live() {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#0b1b33] p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.16em] text-white/40">Calling</div>
            <div className="text-lg font-semibold text-white">Dana · Sample Co.</div>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Recording 02:14</div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2">
          {['1','2','3','4','5','6','7','8','9','*','0','#'].map((k) => (
            <div key={k} className="rounded-xl bg-white/5 py-2.5 text-center text-white/70">{k}</div>
          ))}
        </div>
        <div className="mt-4 rounded-xl bg-red-500/90 py-2.5 text-center text-sm font-semibold text-white">End call</div>
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-[#4080E0]/40 bg-[#4080E0]/10 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8fb4f5]">Hint while you talk</div>
          <p className="mt-1 !mt-1 text-[15px] leading-6 text-white/90">Ask one more question before you pitch. They haven’t said what’s not working yet.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-white/65">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Live transcript</div>
          <p className="mt-2 !mt-2"><b className="text-white/80">Rep:</b> We help teams follow up with new leads faster.</p>
          <p className="!mt-2"><b className="text-white/80">Dana:</b> Sure, but we get most of our work from referrals.</p>
        </div>
      </div>
    </div>
  )
}

function Review() {
  const [sel, setSel] = useState('obj')
  const s = STAGES.find((x) => x.id === sel)!
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#80a0e0]">Call review</div>
          <div className="mt-1 text-lg font-semibold text-white">Discovery call · 6:12</div>
        </div>
        <div className="flex items-baseline gap-1 rounded-2xl bg-amber-400/10 px-4 py-2 ring-1 ring-amber-400/30">
          <span className="text-4xl font-bold tabular-nums text-amber-300">58</span><span className="text-sm text-white/50">/ 100</span>
        </div>
      </div>
      <svg viewBox="0 0 600 150" className="mt-4 w-full" role="img" aria-label="Sample call drawn on a line with five stages">
        <line x1="30" y1="40" x2="580" y2="40" stroke="#64748b" strokeDasharray="6 6" />
        <line x1="30" y1="100" x2="580" y2="100" stroke="#64748b" strokeDasharray="6 6" />
        <line x1="30" y1="70" x2="580" y2="70" stroke="#94a3b8" strokeWidth="3" opacity=".6" />
        <path d="M30,70 C80,66 120,78 170,68 S250,28 300,30 S370,36 410,44 S470,72 580,72" fill="none" stroke="#4080e0" strokeWidth="4" strokeLinecap="round" />
        {STAGES.map((g) => (
          <g key={g.id} onClick={() => setSel(g.id)} className="cursor-pointer">
            <circle cx={g.x} cy="70" r={sel === g.id ? 13 : 9} fill={g.id === 'close' ? '#0b1b33' : g.color} stroke={g.color} strokeWidth="3" />
            <circle cx={g.x} cy="70" r="24" fill="transparent" />
            <text x={g.x} y="130" textAnchor="middle" fontSize="13" fontWeight="600" fill={sel === g.id ? '#fff' : '#cbd5e1'}>{g.label}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-white">{s.label}</span><Chip tone={s.color === '#34d399' ? 'g' : s.color === '#fbbf24' ? 'a' : s.color === '#f87171' ? 'r' : 'n'}>{s.state}</Chip><span className="text-xs text-white/40">{s.at}</span>
        </div>
        <p className="mt-2 !mt-2 text-[15px] leading-6 text-white/75">{s.note}</p>
        {s.better && (
          <div className="mt-3 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Try instead</div>
            <p className="mt-1 !mt-1 text-[15px] text-white/90">{s.better}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function Week() {
  const max = 100
  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
      <div className="rounded-2xl border border-white/10 bg-[#0b1b33] p-5">
        <div className="text-xs uppercase tracking-[0.16em] text-white/40">This week · average score</div>
        <div className="mt-4 flex h-40 items-end gap-3">
          {WEEK.map((v, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t-lg bg-[#4080E0]" style={{ height: `${(v / max) * 100}%` }} />
              <span className="text-xs text-white/50">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-5">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Do this next call</div>
        <p className="mt-2 !mt-2 text-[15px] leading-6 text-white/90">When a prospect pushes back, ask a question before you answer. This came up in 4 of your 9 calls.</p>
      </div>
    </div>
  )
}

function Team() {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.05] text-xs uppercase tracking-[0.12em] text-white/40">
          <tr><th className="px-4 py-3">Rep</th><th className="px-4 py-3">Calls</th><th className="px-4 py-3">Avg score</th><th className="px-4 py-3">Trend</th><th className="hidden px-4 py-3 sm:table-cell">Rep talk time</th></tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-white/80">
          {REPS.map((r) => (
            <tr key={r.name}><td className="px-4 py-3 font-semibold text-white">{r.name}</td><td className="px-4 py-3">{r.calls}</td><td className="px-4 py-3">{r.score}</td>
              <td className={`px-4 py-3 ${r.trend.startsWith('-') ? 'text-red-300' : 'text-emerald-300'}`}>{r.trend}</td><td className="hidden px-4 py-3 sm:table-cell">{r.talk}%</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ProductTour() {
  const [tab, setTab] = useState<Tab>('review')
  const cur = TABS.find((t) => t.id === tab)!
  return (
    <div className="mx-auto mt-10 max-w-4xl">
      <div role="tablist" className="flex flex-wrap justify-center gap-2">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${tab === t.id ? 'bg-[#4080E0] text-white' : 'bg-white/5 text-white/65 hover:bg-white/10'}`}>{t.label}</button>
        ))}
      </div>
      <p className="mx-auto mt-4 max-w-xl text-center text-white/60">{cur.blurb}</p>
      <div className="mt-6 rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-7">
        {tab === 'live' && <Live />}{tab === 'review' && <Review />}{tab === 'week' && <Week />}{tab === 'team' && <Team />}
      </div>
      <p className="mt-3 text-center text-xs text-white/40">Interactive model of our CRM with sample data. No real calls are shown.</p>
    </div>
  )
}
