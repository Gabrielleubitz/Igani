import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const alertVariants = cva('rounded-md border px-4 py-3 text-sm', {
  variants: {
    variant: {
      info: 'border-primary/40 bg-primary/10 text-foreground',
      success: 'border-success/40 bg-success/10 text-foreground',
      warning: 'border-warning/40 bg-warning/10 text-foreground',
      error: 'border-destructive/50 bg-destructive/10 text-foreground',
    },
  },
  defaultVariants: { variant: 'info' },
})

export function Alert({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>): React.ReactElement {
  return <div role={variant === 'error' ? 'alert' : 'status'} className={cn(alertVariants({ variant }), className)} {...props} />
}
