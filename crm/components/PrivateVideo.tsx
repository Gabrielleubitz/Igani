'use client'

/** Branded frame around a private video. The source streams through our access check; there is no public file address. */
export function PrivateVideo({ id, offerSlug, title, className = '' }: { id: string; offerSlug?: string; title: string; className?: string }): React.ReactElement {
  const src = `/api/public/videos/${id}/stream${offerSlug ? `?o=${encodeURIComponent(offerSlug)}` : ''}`
  return (
    <figure className={`overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-900/10 ${className}`}>
      <video src={src} controls controlsList="nodownload noplaybackrate" disablePictureInPicture playsInline preload="metadata" onContextMenu={(e) => e.preventDefault()} className="aspect-video w-full bg-black" aria-label={title} />
      <figcaption className="bg-white px-4 py-2.5 text-sm font-medium text-slate-800">{title}</figcaption>
    </figure>
  )
}
