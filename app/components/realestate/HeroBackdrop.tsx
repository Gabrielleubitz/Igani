/* eslint-disable @next/next/no-img-element */

/**
 * Real estate photo behind the opening screen. The photo sits under a brand-blue wash so
 * the white headline stays readable and the page still opens on IGANI blue.
 */
export function HeroBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        id="hero-photo"
        src="/work/hero-home.jpg"
        alt=""
        // Already above the fold, so don't lazy-load it
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover object-center motion-safe:animate-[hero-drift_28s_ease-in-out_infinite_alternate]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,79,174,0.66)_0%,rgba(38,98,206,0.6)_45%,rgba(20,60,140,0.88)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_42%,rgba(47,111,216,0.55)_0%,transparent_70%)]" />
      {/* Melts into the next section instead of ending on a hard line */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1a4fae]/80 to-transparent" />
    </div>
  )
}
