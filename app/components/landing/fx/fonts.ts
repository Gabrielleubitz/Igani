import { Instrument_Serif } from 'next/font/google'

/** Editorial serif used for italic accent words on the landing page. */
export const displaySerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})
