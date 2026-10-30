import { Img } from '@react-email/components'
import * as React from 'react'

/** Dark Igani wordmark (public/igani-logo 2.png), shown bare on the white email card (no box or chip behind it). */
export function EmailLogo({ src, alt }: { src: string; alt: string }): React.ReactElement {
  return <Img src={src} alt={alt} width={120} height={59} style={{ display: 'block', border: 0 }} />
}
