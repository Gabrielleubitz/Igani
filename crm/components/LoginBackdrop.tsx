/**
 * The sign-in pages' living brand panel: breathing glows, silky ribbons drifting on long eased loops, and a sheen that
 * sweeps across now and then. Shared by the CRM's and Igani Meet's sign-in so both feel like one product.
 */
export function LoginBackdrop(): React.ReactElement {
  return (
    <>
      {/* Base glow, slowly breathing */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#0b1a3d,#0a1230)]" />
      <span className="login-orb absolute -right-[20%] -top-[25%] h-[75%] w-[75%] rounded-full bg-[radial-gradient(closest-side,rgba(37,99,235,0.85),transparent)] [animation-duration:26s]" />
      <span className="login-orb absolute -bottom-[30%] -left-[20%] h-[80%] w-[80%] rounded-full bg-[radial-gradient(closest-side,rgba(79,70,229,0.8),transparent)] [animation-delay:-9s] [animation-duration:32s]" />
      <span className="login-orb absolute left-[30%] top-[35%] h-[45%] w-[45%] rounded-full bg-[radial-gradient(closest-side,rgba(56,189,248,0.35),transparent)] [animation-delay:-4s] [animation-duration:22s]" />
      {/* Silky ribbons: each drifts on its own long, eased loop, so the motion never visibly repeats */}
      {(
        [
          { top: '-6%', h: '26%', from: '#93c5fd', via: '#3b82f6', to: '#1e3a8a', dur: '28s', delay: '0s' },
          { top: '14%', h: '18%', from: '#c4b5fd', via: '#6366f1', to: '#1e1b4b', dur: '34s', delay: '-11s' },
          { top: '30%', h: '30%', from: '#e0f2fe', via: '#60a5fa', to: '#1d4ed8', dur: '40s', delay: '-23s' },
          { top: '54%', h: '16%', from: '#a5b4fc', via: '#4f46e5', to: '#172554', dur: '31s', delay: '-6s' },
          { top: '68%', h: '24%', from: '#bae6fd', via: '#38bdf8', to: '#1e40af', dur: '37s', delay: '-17s' },
        ] as const
      ).map((r, i) => (
        <span key={i} className="login-ribbon absolute -left-[45%] w-[190%]" style={{ top: r.top, height: r.h, animationDuration: r.dur, animationDelay: r.delay }}>
          <span
            className="absolute inset-0 opacity-90"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${r.to} 18%, ${r.via} 48%, ${r.from} 72%, transparent 100%)`, maskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 38%, #000 52%, transparent 100%)' }}
          />
          <span className="absolute inset-x-[10%] top-[42%] h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
        </span>
      ))}
      {/* A soft sheen that sweeps across every few seconds */}
      <span className="login-sheen absolute -inset-y-1/4 -left-1/2 w-1/3 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.08),transparent)]" />
      <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,18,0.15)_0%,transparent_30%,rgba(3,7,18,0.7)_100%)]" />
      <span className="absolute inset-0 opacity-[0.06] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:22px_22px]" />
      <style>{`
        .login-ribbon{transform:translate3d(-4%,0,0) rotate(-30deg);animation:login-ribbon ease-in-out infinite alternate;will-change:transform}
        @keyframes login-ribbon{0%{transform:translate3d(-6%,-2%,0) rotate(-31deg)}50%{transform:translate3d(2%,3%,0) rotate(-28deg)}100%{transform:translate3d(7%,-1%,0) rotate(-30deg)}}
        .login-orb{animation:login-orb ease-in-out infinite alternate;will-change:transform}
        @keyframes login-orb{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-8%,6%,0) scale(1.12)}100%{transform:translate3d(6%,-5%,0) scale(0.95)}}
        .login-sheen{transform:translate3d(0,0,0) rotate(20deg);animation:login-sheen 9s cubic-bezier(.45,0,.55,1) infinite;will-change:transform}
        @keyframes login-sheen{0%{transform:translate3d(0,0,0) rotate(20deg);opacity:0}15%{opacity:1}55%{transform:translate3d(520%,0,0) rotate(20deg);opacity:1}70%,100%{transform:translate3d(520%,0,0) rotate(20deg);opacity:0}}
        @media (prefers-reduced-motion: reduce){.login-ribbon,.login-orb,.login-sheen{animation:none}}
      `}</style>
    </>
  )
}
