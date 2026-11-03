import { Heebo } from 'next/font/google'
import type { ReactNode } from 'react'

const heebo = Heebo({ subsets: ['latin', 'hebrew'], display: 'swap' })

/** Offer microsites use their own light, bilingual look (the CRM itself is dark). */
export default function OfferLayout({ children }: { children: ReactNode }): React.ReactElement {
  return <div className={heebo.className}>{children}</div>
}
