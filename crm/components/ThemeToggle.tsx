'use client'

import { Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { cn } from '@/lib/utils'

const KEY = 'igani.theme'

function subscribe(fn: () => void): () => void {
  const o = new MutationObserver(fn)
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  return () => o.disconnect()
}
const isLight = (): boolean => document.documentElement.classList.contains('light')

function apply(light: boolean): void {
  const d = document.documentElement
  // a short cross-fade instead of everything snapping at once
  d.classList.add('theme-switching')
  d.classList.toggle('light', light)
  d.classList.toggle('dark', !light)
  d.style.colorScheme = light ? 'light' : 'dark'
  window.setTimeout(() => d.classList.remove('theme-switching'), 350)
  try {
    localStorage.setItem(KEY, light ? 'light' : 'dark')
  } catch {
    /* storage blocked: still switches for this page */
  }
}

/** Light / dark switch (remembered in this browser). A sliding knob with a sun or a moon, no label. */
export function ThemeToggle({ className }: { className?: string }): React.ReactElement {
  const light = useSyncExternalStore(subscribe, isLight, () => false)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!light}
      aria-label="Dark mode"
      title={light ? 'Switch to dark mode' : 'Switch to light mode'}
      onClick={() => apply(!light)}
      className={cn(
        'relative inline-flex h-7 w-[52px] shrink-0 items-center rounded-full p-[3px] ring-1 ring-inset transition-colors duration-300',
        light ? 'bg-[#cfe3ff] ring-[#9cc0ff]' : 'bg-[#0b1728] ring-[#2b4263]',
        className,
      )}
    >
      {/* the track's own scenery: stars at night, a soft glow by day */}
      <span aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden rounded-full transition-opacity duration-300', light ? 'opacity-0' : 'opacity-100')}>
        <span className="absolute left-[30px] top-[7px] h-[2px] w-[2px] rounded-full bg-white/70" />
        <span className="absolute left-[40px] top-[15px] h-[1.5px] w-[1.5px] rounded-full bg-white/50" />
        <span className="absolute left-[35px] top-[19px] h-[1px] w-[1px] rounded-full bg-white/60" />
      </span>
      <span
        aria-hidden
        className={cn(
          'relative flex h-[22px] w-[22px] items-center justify-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-[transform,background-color] duration-500 [transition-timing-function:cubic-bezier(0.34,1.56,0.64,1)]',
          light ? 'translate-x-[24px] bg-[#ffd166]' : 'translate-x-0 bg-[#e6eefc]',
        )}
      >
        <Sun className={cn('absolute h-[13px] w-[13px] text-[#b45309] transition-all duration-500', light ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-50 opacity-0')} strokeWidth={2.5} />
        <Moon className={cn('absolute h-[12px] w-[12px] text-[#1d3354] transition-all duration-500', light ? 'rotate-90 scale-50 opacity-0' : 'rotate-0 scale-100 opacity-100')} strokeWidth={2.5} fill="currentColor" />
      </span>
    </button>
  )
}
