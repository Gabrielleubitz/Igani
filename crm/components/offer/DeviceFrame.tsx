import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** A phone or laptop-style frame around a mockup screen. Screens fill the frame and scroll inside it. */
export function DeviceFrame({ device, children, className }: { device: 'phone' | 'desktop'; children: ReactNode; className?: string }): React.ReactElement {
  if (device === 'desktop') {
    return (
      <div className={cn('w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.35)]', className)}>
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2" dir="ltr">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <span className="ml-3 h-5 flex-1 rounded-md bg-white" />
        </div>
        <div className="relative aspect-[16/10] w-full overflow-y-auto bg-white">{children}</div>
      </div>
    )
  }
  return (
    <div className={cn('mx-auto w-[300px] max-w-full rounded-[44px] bg-slate-900 p-3 shadow-[0_30px_70px_-25px_rgba(15,23,42,0.55)]', className)}>
      <div className="relative overflow-hidden rounded-[34px] bg-white">
        <div className="flex items-center justify-between px-6 pb-1 pt-3 text-[11px] font-semibold text-slate-900" dir="ltr">
          <span>9:41</span>
          <span className="h-5 w-20 rounded-full bg-slate-900" aria-hidden />
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-3 rounded-sm bg-slate-900" />
            <span className="h-2 w-4 rounded-sm bg-slate-900" />
          </span>
        </div>
        <div className="h-[560px] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
