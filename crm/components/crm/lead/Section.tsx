import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** A sidebar card that folds up (native <details>, so it works without JavaScript and in server components). */
export function Section({ title, count, defaultOpen = false, action, children, className }: { title: string; count?: string | number | null; defaultOpen?: boolean; action?: React.ReactNode; children: React.ReactNode; className?: string }): React.ReactElement {
  return (
    <details open={defaultOpen} className={cn('group rounded-xl border bg-card shadow-sm', className)}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-0 [details:not([open])>summary>&]:-rotate-90" aria-hidden />
        <span>{title}</span>
        {count !== null && count !== undefined && count !== '' ? <span className="text-xs font-normal text-muted-foreground">({count})</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </summary>
      <div className="border-t px-4 py-3">{children}</div>
    </details>
  )
}
