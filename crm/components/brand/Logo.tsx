import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Igani wordmark. `onLight` uses public/igani-logo 2.png (dark wordmark) for white backgrounds; default suits the dark CRM theme. */
export function Logo({ onLight = false, height = 28, className }: { onLight?: boolean; height?: number; className?: string }): React.ReactElement {
  return (
    <Image
      src={onLight ? '/igani-logo%202.png' : '/igani-logo.png'}
      alt="Igani"
      width={Math.round(height * (onLight ? 2.02 : 2.37))}
      height={height}
      priority
      style={{ height, width: 'auto' }}
      className={cn('select-none', className)}
    />
  )
}
