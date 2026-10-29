/* eslint-disable @next/next/no-img-element */
import { DM_Sans, Fraunces } from 'next/font/google'

const head = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--fam-head' })
const body = DM_Sans({ subsets: ['latin'], variable: '--fam-body' })

const LISTINGS = [
  { img: '/concepts/fam-1.jpg', price: '$489,000', street: '1208 Maple Hollow Dr', beds: 4, baths: 3, sqft: '2,340', tag: 'Just listed', school: 'Top-rated schools' },
  { img: '/concepts/fam-2.jpg', price: '$615,000', street: '42 Brookstone Ln', beds: 5, baths: 3.5, sqft: '3,120', tag: 'Open house Sat', school: '3-car garage' },
  { img: '/concepts/fam-3.jpg', price: '$552,500', street: '907 Juniper Ridge', beds: 4, baths: 3, sqft: '2,780', tag: 'Price improved', school: 'Backs to greenbelt' },
]

const AREAS = [
  { img: '/concepts/fam-4.jpg', name: 'Cedar Park', note: 'Great schools · parks · 25 min to downtown' },
  { img: '/concepts/fam-5.jpg', name: 'Leander', note: 'New builds · room to grow' },
  { img: '/concepts/fam-interior.jpg', name: 'Round Rock', note: 'Family favorite · walkable centers' },
]

const green = '#2f6b4f'

/** Concept: a suburban family-home team. Warm, friendly, seller-lead focused. */
export default function FamilyConcept() {
  return (
    <div className={`${head.variable} ${body.variable} min-h-screen bg-[#fbf8f3] text-[#1f2a24] [&_h2]:border-none [&_h2]:pb-0`} style={{ fontFamily: 'var(--fam-body)' }}>
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-[#fbf8f3]/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-[15px] font-bold text-white" style={{ background: green }}>
              H
            </span>
            <span style={{ fontFamily: 'var(--fam-head)' }} className="text-xl font-semibold">
              The Harper Home Team
            </span>
          </div>
          <nav className="hidden items-center gap-8 text-[15px] text-[#1f2a24]/75 lg:flex">
            <span>Buy</span>
            <span>Sell</span>
            <span>Neighborhoods</span>
            <span>Reviews</span>
          </nav>
          <span className="rounded-full px-4 py-2.5 text-[14px] font-semibold text-white sm:px-5" style={{ background: green }}>
            Call (512) 555-0148
          </span>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-12 sm:px-10 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pb-24 lg:pt-16">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e6efe8] px-3.5 py-1.5 text-[13px] font-medium" style={{ color: green }}>
            ★ 4.9 · 260+ five-star Google reviews
          </span>
          <h1 style={{ fontFamily: 'var(--fam-head)' }} className="mt-6 text-[clamp(2.6rem,5.5vw,4.6rem)] font-semibold leading-[1.02] tracking-[-0.02em]">
            Helping families find their place in <span style={{ color: green }}>Cedar Park.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[18px] leading-relaxed text-[#1f2a24]/70">
            We&rsquo;re a local team of four. We know the school zones, the quiet streets and what homes on yours really sell for.
          </p>
          {/* Search (IDX) */}
          <div className="mt-8 flex max-w-xl flex-col gap-2 rounded-2xl bg-white p-2 shadow-[0_20px_50px_-20px_rgba(31,42,36,0.25)] sm:flex-row">
            <div className="flex-1 px-4 py-3 text-[15px] text-[#1f2a24]/45">City, neighborhood or school…</div>
            <div className="rounded-xl px-6 py-3 text-center text-[15px] font-semibold text-white" style={{ background: green }}>
              Search homes
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-[14px]">
            {['Buying a home', 'Selling a home', 'What’s my home worth?'].map((t, i) => (
              <span key={t} className={`rounded-full border px-4 py-2 ${i === 2 ? 'border-transparent font-semibold text-white' : 'border-black/10 bg-white'}`} style={i === 2 ? { background: '#d9822b' } : undefined}>
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="relative">
          <img src="/concepts/fam-hero.jpg" alt="" className="aspect-[4/3] w-full rounded-[28px] object-cover" />
          <div className="absolute -bottom-5 left-5 rounded-2xl bg-white px-5 py-4 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.3)]">
            <div className="text-[13px] text-[#1f2a24]/55">Sold this year</div>
            <div style={{ fontFamily: 'var(--fam-head)' }} className="text-2xl font-semibold">
              84 families moved
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-10 sm:py-24">
          <div className="flex items-end justify-between gap-6">
            <h2 style={{ fontFamily: 'var(--fam-head)' }} className="text-3xl font-semibold sm:text-5xl">
              New on the market
            </h2>
            <span className="hidden text-[15px] font-semibold sm:block" style={{ color: green }}>
              See all 46 homes →
            </span>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {LISTINGS.map((l) => (
              <article key={l.street} className="overflow-hidden rounded-3xl border border-black/5 bg-[#fbf8f3]">
                <div className="relative">
                  <img src={l.img} alt="" className="aspect-[3/2] w-full object-cover" />
                  <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[12px] font-semibold">{l.tag}</span>
                </div>
                <div className="p-5">
                  <div style={{ fontFamily: 'var(--fam-head)' }} className="text-2xl font-semibold">
                    {l.price}
                  </div>
                  <div className="mt-1 text-[15px] text-[#1f2a24]/75">{l.street}</div>
                  <div className="mt-3 flex gap-4 text-[14px] text-[#1f2a24]/60">
                    <span>{l.beds} beds</span>
                    <span>{l.baths} baths</span>
                    <span>{l.sqft} sq ft</span>
                  </div>
                  <div className="mt-4 inline-block rounded-full bg-[#e6efe8] px-3 py-1 text-[12px] font-medium" style={{ color: green }}>
                    {l.school}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Home valuation */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-10 sm:py-24">
        <div className="grid gap-10 rounded-[32px] p-8 text-white sm:p-12 lg:grid-cols-2 lg:items-center" style={{ background: green }}>
          <div>
            <h2 style={{ fontFamily: 'var(--fam-head)' }} className="text-3xl font-semibold leading-[1.08] sm:text-5xl">
              Thinking of selling? Find out what your home is worth.
            </h2>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-white/80">
              Free, in 24 hours, from a real person on our team, with the three most recent sales near you.
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-[#1f2a24] sm:p-6">
            {['Home address', 'Your name', 'Phone'].map((f) => (
              <div key={f} className="mb-3 rounded-xl border border-black/10 px-4 py-3.5 text-[15px] text-[#1f2a24]/45">
                {f}
              </div>
            ))}
            <div className="rounded-xl py-3.5 text-center text-[15px] font-semibold text-white" style={{ background: '#d9822b' }}>
              Get my free home value
            </div>
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-10 sm:pb-24">
        <h2 style={{ fontFamily: 'var(--fam-head)' }} className="text-3xl font-semibold sm:text-5xl">
          Neighborhood guides
        </h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {AREAS.map((a) => (
            <div key={a.name}>
              <img src={a.img} alt="" className="aspect-[3/2] w-full rounded-3xl object-cover" />
              <div style={{ fontFamily: 'var(--fam-head)' }} className="mt-4 text-2xl font-semibold">
                {a.name}
              </div>
              <div className="text-[15px] text-[#1f2a24]/60">{a.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews + team */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-10 sm:py-24 lg:grid-cols-2">
          <div>
            <div className="text-[18px]" style={{ color: '#d9822b' }}>
              ★★★★★
            </div>
            <p style={{ fontFamily: 'var(--fam-head)' }} className="mt-4 text-2xl font-medium leading-snug sm:text-3xl">
              &ldquo;They found us a house in the school zone we wanted before it even hit the market, and sold our old one in a weekend.&rdquo;
            </p>
            <p className="mt-4 text-[15px] text-[#1f2a24]/60">The Nguyen family · Cedar Park</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['Sarah Harper', 'Team lead'],
              ['Marcus Bell', 'Buyer specialist'],
              ['Priya Shah', 'Listing specialist'],
              ['Tom Alvarez', 'Client care'],
            ].map(([n, r], i) => (
              <div key={n} className="rounded-2xl bg-[#fbf8f3] p-5">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[16px] font-bold text-white"
                  style={{ background: ['#2f6b4f', '#d9822b', '#3d5a80', '#8a5a44'][i] }}
                >
                  {n
                    .split(' ')
                    .map((w) => w[0])
                    .join('')}
                </span>
                <div className="mt-3 text-[16px] font-semibold">{n}</div>
                <div className="text-[14px] text-[#1f2a24]/60">{r}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-[13px] text-[#1f2a24]/50 sm:flex-row sm:justify-between sm:px-10">
          <span>The Harper Home Team · Cedar Park, TX</span>
          <span>Concept design by IGANI · Not a real team or listing</span>
        </div>
      </footer>
    </div>
  )
}
