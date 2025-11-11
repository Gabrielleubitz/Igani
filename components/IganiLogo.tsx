'use client'

import Image from 'next/image'

export function IganiLogo({ className = "w-32 h-10" }: { className?: string }) {
  // Use the igani-logo.png from the public folder
  return (
    <div className={`relative ${className}`}>
      <Image
        src="/igani-logo.png"
        alt="IGANI Logo"
        width={128}
        height={40}
        className="object-contain"
        priority
      />
    </div>
  )
}
