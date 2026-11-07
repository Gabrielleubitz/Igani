import type { Metadata } from 'next'

/** Igani Meet has its own icon in the browser tab (the CRM's stays everywhere else). */
export const metadata: Metadata = {
  title: { absolute: 'Igani Meet' },
  icons: { icon: [{ url: '/meet/icon-32.png', sizes: '32x32' }, { url: '/meet/icon-192.png', sizes: '192x192' }], apple: '/meet/icon-192.png' },
  robots: { index: false, follow: false },
}

export default function MeetLayout({ children }: { children: React.ReactNode }): React.ReactNode {
  return children
}
