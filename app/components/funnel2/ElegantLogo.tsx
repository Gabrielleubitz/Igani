'use client'

import { useEffect, useState } from 'react'

/** Igani mark (cropped from the main logo, whose wordmark is white) beside a serif wordmark for light backgrounds. */
export function ElegantLogo() {
  const [logoSrc, setLogoSrc] = useState('/igani-logo.png')

  useEffect(() => {
    // If on subdomain, use absolute URL to main domain
    if (window.location.hostname.includes('funnels.')) {
      setLogoSrc('https://www.igani.co/igani-logo.png')
    }
  }, [])

  return (
    <div className="flex items-center gap-2">
      <div className="h-11 w-[42px] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} alt="" className="h-11 w-auto max-w-none" />
      </div>
      <span className="font-cormorant text-2xl tracking-wide text-[#1F1C18]">Igani</span>
    </div>
  )
}
