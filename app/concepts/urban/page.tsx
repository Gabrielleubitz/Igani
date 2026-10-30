/* eslint-disable @next/next/no-img-element */
import { JetBrains_Mono, Space_Grotesk } from 'next/font/google'

const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--urb-sans' })
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--urb-mono' })

const LIME = '#d4ff3a'
const MONO = { fontFamily: 'var(--urb-mono)' }

const TICKER = [
  ['Manhattan median', '$1.48M', '▲ 2.1%'],
  ['Days on market', '38', '▼ 4'],
  ['New listings today', '112', '▲ 9'],
  ['Contracts signed', '64', '▲ 12'],
  ['Avg $/sq ft', '$1,840', '▲ 1.4%'],
]

const LISTINGS = [
  { img: '/concepts/city-1.jpg', name: 'Greenwich Loft 4A', hood: 'Tribeca', price: '$3,850,000', psf: '$2,140', floor: '4', beds: '3 BD · 2.5 BA', big: true },
  { img: '/concepts/city-2.jpg', name: 'The Mercer 12F', hood: 'SoHo', price: '$2,295,000', psf: '$1,910', floor: '12', beds: '2 BD · 2 BA' },
  { img: '/concepts/city-3.jpg', name: 'Hudson Yards 41C', hood: 'Chelsea', price: '$1,675,000', psf: '$1,760', floor: '41', beds: '1 BD · 1.5 BA' },
  { img: '/concepts/city-4.jpg', name: 'Wall St 28H', hood: 'FiDi', price: '$1,120,000', psf: '$1,390', floor: '28', beds: '1 BD · 1 BA' },
]

const BUILDINGS = [
  ['One Hudson Tower', 'Chelsea', '214', '$1,960', [3, 4, 4, 5, 6, 6, 7]],
  ['The Greenwich', 'Tribeca', '88', '$2,310', [5, 5, 6, 6, 6, 7, 8]],
  ['70 Pine', 'FiDi', '612', '$1,280', [4, 3, 4, 4, 5, 5, 5]],
  ['Mercer House', 'SoHo', '46', '$2,050', [6, 6, 5, 6, 7, 7, 8]],
] as const

function Spark({ points }: { points: readonly number[] }) {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * 14},${30 - p * 3.4}`).join(' ')
  return (
    <svg viewBox="0 0 84 32" className="h-7 w-24" aria-hidden>
      <path d={d} fill="none" stroke={LIME} strokeWidth="2" />
    </svg>
  )
}

/** Concept: a downtown condo specialist. Monochrome, oversized type, data everywhere. */
export default function UrbanConcept() {
  return (
    <div className={`${grotesk.variable} ${mono.variable} min-h-screen bg-[#0a0a0a] text-white [&_h2]:border-none [&_h2]:pb-0`} style={{ fontFamily: 'var(--urb-sans)' }}>
      {/* Market ticker */}
      <div className="overflow-hidden border-b border-white/10 bg-black py-2 text-[11px] uppercase tracking-[0.12em]" style={MONO}>
        <div className="funnel-marquee flex w-max gap-10 whitespace-nowrap px-5" style={{ animationDuration: '40s' }}>
          {[...TICKER, ...TICKER].map(([k, v, c], i) => (
            <span key={i} className="flex gap-2">
              <span className="text-white/45">{k}</span>
              <span>{v}</span>
              <span style={{ color: c.startsWith('▲') ? LIME : '#ff6b5a' }}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-5 sm:px-10">
        <div className="text-xl font-bold tracking-[-0.03em] sm:text-2xl">
          KAI<span style={{ color: LIME }}>/</span>MERCER
        </div>
        <nav className="hidden items-center gap-8 text-[14px] text-white/70 lg:flex">
          <span>Condos</span>
          <span>New development</span>
          <span>Buildings</span>
          <span>Market report</span>
        </nav>
        <span className="rounded-full px-4 py-2.5 text-[13px] font-bold text-black sm:px-5" style={{ background: LIME }}>
          Value my condo →
        </span>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1400px] px-5 pb-12 pt-6 sm:px-10 lg:pb-20">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr] lg:items-end">
          <div>
            <p className="text-[12px] uppercase tracking-[0.2em] text-white/50" style={MONO}>
              Manhattan condos · 1,200+ closed
            </p>
            <h1 className="mt-5 text-[clamp(3.4rem,10vw,9.5rem)] font-bold uppercase leading-[0.85] tracking-[-0.055em]">
              Sold
              <br />
              above the
              <br />
              <span style={{ color: LIME }}>skyline.</span>
            </h1>
          </div>
          <div className="relative">
            <img src="/concepts/city-hero.jpg" alt="" className="aspect-[4/5] w-full rounded-[28px] object-cover grayscale-[35%]" />
            <div className="absolute left-4 top-4 rounded-2xl bg-black/75 px-4 py-3 backdrop-blur" style={MONO}>
              <div className="text-[10px] uppercase tracking-[0.15em] text-white/50">Avg sold vs. list</div>
              <div className="text-2xl" style={{ color: LIME }}>
                +3.8%
              </div>
            </div>
            <div className="absolute bottom-4 right-4 rounded-2xl px-4 py-3 text-black" style={{ background: LIME, ...MONO }}>
              <div className="text-[10px] uppercase tracking-[0.15em]">Median days to contract</div>
              <div className="text-2xl font-medium">19</div>
            </div>
          </div>
        </div>

        {/* Neighborhood search (IDX) */}
        <div className="mt-10 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-[12px] uppercase tracking-[0.2em] text-white/50" style={MONO}>
            Search by
          </span>
          {[
            ['Tribeca', 41],
            ['SoHo', 37],
            ['Chelsea', 88],
            ['FiDi', 104],
            ['West Village', 29],
            ['Upper East Side', 156],
          ].map(([n, c], i) => (
            <span key={n} className={`rounded-full border px-4 py-2 text-[14px] ${i === 0 ? 'border-transparent font-bold text-black' : 'border-white/20'}`} style={i === 0 ? { background: LIME } : undefined}>
              {n} <span className={i === 0 ? 'text-black/60' : 'text-white/40'}>{c}</span>
            </span>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-[1400px] px-5 py-16 sm:px-10 sm:py-24">
          <div className="flex items-end justify-between">
            <h2 className="text-5xl font-bold uppercase leading-none tracking-[-0.045em] sm:text-7xl">
              On the <span style={{ color: LIME }}>market</span>
            </h2>
            <span className="hidden text-[13px] text-white/50 sm:block" style={MONO}>
              04 / 32 listings
            </span>
          </div>
          <div className="mt-10 grid gap-4 md:h-[900px] md:grid-cols-3 md:grid-rows-3">
            {LISTINGS.map((l) => (
              <article key={l.name} className={`group relative overflow-hidden rounded-[24px] ${l.big ? 'md:col-span-2 md:row-span-3' : ''}`}>
                <img src={l.img} alt="" className="aspect-[4/3] w-full object-cover md:aspect-auto md:h-full" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full px-3 py-1 text-[11px] font-bold uppercase text-black" style={{ background: LIME, ...MONO }}>
                  Floor {l.floor}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="text-[12px] uppercase tracking-[0.15em] text-white/60" style={MONO}>
                    {l.hood} · {l.beds}
                  </div>
                  <div className={`mt-1 font-bold tracking-[-0.03em] ${l.big ? 'text-3xl sm:text-5xl' : 'text-2xl'}`}>{l.name}</div>
                  <div className="mt-2 flex gap-4 text-[14px]" style={MONO}>
                    <span>{l.price}</span>
                    <span className="text-white/50">{l.psf}/sf</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Building intelligence */}
      <section className="border-t border-white/10 bg-[#111]">
        <div className="mx-auto grid max-w-[1400px] gap-10 px-5 py-16 sm:px-10 sm:py-24 lg:grid-cols-[1fr_1.5fr]">
          <div>
            <h2 className="text-4xl font-bold uppercase leading-[0.95] tracking-[-0.04em] sm:text-6xl">
              Know the
              <br />
              <span style={{ color: LIME }}>building.</span>
            </h2>
            <p className="mt-5 max-w-sm text-[16px] leading-relaxed text-white/60">
              Every building I sell in, tracked weekly: inventory, price per foot, and where it&rsquo;s heading.
            </p>
          </div>
          <div className="overflow-hidden rounded-[24px] border border-white/10" style={MONO}>
            <div className="grid grid-cols-[1.6fr_1fr_1fr_auto] gap-4 border-b border-white/10 px-5 py-3 text-[11px] uppercase tracking-[0.12em] text-white/40">
              <span>Building</span>
              <span>Units</span>
              <span>Avg $/sf</span>
              <span>12 mo</span>
            </div>
            {BUILDINGS.map(([name, hood, units, psf, pts]) => (
              <div key={name} className="grid grid-cols-[1.6fr_1fr_1fr_auto] items-center gap-4 border-b border-white/[0.06] px-5 py-4 text-[14px] last:border-b-0">
                <span>
                  <span className="block font-medium" style={{ fontFamily: 'var(--urb-sans)' }}>
                    {name}
                  </span>
                  <span className="text-[12px] text-white/40">{hood}</span>
                </span>
                <span className="text-white/70">{units}</span>
                <span>{psf}</span>
                <Spark points={pts} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Valuation */}
      <section className="relative overflow-hidden">
        <img src="/concepts/city-night.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
        <div className="relative mx-auto grid max-w-[1400px] gap-10 px-5 py-20 sm:px-10 sm:py-28 lg:grid-cols-2 lg:items-center">
          <h2 className="text-5xl font-bold uppercase leading-[0.9] tracking-[-0.05em] sm:text-7xl">
            What&rsquo;s your
            <br />
            unit <span style={{ color: LIME }}>worth?</span>
          </h2>
          <div className="rounded-[28px] bg-black/80 p-6 backdrop-blur sm:p-8">
            <div className="grid grid-cols-[2fr_1fr] gap-3">
              {['Building address', 'Apt #'].map((f) => (
                <div key={f} className="rounded-2xl border border-white/15 px-4 py-4 text-[14px] text-white/40" style={MONO}>
                  {f}
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-white/15 px-4 py-4 text-[14px] text-white/40" style={MONO}>
              Email or phone
            </div>
            <div className="mt-4 rounded-2xl py-4 text-center text-[15px] font-bold text-black" style={{ background: LIME }}>
              Get my building comps →
            </div>
            <p className="mt-3 text-center text-[12px] text-white/40" style={MONO}>
              Comps from your line, not your zip code.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-8 text-[12px] text-white/40 sm:flex-row sm:justify-between sm:px-10" style={MONO}>
          <span>
            KAI<span style={{ color: LIME }}>/</span>MERCER · Manhattan condos
          </span>
          <span>Concept design by IGANI · Not a real agent or listing</span>
        </div>
      </footer>
    </div>
  )
}
