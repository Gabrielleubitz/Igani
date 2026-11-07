import type { Metadata } from 'next'
import Script from 'next/script'
import type { ReactNode } from 'react'
import { DialerRoot } from '@/components/dialer/Dialer'
import { StaleDeployGuard } from '@/components/StaleDeployGuard'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Igani CRM', template: '%s · Igani CRM' },
  robots: { index: false, follow: false },
}

const THEME_SCRIPT = `try{if(localStorage.getItem('igani.theme')==='light'&&!/^\\/(o|book|sign|invites|meet)(\\/|$)/.test(location.pathname)){var d=document.documentElement;d.classList.remove('dark');d.classList.add('light');d.style.colorScheme='light'}}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }): React.ReactElement {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
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
