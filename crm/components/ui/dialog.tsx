'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Accessible modal built on the native <dialog> element (focus trap, Esc to close, backdrop click closes). */
export function Dialog({ open, onClose, title, description, children, className }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }): React.ReactElement {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
      className={cn('w-[min(92vw,30rem)] rounded-[22px] border bg-card p-0 text-card-foreground shadow-xl backdrop:bg-[#0c1730]/45 backdrop:backdrop-blur-sm', className)}
    >
      {open ? (
        <div className="space-y-4 p-6">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.022em]">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  )
}
