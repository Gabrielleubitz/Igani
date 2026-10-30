import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Igani CRM', template: '%s · Igani CRM' },
  robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  )
}
