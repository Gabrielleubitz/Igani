import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Realistic device frames around a mockup screen. Screens fill the frame and scroll inside it.
 * Phone: titanium bezel, side buttons, dynamic island, status bar. Desktop: browser window with the offer's domain.
 */
export function DeviceFrame({ device, children, className, url }: { device: 'phone' | 'desktop'; children: ReactNode; className?: string; url?: string }): React.ReactElement {
  if (device === 'desktop') {
    return (
      <div className={cn('w-full overflow-hidden rounded-2xl bg-white shadow-[0_40px_80px_-30px_rgba(15,23,42,0.45),0_0_0_1px_rgba(15,23,42,0.08)]', className)}>
        <div className="flex items-center gap-3 border-b border-slate-200/80 bg-gradient-to-b from-slate-50 to-slate-100/80 px-4 py-2.5" dir="ltr">
          <span className="flex gap-1.5" aria-hidden>
            <span className="h-3 w-3 rounded-full bg-[#ff5f57] ring-1 ring-black/10" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e] ring-1 ring-black/10" />
            <span className="h-3 w-3 rounded-full bg-[#28c840] ring-1 ring-black/10" />
          </span>
          <span className="mx-auto flex h-7 w-full max-w-md items-center justify-center gap-1.5 rounded-lg bg-white px-3 text-[11px] text-slate-500 shadow-[inset_0_0_0_1px_rgba(15,23,42,0.08)]">
            <svg viewBox="0 0 16 16" className="h-3 w-3 text-slate-400" aria-hidden fill="currentColor">
              <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1.5 1.5 0 0 0-1.5 1.5v6A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5v-6A1.5 1.5 0 0 0 12 6h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
            </svg>
            <span className="truncate">{url ?? 'app.example.com'}</span>
          </span>
          <span className="w-12" aria-hidden />
        </div>
        <div className="relative aspect-[16/10] w-full overflow-y-auto bg-white [scrollbar-width:thin]">{children}</div>
      </div>
    )
  }
  return (
    <div className={cn('relative mx-auto w-[300px] max-w-full', className)}>
      {/* side buttons */}
      <span aria-hidden className="absolute -start-[3px] top-[110px] h-8 w-[3px] rounded-s bg-slate-700" />
      <span aria-hidden className="absolute -start-[3px] top-[160px] h-14 w-[3px] rounded-s bg-slate-700" />
      <span aria-hidden className="absolute -end-[3px] top-[140px] h-20 w-[3px] rounded-e bg-slate-700" />
      <div className="rounded-[48px] bg-gradient-to-b from-slate-700 via-slate-900 to-slate-800 p-[3px] shadow-[0_50px_90px_-35px_rgba(15,23,42,0.6),0_20px_40px_-25px_rgba(15,23,42,0.4)]">
        <div className="rounded-[45px] bg-black p-[9px]">
          <div className="relative overflow-hidden rounded-[37px] bg-white">
            <div className="relative z-20 flex items-center justify-between px-7 pb-1.5 pt-3 text-[11px] font-semibold text-slate-900" dir="ltr">
              <span className="tabular-nums">9:41</span>
              <span className="absolute left-1/2 top-2 h-[26px] w-[88px] -translate-x-1/2 rounded-full bg-black" aria-hidden />
              <span className="flex items-center gap-1" aria-hidden>
                <svg viewBox="0 0 18 12" className="h-2.5 w-4" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5" width="3" height="7" rx="1" />
                  <rect x="10" y="2.5" width="3" height="9.5" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" />
                </svg>
                <span className="relative h-2.5 w-5 rounded-[3px] border border-slate-900/70 p-[1px]">
                  <span className="block h-full w-3/4 rounded-[1.5px] bg-slate-900" />
                </span>
              </span>
            </div>
            <div className="h-[560px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{children}</div>
            <span aria-hidden className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 h-1 w-24 -translate-x-1/2 rounded-full bg-slate-900/80" />
          </div>
        </div>
      </div>
    </div>
  )
}
