import { Cormorant_Garamond } from 'next/font/google'

/** Refined high-contrast serif for the elegant funnel's headlines and numerals. */
export const cormorant = Cormorant_Garamond({
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-cormorant',
  display: 'swap',
})
