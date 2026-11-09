'use client'

import { ConfidentialityGate } from '@/components/ConfidentialityGate'
import { SecureVideo } from '@/components/SecureVideo'

/** Branded frame around a private video. One access check per play, then a short-lived private link straight to the file; there is no public file address. */
export function PrivateVideo({ id, offerSlug, title, className = '', confirm = false }: { id: string; offerSlug?: string; title: string; className?: string; confirm?: boolean }): React.ReactElement {
  return (
    <figure className={`overflow-hidden rounded-2xl bg-slate-950 ring-1 ring-slate-900/10 ${className}`}>
      <ConfidentialityGate videoId={id} enabled={confirm}>
      <SecureVideo id={id} offerSlug={offerSlug} title={title} className="aspect-video w-full bg-black" />
      </ConfidentialityGate>
      <figcaption className="bg-white px-4 py-2.5 text-sm font-medium text-slate-800">{title}</figcaption>
    </figure>
  )
}
