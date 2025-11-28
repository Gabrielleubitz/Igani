'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

export function IganiLogo({ className = "w-32 h-10" }: { className?: string }) {
  const [logoSrc, setLogoSrc] = useState('/igani-logo.png')

  useEffect(() => {
    // If on subdomain, use absolute URL to main domain
    if (typeof window !== 'undefined' && window.location.hostname.includes('funnels.')) {
      setLogoSrc('https://www.igani.co/igani-logo.png')
    }
  }, [])

  return (
    <div className={`relative ${className}`}>
      <Image
        src={logoSrc}
        alt="IGANI Logo"
        width={128}
        height={40}
        className="object-contain"
        priority
        unoptimized={logoSrc.startsWith('http')}
      />
    </div>
  )
}
