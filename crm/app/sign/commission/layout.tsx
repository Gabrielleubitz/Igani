import { Heebo } from 'next/font/google'
import type { ReactNode } from 'react'

const heebo = Heebo({ subsets: ['latin', 'hebrew'], display: 'swap' })

/** Same typeface as the offer pages. */
export default function Layout({ children }: { children: ReactNode }): React.ReactElement {
  return <div className={heebo.className}>{children}</div>
}
