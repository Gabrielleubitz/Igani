import type { Metadata } from 'next'
import { DM_Mono, DM_Sans } from 'next/font/google'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { DialerRoot } from '@/components/dialer/Dialer'
import { StaleDeployGuard } from '@/components/StaleDeployGuard'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Igani CRM', template: '%s · Igani CRM' },
  robots: { index: false, follow: false },
}

// The landing page's typefaces: DM Sans for everything, DM Mono for small labels
const sans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' })
const mono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' })

const THEME_SCRIPT = `try{if(localStorage.getItem('igani.theme')!=='dark'&&!/^\\/(o|book|sign|invites|meet)(\\/|$)/.test(location.pathname)){var d=document.documentElement;d.classList.remove('dark');d.classList.add('light');d.style.colorScheme='light'}}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <html lang="en" className={`dark ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        {/* the saved light/dark choice, applied before the first paint (no flash); proposals, booking, signing and Igani Meet pages keep their own look */}
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
        <DialerRoot>{children}</DialerRoot>
        <StaleDeployGuard />
      </body>
    </html>
  )
}
