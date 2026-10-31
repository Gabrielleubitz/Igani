import type { LeadStatus } from '@prisma/client'
import { STATUS_LABEL, STATUS_TONE } from '@/lib/format'
import { cn } from '@/lib/utils'

/** Coloured pill for a pipeline stage. Works in server and client components. */
export function StagePill({ status, className }: { status: LeadStatus; className?: string }): React.ReactElement {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium', STATUS_TONE[status], className)}>{STATUS_LABEL[status]}</span>
}
