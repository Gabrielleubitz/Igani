import { useId } from 'react'
import { cn } from '@/lib/utils'

const LEFT = 'M500 594.5A163.5 163.5 0 0 1 827 594.5L827 1166A105 105 0 0 0 931 1271L931 1597A431 431 0 0 1 500 1166Z'
const RIGHT = 'M1037 593.5A162.5 162.5 0 0 1 1362 593.5L1362 1166A431 431 0 0 1 931 1597L931 1271A105 105 0 0 0 1037 1166Z'

/**
 * The Igani CRM mark: the Igani pills bent into a horseshoe magnet that pulls in leads. A sibling of the Igani Meet
 * mark: same pills, colours and slots. The slots and the pole lines are real cut-outs, so it sits on any background.
 * Files: public/brand/igani-crm-mark.svg (mark), public/brand/igani-crm-icon.svg (app icon).
 */
export function CrmMark({ className, height = 32 }: { className?: string; height?: number }): React.ReactElement {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox="470 401 922 1226" height={height} className={cn('w-auto shrink-0', className)} aria-hidden>
      <defs>
        <linearGradient id={`${id}a`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8DB4F3" />
          <stop offset="1" stopColor="#95BAF7" />
        </linearGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6492DC" />
          <stop offset="1" stopColor="#5B8BD8" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect x="0" y="0" width="2000" height="2000" fill="#fff" />
          <g fill="#000">
            <rect x="490" y="684.5" width="882" height="34" />
            <rect x="603" y="744.5" width="104" height="290" rx="52" />
            <rect x="1138" y="1143" width="104" height="294" rx="52" />
          </g>
        </mask>
        <clipPath id={`${id}c`}>
          <rect x="0" y="0" width="2000" height="684.5" />
        </clipPath>
      </defs>
      <g mask={`url(#${id}m)`}>
        <path d={LEFT} fill={`url(#${id}a)`} />
        <path d={RIGHT} fill={`url(#${id}b)`} />
        <g clipPath={`url(#${id}c)`} fill="#DCE7FA">
          <path d={LEFT} />
          <path d={RIGHT} />
        </g>
      </g>
    </svg>
  )
}

/** The CRM lockup: the magnet and the Igani wordmark (blue on light, white on dark). */
export function CrmLogo({ height = 30, className, onDark = false }: { height?: number; className?: string; /** always the white wordmark (pages that are dark in both themes) */ onDark?: boolean }): React.ReactElement {
  return (
    <span className={cn('inline-flex items-center', className)} style={{ gap: Math.round(height * 0.3) }} role="img" aria-label="Igani CRM">
      <CrmMark height={height} />
      {/* eslint-disable-next-line @next/next/no-img-element -- the brand wordmark: two small static images */}
      <img src="/brand/igani-word-light.png" alt="" style={{ height: height * 0.86 }} className={cn('block w-auto select-none dark:hidden', onDark && 'hidden')} />
      {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
      <img src="/brand/igani-word-dark.png" alt="" style={{ height: height * 0.8 }} className={cn('hidden w-auto select-none dark:block', onDark && 'block')} />
    </span>
  )
}
