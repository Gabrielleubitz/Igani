/* eslint-disable @next/next/no-img-element */
import { Poiret_One, Syne } from 'next/font/google'

const deco = Poiret_One({ subsets: ['latin'], weight: '400', variable: '--cst-deco' })
const syne = Syne({ subsets: ['latin'], weight: ['400', '600', '700', '800'], variable: '--cst-sans' })

const CORAL = '#ff6f61'
const TEAL = '#138f88'
const INK = '#2b1d2a'
const DECO = { fontFamily: 'var(--cst-deco)' }

const LISTINGS = [
  { img: '/concepts/coast-1.jpg', name: 'Casa Flamingo', hood: 'Bal Harbour', price: '$7,495,000', meta: '5 bd · 6 ba · Bayfront', tint: '#ffd9cf' },
  { img: '/concepts/coast-2.jpg', name: 'The Palm Residence', hood: 'Key Biscayne', price: '$5,250,000', meta: '4 bd · 5 ba · Pool', tint: '#cfeee9' },
  { img: '/concepts/coast-3.jpg', name: 'Ocean Drive PH', hood: 'South Beach', price: '$3,980,000', meta: '3 bd · 3.5 ba · Rooftop', tint: '#ffe8b8' },
]

const AREAS = [
  { img: '/concepts/coast-beach.jpg', name: 'South Beach', note: 'Art deco & ocean views' },
  { img: '/concepts/coast-aerial.jpg', name: 'Brickell', note: 'Skyline living' },
  { img: '/concepts/coast-sunset.jpg', name: 'Key Biscayne', note: 'Island quiet' },
]

/** Concept: a Miami Beach agent. Art-deco arches, pastel sunsets, a little neon. */
export default function CoastalConcept() {
  return (
    <div className={`${deco.variable} ${syne.variable} min-h-screen bg-[#fff6ee] [&_h2]:border-none [&_h2]:pb-0`} style={{ fontFamily: 'var(--cst-sans)', color: INK }}>
      {/* Nav */}
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-10">
        <div style={DECO} className="text-2xl tracking-[0.12em] sm:text-3xl">
          CORAL <span style={{ color: CORAL }}>&amp;</span> CO.
        </div>
        <nav className="hidden items-center gap-8 text-[15px] font-semibold lg:flex">
          <span>Homes</span>
          <span>Neighborhoods</span>
          <span>Waterfront</span>
          <span>Our story</span>
        </nav>
        <span className="rounded-full px-4 py-2.5 text-[14px] font-bold text-white sm:px-5" style={{ background: CORAL }}>
          Home value ☀
        </span>
      </header>

      {/* Hero: sunset gradient with an arched window */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg,#fff6ee 0%,#ffd9cf 45%,#ffb199 75%,#ff8f7e 100%)' }} />
        {/* Deco sunrise lines */}
        <div aria-hidden className="absolute bottom-0 left-1/2 h-[520px] w-[1040px] -translate-x-1/2 rounded-t-full opacity-40" style={{ background: 'repeating-radial-gradient(circle at 50% 100%, transparent 0 28px, rgba(255,255,255,0.7) 28px 30px)' }} />
        <div className="relative mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-10 px-5 pb-16 pt-6 sm:px-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end lg:pb-0">
          <div className="lg:pb-24">
            <p style={DECO} className="text-[18px] tracking-[0.25em]">
              MIAMI BEACH · SINCE 2009
            </p>
            <h1 className="mt-4 text-[clamp(2rem,5.6vw,5.2rem)] font-extrabold leading-[0.92] tracking-[-0.04em]">
              Life, but make it{' '}
              <span className="italic" style={{ color: CORAL }}>
                oceanfront.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[18px] leading-relaxed" style={{ color: `${INK}b3` }}>
              Waterfront homes, deco penthouses and bayside escapes, sold by the agent who lives three blocks from the sand.
            </p>
            <div className="mt-8 flex max-w-lg overflow-hidden rounded-full bg-white p-1.5 shadow-[0_20px_40px_-15px_rgba(255,111,97,0.6)]">
              <span className="min-w-0 flex-1 truncate px-5 py-3 text-[15px]" style={{ color: `${INK}80` }}>
                Waterfront in South Beach…
              </span>
              <span className="rounded-full px-6 py-3 text-[15px] font-bold text-white" style={{ background: TEAL }}>
                Search
              </span>
            </div>
          </div>
          <div className="relative mx-auto w-full max-w-[440px] lg:translate-y-6">
            <div className="overflow-hidden rounded-t-full border-[10px] border-white shadow-[0_30px_80px_-30px_rgba(43,29,42,0.5)]">
              <img src="/concepts/coast-hero.jpg" alt="" className="aspect-[3/4] w-full object-cover" />
            </div>
            <div className="absolute -left-6 bottom-10 rotate-[-6deg] rounded-2xl bg-white px-5 py-3 shadow-xl">
              <div className="text-[12px] font-semibold" style={{ color: TEAL }}>
                Just sold
              </div>
              <div className="text-xl font-extrabold">$6.2M · Bayfront</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pastel stripe */}
      <div aria-hidden className="flex h-4">
        {['#ff6f61', '#ffb199', '#ffe8b8', '#cfeee9', '#138f88'].map((c) => (
          <span key={c} className="flex-1" style={{ background: c }} />
        ))}
      </div>

      {/* Listings in arches */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-10 sm:py-24">
        <div className="text-center">
          <p style={DECO} className="text-[18px] tracking-[0.25em]">
            NOW SHOWING
          </p>
          <h2 className="mt-2 text-[2rem] font-extrabold tracking-[-0.03em] sm:text-6xl">Homes with a view</h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {LISTINGS.map((l) => (
            <article key={l.name} className="rounded-t-full p-3 pb-6" style={{ background: l.tint }}>
              <img src={l.img} alt="" className="aspect-[3/4] w-full rounded-t-full object-cover" />
              <div className="px-3 pt-5 text-center">
                <div style={DECO} className="text-[14px] tracking-[0.2em]">
                  {l.hood.toUpperCase()}
                </div>
                <div className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">{l.name}</div>
                <div className="mt-1 text-[15px]" style={{ color: `${INK}99` }}>
                  {l.meta}
                </div>
                <div className="mt-3 inline-block rounded-full bg-white px-4 py-1.5 text-[15px] font-bold" style={{ color: CORAL }}>
                  {l.price}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* After dark */}
      <section className="relative overflow-hidden">
        <img src="/concepts/coast-neon.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1a0f24]/90 via-[#1a0f24]/50 to-transparent" />
        <div className="relative mx-auto max-w-7xl px-5 py-24 text-white sm:px-10 sm:py-32">
          <p style={{ ...DECO, color: '#ff9ad5', textShadow: '0 0 18px #ff4fb4' }} className="text-[22px] tracking-[0.3em]">
            AFTER DARK
          </p>
          <h2 className="mt-3 max-w-xl text-[1.9rem] font-extrabold leading-[1] tracking-[-0.03em] sm:text-6xl">
            The neighborhood guide, <span style={{ color: '#7ff5e8', textShadow: '0 0 20px #20e3d0' }}>by night.</span>
          </h2>
          <p className="mt-5 max-w-md text-[17px] text-white/75">Where to eat, swim and watch the sunset, block by block. Written by locals, for buyers.</p>
        </div>
      </section>

      {/* Neighborhoods */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-10 sm:py-24">
        <div className="grid gap-8 sm:grid-cols-3">
          {AREAS.map((a) => (
            <div key={a.name} className="text-center">
              <img src={a.img} alt="" className="mx-auto aspect-square w-full max-w-[280px] rounded-full border-[8px] border-white object-cover shadow-[0_20px_50px_-20px_rgba(43,29,42,0.4)]" />
              <div className="mt-5 text-2xl font-extrabold">{a.name}</div>
              <div style={DECO} className="text-[16px] tracking-[0.12em]">
                {a.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Valuation */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-10 sm:pb-24">
        <div className="grid gap-10 overflow-hidden rounded-[40px] p-8 text-white sm:p-14 lg:grid-cols-2 lg:items-center" style={{ background: `linear-gradient(135deg, ${CORAL}, #ff9a7a 55%, #ffc48a)` }}>
          <div>
            <p style={DECO} className="text-[18px] tracking-[0.25em]">
              THINKING OF SELLING?
            </p>
            <h2 className="mt-2 text-[2rem] font-extrabold leading-[0.98] tracking-[-0.03em] sm:text-6xl">What&rsquo;s your slice of paradise worth?</h2>
          </div>
          <div className="rounded-[28px] bg-white p-5 sm:p-7" style={{ color: INK }}>
            {['Home address', 'Your name', 'Phone or email'].map((f) => (
              <div key={f} className="mb-3 rounded-full border border-black/10 px-5 py-3.5 text-[15px]" style={{ color: `${INK}70` }}>
                {f}
              </div>
            ))}
            <div className="rounded-full py-3.5 text-center text-[15px] font-bold text-white" style={{ background: TEAL }}>
              Get my free valuation
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-black/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-[13px] sm:flex-row sm:justify-between sm:px-10" style={{ color: `${INK}80` }}>
          <span style={DECO} className="text-lg tracking-[0.12em]">
            CORAL &amp; CO. · Miami Beach
          </span>
          <span>Concept design by IGANI · Not a real agent or listing</span>
        </div>
      </footer>
    </div>
  )
}
