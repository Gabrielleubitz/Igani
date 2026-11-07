import type { Metadata, Viewport } from 'next'
import { MeetPathsProvider } from '@/components/meet/paths'
import { appUrl } from '@/lib/env'
import { meetBase } from '@/lib/meet-links'

/** Igani Meet has its own icon in the browser tab (the CRM's stays everywhere else). */
export const metadata: Metadata = {
  title: { absolute: 'Igani Meet' },
  icons: { icon: [{ url: '/meet/icon-32.png', sizes: '32x32' }, { url: '/meet/icon-192.png', sizes: '192x192' }], apple: '/meet/apple-icon-180.png' },
  robots: { index: false, follow: false },
}

/** Calls use the whole screen on phones, edge to edge (controls keep clear of the notch and home bar). */
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#0e1626' }

export default async function MeetLayout({ children }: { children: React.ReactNode }): Promise<React.ReactElement> {
  const base = await meetBase()
  // On meet.igani.co the CRM is another host, so its link must be absolute
  return <MeetPathsProvider value={{ base, crm: base ? '/sales/today' : appUrl('/sales/today') }}>{children}</MeetPathsProvider>
}
