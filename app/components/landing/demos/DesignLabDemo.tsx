'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowUpRight, Bell, Search } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'

const ACCENTS = [
  { name: 'IGANI blue', value: '#4080E0' },
  { name: 'Mint', value: '#2fd4a7' },
  { name: 'Coral', value: '#ff6b6b' },
  { name: 'Violet', value: '#9b6bff' },
  { name: 'Amber', value: '#f6b53f' },
]

const BARS = [42, 68, 55, 80, 63, 92, 74]

export function DesignLabDemo() {
  const { language } = useLanguage()
  const c = landingContent.capabilities.design.controls
  const [accent, setAccent] = useState(ACCENTS[0].value)
  const [radius, setRadius] = useState(14)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  const dark = theme === 'dark'
  const vars = {
    ['--accent' as string]: accent,
    ['--r' as string]: `${radius}px`,
    ['--bg' as string]: dark ? '#050d1c' : '#f5f7fb',
    ['--panel' as string]: dark ? 'rgba(255,255,255,0.04)' : '#ffffff',
    ['--line' as string]: dark ? 'rgba(255,255,255,0.08)' : 'rgba(10,20,40,0.08)',
    ['--fg' as string]: dark ? '#ffffff' : '#0b1526',
    ['--muted' as string]: dark ? 'rgba(255,255,255,0.55)' : 'rgba(11,21,38,0.55)',
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      {/* Product preview */}
      <div
        style={vars}
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_24px_80px_-32px_rgba(0,0,0,0.8)] transition-colors duration-500"
      >
        <div
          className="h-full min-h-[360px] p-4 transition-colors duration-500 sm:p-6"
          style={{ background: 'var(--bg)', color: 'var(--fg)' }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 items-center justify-center text-[11px] font-bold text-white transition-all duration-300"
                style={{ background: 'var(--accent)', borderRadius: 'calc(var(--r) * 0.6)' }}
              >
                A
              </span>
              <span className="text-sm font-semibold">Atlas</span>
            </div>
            <div
              className="flex flex-1 items-center gap-2 px-3 py-1.5 text-xs transition-all duration-300 sm:max-w-[220px]"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)', color: 'var(--muted)' }}
            >
              <Search className="h-3.5 w-3.5" />
              Search…
            </div>
            <span
              className="flex h-7 w-7 items-center justify-center transition-all duration-300"
              style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'calc(var(--r) * 0.6)', color: 'var(--muted)' }}
            >
              <Bell className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* KPIs */}
          <div className="mt-5 grid grid-cols-3 gap-3">
            {[
              { l: 'MRR', v: '$48.2k', d: '+12%' },
              { l: 'Active', v: '3,904', d: '+4.1%' },
              { l: 'Churn', v: '1.2%', d: '-0.3%' },
            ].map((k) => (
              <div
                key={k.l}
                className="p-3 transition-all duration-300"
                style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}
              >
                <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--muted)' }}>
                  {k.l}
                </p>
                <p className="!mt-1 text-lg font-semibold tracking-tight">{k.v}</p>
                <p className="!mt-0.5 flex items-center gap-1 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>
                  <ArrowUpRight className="h-3 w-3" />
                  {k.d}
                </p>
              </div>
            ))}
          </div>

          {/* Chart */}
          <div
            className="mt-3 p-4 transition-all duration-300"
            style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Revenue</p>
              <span
                className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition-all duration-300"
                style={{ background: 'var(--accent)', borderRadius: 'calc(var(--r) * 0.5)' }}
              >
                Live
              </span>
            </div>
            <div className="mt-4 flex h-24 items-end gap-2">
              {BARS.map((h, i) => (
                <motion.div
                  key={i}
                  className="flex-1 transition-all duration-300"
                  style={{
                    background: `linear-gradient(to top, var(--accent), color-mix(in srgb, var(--accent) 35%, transparent))`,
                    borderRadius: 'calc(var(--r) * 0.4)',
                  }}
                  initial={{ height: 0 }}
                  whileInView={{ height: `${h}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            type="button"
            className="mt-3 w-full py-2.5 text-sm font-semibold text-white transition-all duration-300"
            style={{ background: 'var(--accent)', borderRadius: 'var(--r)' }}
          >
            Upgrade workspace
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-[#040b18] p-5">
        <div>
          <p className="!mt-0 text-xs text-white/55">{c.accent[language]}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAccent(a.value)}
                aria-label={a.name}
                aria-pressed={accent === a.value}
                className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                  accent === a.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#040b18]' : ''
                }`}
                style={{ background: a.value }}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <p className="!mt-0 text-xs text-white/55">{c.radius[language]}</p>
            <span className="font-mono text-xs text-white/70">{radius}px</span>
          </div>
          <input
            type="range"
            min={0}
            max={28}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            aria-label={c.radius[language]}
            className="landing-range mt-3 w-full"
            style={{ ['--accent' as string]: accent }}
          />
        </div>

        <div>
          <p className="!mt-0 text-xs text-white/55">{c.theme[language]}</p>
          <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(['dark', 'light'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                aria-pressed={theme === t}
                className={`rounded-full py-1.5 text-xs font-semibold transition-colors ${
                  theme === t ? 'bg-white text-[#04101e]' : 'text-white/60 hover:text-white'
                }`}
              >
                {t === 'dark' ? c.dark[language] : c.light[language]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 font-mono text-[11px] leading-5 text-white/55">
          <span className="text-[#9ec0f5]">--accent</span>: {accent};<br />
          <span className="text-[#9ec0f5]">--radius</span>: {radius}px;<br />
          <span className="text-[#9ec0f5]">--theme</span>: {theme};
        </div>
      </div>
    </div>
  )
}
