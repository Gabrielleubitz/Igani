'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from './button'

/**
 * Button + floating panel ("+ Add lead", "+ New page"…). Unlike <details>, it keeps its open state
 * when the page refreshes after a save, so error messages stay visible. Esc or a click outside closes it.
 */
export function Popover({ label, children, className, panelClassName }: { label: ReactNode; children: ReactNode; className?: string; panelClassName?: string }): React.ReactElement {
  const [open, setOpen] = useState(false)
  // Which edge of the button the panel hangs from: 'end' grows leftwards (button on the right of the page),
  // 'start' grows rightwards (button on the left, e.g. when a long page intro wraps it onto its own line).
  const [align, setAlign] = useState<'start' | 'end'>('end')
  const ref = useRef<HTMLDivElement>(null)
  const toggle = (): void => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      const panel = Math.min(window.innerWidth * 0.92, 640)
      setAlign(r.right - panel < 8 ? 'start' : 'end')
    }
    setOpen((o) => !o)
  }
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
      <button type="button" aria-expanded={open} onClick={toggle} className={buttonVariants()}>
        {label}
      </button>
      {open ? (
        // On a phone the panel is a sheet pinned to the screen edges (it used to hang off the button's right edge and slid off-screen
        // when the button sat on the left); from sm up it floats under the button as before.
        <div className={cn('fixed inset-x-3 top-20 z-30 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-xl border bg-card p-4 shadow-2xl sm:absolute sm:inset-x-auto sm:top-auto', align === 'end' ? 'sm:right-0' : 'sm:left-0', ' sm:mt-2 sm:max-h-none sm:w-[min(92vw,36rem)] sm:overflow-visible', panelClassName)}>{children}</div>
      ) : null}
    </div>
  )
}
