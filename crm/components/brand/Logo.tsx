import Image from 'next/image'
import { cn } from '@/lib/utils'

/** Igani wordmark. `onLight` uses the dark wordmark for white backgrounds; default suits the dark CRM theme. */
export function Logo({ onLight = false, height = 28, className }: { onLight?: boolean; height?: number; className?: string }): React.ReactElement {
  return (
    <Image
      src={onLight ? '/igani-logo-dark.png' : '/igani-logo.png'}
      alt="Igani"
      width={Math.round(height * 3.4)}
      height={height}
      priority
      style={{ height, width: 'auto' }}
      className={cn('select-none', className)}
    />
  )
}
