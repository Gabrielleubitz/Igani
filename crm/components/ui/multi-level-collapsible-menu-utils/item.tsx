import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '@/lib/utils'

const itemVariants = cva('flex w-full items-center gap-2.5 rounded-md text-left text-sm transition-colors', {
  variants: {
    size: { default: 'px-3 py-2', xs: 'px-2 py-1.5' },
  },
  defaultVariants: { size: 'default' },
})

export interface ItemProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof itemVariants> {}

/** A single row of a menu (icon, title, trailing slot). Use with `asChild`-style wrappers via className or as a plain div. */
const Item = React.forwardRef<HTMLDivElement, ItemProps>(({ className, size, ...props }, ref) => <div ref={ref} className={cn(itemVariants({ size }), className)} {...props} />)
Item.displayName = 'Item'

function ItemMedia({ className, ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'icon' }): React.ReactElement {
  return <div className={cn('flex size-4 shrink-0 items-center justify-center', className)} {...props} />
}

function ItemTitle({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>): React.ReactElement {
  return <span className={cn('min-w-0 flex-1 truncate', className)} {...props} />
}

export { Item, ItemMedia, ItemTitle, itemVariants }
