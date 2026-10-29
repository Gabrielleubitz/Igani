/* eslint-disable @next/next/no-img-element */
import { Cormorant_Garamond, Inter } from 'next/font/google'

const serif = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--lux-serif' })
const sans = Inter({ subsets: ['latin'], variable: '--lux-sans' })

const LISTINGS = [
  { img: '/concepts/lux-1.jpg', price: '$8,950,000', name: 'Casa Mirador', place: 'Malibu', beds: 5, baths: 6, sqft: '6,420', tag: 'New listing' },
  { img: '/concepts/lux-2.jpg', price: '$6,275,000', name: 'The Glass House', place: 'Pacific Palisades', beds: 4, baths: 5, sqft: '4,980', tag: 'Open Sun 1–4' },
  { img: '/concepts/lux-3.jpg', price: '$12,400,000', name: 'Villa Serena', place: 'Bel Air', beds: 6, baths: 8, sqft: '9,150', tag: 'Off-market' },
]

const AREAS = [
  { img: '/concepts/lux-4.jpg', name: 'Malibu', note: 'Median $4.8M · 41 homes for sale' },
  { img: '/concepts/lux-5.jpg', name: 'Pacific Palisades', note: 'Median $5.2M · 23 homes for sale' },
  { img: '/concepts/lux-interior.jpg', name: 'Brentwood', note: 'Median $3.9M · 37 homes for sale' },
]

const gold = 'text-[#b89b6a]'

/** Concept: a luxury agent's site. Dark, editorial, listing-first. */
export default function LuxuryConcept() {
  return (
    <div className={`${serif.variable} ${sans.variable} min-h-screen bg-[#0d0d0c] text-[#f3eee6] [&_h2]:border-none [&_h2]:pb-0`} style={{ fontFamily: 'var(--lux-sans)' }}>
      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-10">
          <div style={{ fontFamily: 'var(--lux-serif)' }} className="text-2xl tracking-[0.18em] sm:text-[28px]">
            ELENA MARLOWE
          </div>
          <nav className="hidden items-center gap-9 text-[12px] uppercase tracking-[0.22em] text-white/80 lg:flex">
            <span>Properties</span>
            <span>Neighborhoods</span>
            <span>Sold</span>
            <span>About</span>
          </nav>
          <span className="border border-white/40 px-4 py-2.5 text-[11px] uppercase tracking-[0.2em] sm:px-5">What&rsquo;s my home worth?</span>
        </div>
      </header>

      {/* Hero */}
      <section className="relative flex min-h-[100svh] items-end">
        <img src="/concepts/lux-hero.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0c] via-[#0d0d0c]/30 to-[#0d0d0c]/50" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-14 sm:px-10 sm:pb-20">
          <p className={`text-[12px] uppercase tracking-[0.3em] ${gold}`}>Luxury real estate · Malibu to Bel Air</p>
          <h1 style={{ fontFamily: 'var(--lux-serif)' }} className="mt-5 max-w-4xl text-[clamp(3rem,7vw,6.5rem)] font-normal leading-[0.95]">
            Extraordinary homes, <em className="text-[#e6d3ad]">quietly</em> sold.
          </h1>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/75">
            Twenty years representing the finest properties on the Westside, with a marketing reach most homes never get.
          </p>
          {/* Search (IDX) */}
          <div className="mt-10 grid max-w-4xl grid-cols-2 gap-px overflow-hidden border border-white/20 bg-white/20 sm:grid-cols-4">
            {[
              ['Location', 'Malibu, CA'],
              ['Price', '$3M – $15M'],
              ['Beds', '4+'],
            ].map(([k, v]) => (
              <div key={k} className="bg-[#0d0d0c]/70 px-5 py-4 backdrop-blur">
                <div className="text-[10px] uppercase tracking-[0.25em] text-white/50">{k}</div>
                <div className="mt-1 text-[15px]">{v}</div>
              </div>
            ))}
            <div className="flex items-center justify-center bg-[#e6d3ad] px-5 py-4 text-[12px] font-semibold uppercase tracking-[0.25em] text-[#0d0d0c]">Search homes</div>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-8 px-5 py-12 sm:grid-cols-4 sm:px-10">
          {[
            ['$1.2B', 'in career sales'],
            ['310+', 'homes represented'],
            ['98%', 'of asking, on average'],
            ['21 days', 'median time on market'],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={{ fontFamily: 'var(--lux-serif)' }} className="text-4xl sm:text-5xl">
                {n}
              </div>
              <div className="mt-1 text-[12px] uppercase tracking-[0.2em] text-white/55">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Listings */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <div className="flex items-end justify-between gap-6">
          <h2 style={{ fontFamily: 'var(--lux-serif)' }} className="text-4xl sm:text-6xl">
            Featured <em className="text-[#e6d3ad]">properties</em>
          </h2>
          <span className={`hidden text-[12px] uppercase tracking-[0.22em] sm:block ${gold}`}>View all 18 →</span>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {LISTINGS.map((l) => (
            <article key={l.name}>
              <div className="relative overflow-hidden">
                <img src={l.img} alt="" className="aspect-[4/5] w-full object-cover" />
                <span className="absolute left-4 top-4 bg-[#0d0d0c]/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.22em]">{l.tag}</span>
              </div>
              <div className="mt-5 flex items-baseline justify-between">
                <h3 style={{ fontFamily: 'var(--lux-serif)' }} className="text-2xl">
                  {l.name}
                </h3>
                <span className="text-[15px] text-[#e6d3ad]">{l.price}</span>
              </div>
              <div className="mt-1 text-[13px] text-white/55">
                {l.place} · {l.beds} bd · {l.baths} ba · {l.sqft} sq ft
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Home valuation */}
      <section className="relative overflow-hidden">
        <img src="/concepts/lux-interior.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-10 sm:py-28 lg:grid-cols-2 lg:items-center">
          <div>
            <p className={`text-[12px] uppercase tracking-[0.3em] ${gold}`}>For sellers</p>
            <h2 style={{ fontFamily: 'var(--lux-serif)' }} className="mt-4 text-4xl leading-[1.02] sm:text-6xl">
              What is your home <em className="text-[#e6d3ad]">really</em> worth?
            </h2>
            <p className="mt-5 max-w-md text-[16px] leading-relaxed text-white/70">
              A private, no-obligation valuation from Elena, based on this week&rsquo;s sales on your street, not an algorithm.
            </p>
          </div>
          <div className="border border-white/15 bg-[#0d0d0c]/80 p-6 backdrop-blur sm:p-8">
            {['Property address', 'Your name', 'Email or phone'].map((f) => (
              <div key={f} className="border-b border-white/15 py-4 text-[14px] text-white/45">
                {f}
              </div>
            ))}
            <div className="mt-6 bg-[#e6d3ad] py-4 text-center text-[12px] font-semibold uppercase tracking-[0.25em] text-[#0d0d0c]">Request my valuation</div>
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-10 sm:py-28">
        <h2 style={{ fontFamily: 'var(--lux-serif)' }} className="text-4xl sm:text-6xl">
          The <em className="text-[#e6d3ad]">neighborhoods</em>
        </h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {AREAS.map((a) => (
            <div key={a.name} className="relative overflow-hidden">
              <img src={a.img} alt="" className="aspect-[3/2] w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 p-5">
                <div style={{ fontFamily: 'var(--lux-serif)' }} className="text-3xl">
                  {a.name}
                </div>
                <div className="text-[12px] text-white/70">{a.note}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="border-t border-white/10">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <p style={{ fontFamily: 'var(--lux-serif)' }} className="text-3xl italic leading-snug text-[#f3eee6] sm:text-[42px]">
            &ldquo;Elena sold our home in eleven days, over asking, and we never once felt like just another listing.&rdquo;
          </p>
          <p className={`mt-6 text-[12px] uppercase tracking-[0.25em] ${gold}`}>Sellers · Pacific Palisades</p>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 text-[12px] text-white/45 sm:flex-row sm:justify-between sm:px-10">
          <span style={{ fontFamily: 'var(--lux-serif)' }} className="text-xl tracking-[0.18em] text-white/80">
            ELENA MARLOWE
          </span>
          <span>Concept design by IGANI · Not a real agent or listing</span>
        </div>
      </footer>
    </div>
  )
}
