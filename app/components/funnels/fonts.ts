import localFont from 'next/font/local'
import { JetBrains_Mono } from 'next/font/google'

/** Heavy display face for funnel headlines (Clash Display, ITF Free Font License). */
export const clashDisplay = localFont({
  src: [
    { path: '../../funnels/fonts/ClashDisplay-Semibold.woff2', weight: '600', style: 'normal' },
    { path: '../../funnels/fonts/ClashDisplay-Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-clash',
  display: 'swap',
})

/** Mono accent face for labels, counters and sources. */
export const funnelMono = JetBrains_Mono({
  weight: ['400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})
