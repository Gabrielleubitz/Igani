import * as React from 'react'
import { cn } from '@/lib/utils'

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>): React.ReactElement {
  return (
    <div className="w-full overflow-x-auto rounded-lg border">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}
export function THead(props: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground" {...props} />
}
export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>): React.ReactElement {
  return <tbody className="divide-y divide-border" {...props} />
}
export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>): React.ReactElement {
  return <tr className={cn('transition-colors hover:bg-muted/40', className)} {...props} />
}
export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <th className={cn('px-4 py-2.5 font-medium', className)} {...props} />
}
export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>): React.ReactElement {
  return <td className={cn('px-4 py-3 align-middle', className)} {...props} />
}
