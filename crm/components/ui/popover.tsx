'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

/**
 * Button + floating panel ("+ Add contact", "+ New page"…). Unlike <details>, it keeps its open state
 * when the page refreshes after a save, so error messages stay visible. Esc or a click outside closes it.
 */
export function Popover({ label, children, className, panelClassName }: { label: ReactNode; children: ReactNode; className?: string; panelClassName?: string }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node) && !(e.target as HTMLElement).closest('dialog')) setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
    }
  }, [open])
  return (
    <div ref={ref} className={cn('relative', className)}>
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={buttonVariants()}>
        {label}
      </button>
      {open ? <div className={cn('absolute right-0 z-30 mt-2 w-[min(92vw,36rem)] rounded-xl border bg-card p-4 shadow-2xl', panelClassName)}>{children}</div> : null}
    </div>
  )
}
