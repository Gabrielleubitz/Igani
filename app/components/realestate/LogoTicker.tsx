'use client'

/* eslint-disable @next/next/no-img-element */

type Logo = { id: string; name: string; /** Height in px: tuned per logo so wordmarks and badges carry the same visual weight */ h: number }

// Companies we've built for. Files live in /public/logos/ as one-colour white PNGs on transparent.
// Add a client by dropping their logo there and listing it here.
export const CLIENT_LOGOS: Logo[] = [
  { id: 'gabai', name: 'Gabai Real Estate', h: 32 },
  { id: 'wine-and-grind', name: 'Wine & Grind', h: 40 },
  { id: 'cryotherapy', name: 'Cryotherapy Rejuvenate', h: 40 },
  { id: 'callmap', name: 'Callmap', h: 30 },
  { id: 'nogilates', name: 'Nogilates', h: 44 },
  { id: 'almalinks', name: 'AlmaLinks', h: 28 },
  { id: 'bishvilam', name: 'Bishvilam', h: 42 },
  { id: 'go-jungle', name: 'Go Jungle', h: 28 },
]

/** Sliding strip of client logos, like a stock ticker. Pauses on hover; still when reduced motion is on. */
export function LogoTicker({ label = 'Trusted by', className = '' }: { label?: string; className?: string }) {
  // Two copies per row so a wide screen never shows a gap before the loop restarts
  const row = [...CLIENT_LOGOS, ...CLIENT_LOGOS]
  return (
    <div className={className}>
      <div className="text-center text-[13px] text-white/55">{label}</div>
      <div
        role="list"
        aria-label={label}
        className="group mt-7 flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]"
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="funnel-marquee flex shrink-0 items-center gap-14 pr-14 group-hover:[animation-play-state:paused] sm:gap-20 sm:pr-20"
            style={{ animationDuration: '70s' }}
          >
            {row.map((l, i) => (
              <li key={`${l.id}-${i}`} role={copy === 0 ? 'listitem' : undefined} className="shrink-0">
                <img src={`/logos/${l.id}.png`} alt={copy === 0 && i < CLIENT_LOGOS.length ? l.name : ''} style={{ height: l.h }} className="block w-auto opacity-65" decoding="async" />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
