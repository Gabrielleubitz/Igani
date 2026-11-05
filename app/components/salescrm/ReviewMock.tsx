/** A static picture of a call review (illustration, not real data): the call drawn on a line, with the stage markers and one coaching tip. */
export function ReviewMock() {
  const stages = [
    { label: 'Opening', color: '#34d399', x: 70 },
    { label: 'Questions', color: '#34d399', x: 185 },
    { label: 'Pitch', color: '#fbbf24', x: 300 },
    { label: 'Objection', color: '#f87171', x: 415 },
    { label: 'Close', color: '#64748b', x: 520 },
  ]
  return (
    <div className="w-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.02] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] backdrop-blur sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#80a0e0]">Call review</div>
          <div className="mt-1 text-lg font-semibold text-white">Discovery call · 6:12</div>
        </div>
        <div className="flex items-baseline gap-1 rounded-2xl bg-amber-400/10 px-4 py-2 ring-1 ring-amber-400/30">
          <span className="text-4xl font-bold tabular-nums text-amber-300">58</span>
          <span className="text-sm text-white/50">/ 100</span>
        </div>
      </div>

      <svg viewBox="0 0 600 190" role="img" aria-label="Example: a call drawn on the line, with five stages" className="mt-4 w-full">
        <rect x="205" y="14" width="190" height="112" rx="10" fill="#f87171" opacity=".12" />
        <line x1="30" y1="40" x2="580" y2="40" stroke="#64748b" strokeDasharray="6 6" />
        <line x1="30" y1="100" x2="580" y2="100" stroke="#64748b" strokeDasharray="6 6" />
        <line x1="30" y1="70" x2="580" y2="70" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity=".7" />
        <path d="M30,70 C80,66 120,78 170,68 S250,28 300,30 S370,36 410,44 S470,72 580,72" fill="none" stroke="#4080e0" strokeWidth="4" strokeLinecap="round" />
        {stages.map((s) => (
          <g key={s.label}>
            <circle cx={s.x} cy="70" r="8" fill={s.label === 'Close' ? '#0b1b33' : s.color} stroke={s.color} strokeWidth="3" />
            <text x={s.x} y="150" textAnchor="middle" fontSize="13" fontWeight="600" fill="#e2e8f0">{s.label}</text>
            <text x={s.x} y="168" textAnchor="middle" fontSize="11" fill={s.color}>
              {s.color === '#34d399' ? 'On the line' : s.color === '#fbbf24' ? 'Shaky' : s.color === '#f87171' ? 'Slipped' : 'Not reached'}
            </text>
          </g>
        ))}
        <text x="300" y="22" textAnchor="middle" fontSize="11" fill="#fca5a5">off the line 2:10 to 4:05</text>
      </svg>

      <div className="mt-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-300">Try instead · 3:12</div>
        <p className="mt-1 !mt-1 text-[15px] leading-6 text-white/90">“Fair question. How are most of your customers finding you right now?”</p>
      </div>
      <p className="mt-3 !mt-3 text-center text-xs text-white/40">Example review for illustration</p>
    </div>
  )
}
