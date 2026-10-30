import { Img } from '@react-email/components'
import * as React from 'react'

/** Dark Igani wordmark (public/igani-logo 2.png) on a white chip, so it stays visible on dark and light email backgrounds. */
export function EmailLogo({ src, alt }: { src: string; alt: string }): React.ReactElement {
  return (
    <div style={{ display: 'inline-block', backgroundColor: '#ffffff', borderRadius: 10, padding: '10px 14px', marginBottom: 32 }}>
      <Img src={src} alt={alt} width={120} height={59} style={{ display: 'block' }} />
    </div>
  )
}
