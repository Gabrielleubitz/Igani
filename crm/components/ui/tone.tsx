/**
 * The CRM's accent colors, used sparingly on dark (and light) surfaces: tinted icon chips, small tags, gradient badges
 * for page titles, and stat tiles. One palette so every page speaks the same color language as Today.
 */
import type { LeadStatus } from '@prisma/client'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const TONES = ['blue', 'emerald', 'amber', 'rose', 'violet', 'sky', 'cyan', 'indigo', 'pink', 'teal', 'orange', 'slate'] as const
export type Tone = (typeof TONES)[number]

/** Soft tint: a 15% wash, the color's light shade for the glyph, and a hairline ring. */
export const TINT: Record<Tone, string> = {
  blue: 'bg-primary/15 text-[hsl(var(--accent))] ring-primary/25',
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/25',
  amber: 'bg-amber-500/15 text-amber-300 ring-amber-500/25',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/25',
  violet: 'bg-violet-500/15 text-violet-300 ring-violet-500/25',
  sky: 'bg-sky-500/15 text-sky-300 ring-sky-500/25',
  cyan: 'bg-cyan-500/15 text-cyan-300 ring-cyan-500/25',
  indigo: 'bg-indigo-500/15 text-indigo-300 ring-indigo-500/25',
  pink: 'bg-pink-500/15 text-pink-300 ring-pink-500/25',
  teal: 'bg-teal-500/15 text-teal-300 ring-teal-500/25',
  orange: 'bg-orange-500/15 text-orange-300 ring-orange-500/25',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/25',
}

/** Saturated gradient with a colored glow: for the one badge that names a page. */
export const GRADIENT: Record<Tone, string> = {
  blue: 'from-[#6aa6ff] to-[#2f5fd0] shadow-[#3b78db]/40',
  emerald: 'from-emerald-400 to-teal-600 shadow-emerald-500/35',
  amber: 'from-amber-300 to-orange-500 shadow-amber-500/35',
  rose: 'from-rose-400 to-pink-600 shadow-rose-500/35',
  violet: 'from-violet-400 to-indigo-600 shadow-violet-500/35',
  sky: 'from-sky-400 to-blue-600 shadow-sky-500/35',
  cyan: 'from-cyan-400 to-sky-600 shadow-cyan-500/35',
  indigo: 'from-indigo-400 to-violet-600 shadow-indigo-500/35',
  pink: 'from-pink-400 to-rose-600 shadow-pink-500/35',
  teal: 'from-teal-300 to-emerald-600 shadow-teal-500/35',
  orange: 'from-orange-400 to-rose-500 shadow-orange-500/35',
  slate: 'from-slate-400 to-slate-600 shadow-slate-500/30',
}

/** Just the color of a dot (stages, legends). */
export const DOT: Record<Tone, string> = {
  blue: 'bg-[#5b9bff]',
  emerald: 'bg-emerald-400',
  amber: 'bg-amber-400',
  rose: 'bg-rose-400',
  violet: 'bg-violet-400',
  sky: 'bg-sky-400',
  cyan: 'bg-cyan-400',
  indigo: 'bg-indigo-400',
  pink: 'bg-pink-400',
  teal: 'bg-teal-400',
  orange: 'bg-orange-400',
  slate: 'bg-slate-400',
}

export function IconChip({ tone, children, size = 'md', className }: { tone: Tone; children: React.ReactNode; size?: 'sm' | 'md'; className?: string }): React.ReactElement {
  return <span className={cn('flex shrink-0 items-center justify-center ring-1 [&_svg]:h-4 [&_svg]:w-4', size === 'md' ? 'h-9 w-9 rounded-xl' : 'h-8 w-8 rounded-lg', TINT[tone], className)}>{children}</span>
}

/** The gradient badge beside a page title. */
export function GradientChip({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }): React.ReactElement {
  // The landing page's quiet icon square: a soft tint of the page's color with a hairline ring
  return (
    <span aria-hidden className={cn('relative flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] ring-1 [&_svg]:h-5 [&_svg]:w-5', TINT[tone], className)}>
      {children}
    </span>
  )
}

export function Tag({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }): React.ReactElement {
  return <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', TINT[tone], className)}>{children}</span>
}

/**
 * A number with its label, Today-style: an icon chip, the label, an optional tag, then the figure and a short line.
 * A link when `href` is given. `muted` greys it out (nothing to look at).
 */
export function StatTile({ icon, tone, label, value, sub, tag, href, muted, className }: { icon: React.ReactNode; tone: Tone; label: string; value: React.ReactNode; sub?: React.ReactNode; tag?: React.ReactNode; href?: string; muted?: boolean; className?: string }): React.ReactElement {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <IconChip tone={muted ? 'slate' : tone} size="sm">
          {icon}
        </IconChip>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-muted-foreground">{label}</span>
        {tag ? <span className="hidden shrink-0 sm:inline-flex">{tag}</span> : null}
      </div>
      <div className={cn('mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] tabular-nums', muted && 'text-muted-foreground')}>{value}</div>
      {sub ? <p className="mt-2 truncate text-xs text-muted-foreground">{sub}</p> : null}
    </>
  )
  const cls = cn('group flex min-w-0 flex-col rounded-lg border border-border/80 bg-card p-4 shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-out', href && 'hover:-translate-y-px hover:border-primary/30 hover:shadow-md', muted && 'opacity-70', className)
  return href ? (
    <Link href={href} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}

/** Each lead stage in the palette (for gradient avatars and chips; pills use STATUS_TONE in lib/format). */
export const STAGE_TONE: Record<LeadStatus, Tone> = {
  NEW: 'sky',
  NO_ANSWER: 'slate',
  CALL_BACK: 'orange',
  VOICEMAIL: 'cyan',
  BUSY: 'amber',
  INTERESTED: 'emerald',
  NOT_INTERESTED: 'slate',
  WRONG_NUMBER: 'slate',
  CONTACTED: 'indigo',
  DEMO_SCHEDULED: 'violet',
  DEMO_SENT: 'pink',
  PROPOSAL_SENT: 'amber',
  SIGNED: 'teal',
  WON: 'emerald',
  LOST: 'rose',
}
