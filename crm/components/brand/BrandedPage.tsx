import type { ReactNode } from 'react'
import { Logo } from './Logo'

/** Centered, branded full-page frame for login / error / status screens. */
export function BrandedPage({ children, wide = false }: { children: ReactNode; wide?: boolean }): React.ReactElement {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-8 overflow-hidden p-4 sm:p-6">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(216_74%_58%/0.18),transparent_60%)]" />
      <Logo height={32} />
      <div className={wide ? 'relative w-full max-w-md' : 'relative w-full max-w-sm'}>{children}</div>
      <p className="relative text-xs text-muted-foreground">© {new Date().getFullYear()} Igani · Team CRM</p>
    </main>
  )
}
