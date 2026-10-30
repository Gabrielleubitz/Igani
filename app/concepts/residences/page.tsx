/* eslint-disable @next/next/no-img-element */
import { Instrument_Serif, Work_Sans } from 'next/font/google'

const serif = Instrument_Serif({ subsets: ['latin'], weight: '400', style: ['normal', 'italic'], variable: '--res-serif' })
const sans = Work_Sans({ subsets: ['latin'], weight: ['400', '500'], variable: '--res-sans' })

const SERIF = { fontFamily: 'var(--res-serif)' }
const LEAF = '#d7f36b'

// Uneven, angled crops: the photos read like leaves cut from the facade
const SHAPES = {
  a: 'polygon(14% 0, 100% 6%, 92% 100%, 0 88%)',
  b: 'polygon(0 10%, 88% 0, 100% 82%, 12% 100%)',
  c: 'polygon(8% 4%, 100% 0, 94% 92%, 0 100%)',
  d: 'polygon(0 0, 96% 12%, 100% 100%, 6% 90%)',
}

const RESIDENCES = [
  ['One bedroom', '58–72 m²', 'from €265,000', '14 available'],
  ['Two bedroom', '84–110 m²', 'from €389,000', '22 available'],
  ['Three bedroom', '128–156 m²', 'from €545,000', '9 available'],
  ['Garden villa', '190 m² + garden', 'from €890,000', '3 available'],
  ['Canopy penthouse', '240 m² + terrace', 'on request', '2 available'],
]

/** Concept: a new-development launch site. Forest green, editorial serif, angled photography. */
export default function ResidencesConcept() {
  return (
    <div
      className={`${serif.variable} ${sans.variable} min-h-screen text-[#eef2e6] [&_h2]:border-none [&_h2]:pb-0`}
      style={{
        fontFamily: 'var(--res-sans)',
        background: 'radial-gradient(70% 50% at 20% 10%, #4f7a3c 0%, transparent 60%), radial-gradient(60% 45% at 90% 60%, #45703a 0%, transparent 60%), #2e4a28',
      }}
    >
      {/* Floating pill nav */}
      <header className="fixed inset-x-0 top-4 z-20 flex justify-center px-4">
        <div className="flex w-full max-w-[520px] items-center justify-between rounded-full border border-white/10 bg-[#1f3320]/80 py-2 pl-5 pr-2 text-[11px] uppercase tracking-[0.18em] backdrop-blur-xl">
          <span className="flex items-center gap-2">
            <span className="flex flex-col gap-[3px]" aria-hidden>
              <span className="h-px w-4 bg-white/80" />
              <span className="h-px w-4 bg-white/80" />
            </span>
            Menu
          </span>
          <span style={{ ...SERIF, color: LEAF }} className="text-[22px] normal-case tracking-normal">
            Linden
          </span>
          <span className="rounded-full border border-white/20 px-4 py-2">Inquire →</span>
        </div>
      </header>

      {/* Hero: the building, softening into green */}
      <section className="relative flex min-h-[100svh] items-end overflow-hidden">
        <img src="/concepts/arb-tower.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#2e4a28]" />
        <div className="relative mx-auto w-full max-w-7xl px-5 pb-16 sm:px-10 sm:pb-24">
          <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: LEAF }}>
            The Linden · Residences in the park
          </p>
          <h1 style={SERIF} className="mt-4 max-w-4xl text-[clamp(3rem,8vw,7.5rem)] leading-[0.92]">
            A home that grows <em>with the city</em>.
          </h1>
          <div className="mt-8 flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.18em]">
            <span className="rounded-full px-5 py-3 text-[#1f3320]" style={{ background: LEAF }}>
              Register interest
            </span>
            <span className="rounded-full border border-white/30 px-5 py-3">Explore in 3D ◎</span>
          </div>
        </div>
      </section>

      {/* Editorial statement with angled photos */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-[1.1fr_1fr] lg:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-[0.25em]" style={{ color: LEAF }}>
            The design
          </p>
          <h2 style={SERIF} className="mt-5 text-[clamp(2rem,3.6vw,3.4rem)] leading-[1.08]">
            The facade is drawn from the form of a tree canopy, a symbol of growth, balance, and longevity. Every residence opens onto green.
          </h2>
          <span className="mt-8 inline-block rounded-full border border-white/25 px-5 py-3 text-[11px] uppercase tracking-[0.18em]">Explore in 3D ◎</span>
        </div>
        <div className="relative h-[420px] sm:h-[520px]">
          <img src="/concepts/arb-facade.jpg" alt="" className="absolute right-0 top-0 h-[78%] w-[62%] object-cover" style={{ clipPath: SHAPES.a }} />
          <img src="/concepts/lux-interior.jpg" alt="" className="absolute bottom-0 left-0 h-[52%] w-[46%] object-cover" style={{ clipPath: SHAPES.b }} />
        </div>
      </section>

      {/* Second statement, mirrored */}
      <section className="mx-auto grid max-w-7xl gap-12 px-5 pb-24 sm:px-10 sm:pb-32 lg:grid-cols-[1fr_1.1fr] lg:items-center">
        <div className="relative order-2 h-[420px] sm:h-[520px] lg:order-1">
          <img src="/concepts/coast-4.jpg" alt="" className="absolute left-[8%] top-0 h-[46%] w-[48%] object-cover" style={{ clipPath: SHAPES.c }} />
          <img src="/concepts/coast-3.jpg" alt="" className="absolute bottom-0 left-0 h-[60%] w-[62%] object-cover" style={{ clipPath: SHAPES.d }} />
        </div>
        <div className="order-1 lg:order-2">
          <h2 style={SERIF} className="text-[clamp(2rem,3.6vw,3.4rem)] leading-[1.08]">
            Not just another addition to the skyline, but a quiet neighborhood of its own: gardens, a wellness club, and a café on the ground floor.
          </h2>
        </div>
      </section>

      {/* Numbers */}
      <section className="border-y border-white/10">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-5 py-14 sm:grid-cols-4 sm:px-10">
          {[
            ['142', 'residences'],
            ['6,800 m²', 'private gardens'],
            ['Q3 2027', 'completion'],
            ['68%', 'already reserved'],
          ].map(([n, l]) => (
            <div key={l}>
              <div style={SERIF} className="text-5xl sm:text-6xl">
                {n}
              </div>
              <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/55">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Availability */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-10 sm:py-32">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 style={SERIF} className="text-5xl sm:text-7xl">
            Residences
          </h2>
          <span className="text-[11px] uppercase tracking-[0.2em] text-white/55">Floor plans · Price list · Availability</span>
        </div>
        <div className="mt-10 border-t border-white/15">
          {RESIDENCES.map(([type, size, price, left], i) => (
            <div key={type} className="grid grid-cols-2 items-baseline gap-x-6 gap-y-1 border-b border-white/15 py-6 sm:grid-cols-[2fr_1fr_1fr_auto]">
              <span style={SERIF} className="text-3xl sm:text-4xl">
                {type}
              </span>
              <span className="text-right text-[14px] text-white/60 sm:text-left">{size}</span>
              <span className="text-[15px]">{price}</span>
              <span
                className={`justify-self-end rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.15em] ${i === 4 ? 'text-[#1f3320]' : 'border border-white/20 text-white/70'}`}
                style={i === 4 ? { background: LEAF } : undefined}
              >
                {left}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Register interest */}
      <section className="relative overflow-hidden">
        <img src="/concepts/lux-2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-2 lg:items-center">
          <h2 style={SERIF} className="text-[clamp(2.6rem,5vw,4.6rem)] leading-[1]">
            Be first to choose <em>your floor</em>.
          </h2>
          <div className="rounded-[28px] border border-white/10 bg-[#1f3320]/85 p-6 backdrop-blur sm:p-8">
            {['Full name', 'Email', 'Phone', 'Residence type'].map((f) => (
              <div key={f} className="border-b border-white/15 py-4 text-[14px] text-white/45">
                {f}
              </div>
            ))}
            <div className="mt-6 rounded-full py-4 text-center text-[11px] uppercase tracking-[0.2em] text-[#1f3320]" style={{ background: LEAF }}>
              Register interest →
            </div>
            <p className="mt-3 text-center text-[12px] text-white/45">A sales advisor will call you within one business day.</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-8 text-[12px] text-white/45 sm:flex-row sm:justify-between sm:px-10">
          <span style={{ ...SERIF, color: LEAF }} className="text-xl">
            The Linden
          </span>
          <span>Concept design by IGANI · Not a real development or listing</span>
        </div>
      </footer>
    </div>
  )
}
