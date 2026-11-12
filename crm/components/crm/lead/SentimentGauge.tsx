/** A half-circle gauge, red to green, with a needle at `score` (0 cooling … 1 receptive). */
export function SentimentGauge({ score, label }: { score: number; label: string }): React.ReactElement {
  const cx = 80
  const cy = 76
  const r = 60
  const point = (t: number, rad = r): { x: number; y: number } => ({ x: cx + rad * Math.cos(Math.PI * (1 - t)), y: cy - rad * Math.sin(Math.PI * (1 - t)) })
  const arc = (a: number, b: number): string => {
    const p1 = point(a)
    const p2 = point(b)
    return `M ${p1.x.toFixed(2)} ${p1.y.toFixed(2)} A ${r} ${r} 0 0 1 ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
  }
  const tip = point(Math.min(1, Math.max(0, score)), r - 10)
  return (
    <figure className="flex flex-col items-center" aria-label={`Sentiment: ${label}`}>
      <svg viewBox="0 0 160 92" className="w-44" role="img" aria-hidden>
        <path d={arc(0, 0.34)} stroke="#e5484d" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d={arc(0.36, 0.64)} stroke="#f5a524" strokeWidth="12" fill="none" />
        <path d={arc(0.66, 1)} stroke="#30a46c" strokeWidth="12" fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={tip.x} y2={tip.y} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill="currentColor" />
      </svg>
      <figcaption className="-mt-1 text-center">
        <div className="text-base font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">Sentiment</div>
      </figcaption>
    </figure>
  )
}
