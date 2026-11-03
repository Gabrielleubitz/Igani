import type { ReactNode } from 'react'
import { Avatar, Icon, Picture, Pill, cx, type IconName } from './base'

/* Back-office / admin screens for the desktop frame (16:10). Compose: DashboardShell around the other blocks. */

export interface DashboardShellProps {
  brand: string
  logo?: string
  nav: { icon: IconName; label: string; badge?: string }[]
  active: number
  title: string
  subtitle?: string
  /** Buttons at the top right, e.g. ["Export", "+ New order"]; the last one is the primary */
  actions?: string[]
  user?: string
  children: ReactNode
}
/** Sidebar + header frame for any admin screen. */
export function DashboardShell({ brand, logo, nav, active, title, subtitle, actions = [], user, children }: DashboardShellProps): React.ReactElement {
  return (
    <div className="flex min-h-full bg-slate-50 text-[13px]">
      <aside className="w-48 shrink-0 border-e border-slate-200 bg-white p-3">
        <div className="mb-5 flex h-8 items-center">{logo ? <Picture src={logo} alt={brand} className="h-7 w-28 [&_img]:object-contain" sizes="120px" /> : <span className="text-base font-bold text-slate-900">{brand}</span>}</div>
        <nav className="space-y-0.5">
          {nav.map((n, i) => (
            <div key={n.label} className={cx('flex items-center gap-2 rounded-md px-2 py-1.5', i === active ? 'bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] font-semibold text-[var(--offer-accent)]' : 'text-slate-600')}>
              <Icon name={n.icon} className="h-4 w-4" />
              <span className="flex-1">{n.label}</span>
              {n.badge ? <span className="rounded-full bg-[var(--offer-accent)] px-1.5 text-[10px] font-semibold text-white">{n.badge}</span> : null}
            </div>
          ))}
        </nav>
        {user ? (
          <div className="mt-6 flex items-center gap-2 border-t border-slate-100 pt-3">
            <Avatar name={user} size={26} />
            <span className="truncate text-slate-700">{user}</span>
          </div>
        ) : null}
      </aside>
      <div className="min-w-0 flex-1 p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="text-slate-500">{subtitle}</div> : null}
          </div>
          <div className="flex gap-2">
            {actions.map((a, i) => (
              <span key={a} className={cx('rounded-md px-3 py-1.5 font-medium', i === actions.length - 1 ? 'bg-[var(--offer-accent)] text-white' : 'border border-slate-200 bg-white text-slate-700')}>
                {a}
              </span>
            ))}
          </div>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </div>
  )
}

export interface StatCardsProps {
  stats: { label: string; value: string; delta?: string; trend?: 'up' | 'down' | 'flat'; icon?: IconName; spark?: number[] }[]
}
/** KPI row: label, big number, change vs last period, optional sparkline (pattern from the analytics dashboard). */
export function StatCards({ stats }: StatCardsProps): React.ReactElement {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(stats.length, 4)}, minmax(0, 1fr))` }}>
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            {s.label}
            {s.icon ? <Icon name={s.icon} className="h-4 w-4 text-slate-400" /> : null}
          </div>
          <div className="mt-1 flex items-end justify-between gap-2">
            <span className="text-xl font-semibold tabular-nums text-slate-900">{s.value}</span>
            {s.spark?.length ? <Sparkline values={s.spark} /> : null}
          </div>
          {s.delta ? <div className={cx('mt-0.5 text-[11px] font-medium', s.trend === 'down' ? 'text-rose-600' : s.trend === 'flat' ? 'text-slate-500' : 'text-emerald-600')}>{s.delta}</div> : null}
        </div>
      ))}
    </div>
  )
}

export function Sparkline({ values, width = 72, height = 24 }: { values: number[]; width?: number; height?: number }): React.ReactElement {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const pts = values.map((v, i) => `${(i / Math.max(values.length - 1, 1)) * width},${height - ((v - min) / Math.max(max - min, 1)) * height}`).join(' ')
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <polyline points={pts} fill="none" stroke="var(--offer-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export interface DataTableProps {
  title?: string
  columns: string[]
  rows: (string | { text: string; pill?: 'accent' | 'neutral' | 'success' | 'warning' | 'danger' })[][]
  footer?: string
}
/** Simple table; a cell can be a status pill. */
export function DataTable({ title, columns, rows, footer }: DataTableProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      {title ? <div className="border-b border-slate-100 px-3 py-2.5 font-semibold text-slate-900">{title}</div> : null}
      <table className="w-full text-start">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 text-start font-medium">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} className={cx('px-3 py-2', j === 0 ? 'font-medium text-slate-900' : 'text-slate-600')}>
                  {typeof cell === 'string' ? cell : cell.pill ? <Pill tone={cell.pill}>{cell.text}</Pill> : cell.text}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer ? <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">{footer}</div> : null}
    </div>
  )
}

export interface BarChartProps {
  title: string
  subtitle?: string
  bars: { label: string; value: number }[]
  /** Formats the value labels, e.g. "₪" prefix; plain numbers when omitted */
  prefix?: string
  highlight?: number
}
/** Vertical bars (SVG, no chart library). */
export function BarChart({ title, subtitle, bars, prefix = '', highlight }: BarChartProps): React.ReactElement {
  const max = Math.max(...bars.map((b) => b.value), 1)
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-baseline justify-between">
        <span className="font-semibold text-slate-900">{title}</span>
        {subtitle ? <span className="text-[11px] text-slate-500">{subtitle}</span> : null}
      </div>
      <div className="mt-3 flex h-32 items-end gap-2">
        {bars.map((b, i) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <span className="text-[10px] tabular-nums text-slate-500">
              {prefix}
              {b.value.toLocaleString('en-US')}
            </span>
            <div className={cx('w-full rounded-t-md', i === highlight ? 'bg-[var(--offer-accent)]' : 'bg-[color-mix(in_srgb,var(--offer-accent)_30%,white)]')} style={{ height: `${(b.value / max) * 100}%` }} />
            <span className="text-[10px] text-slate-500">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface DayScheduleProps {
  title: string
  hours: string[]
  /** Bookings by hour label (multiple side by side) */
  items: Record<string, { label: string; tone?: 'accent' | 'violet' | 'amber' | 'emerald' }[]>
  /** Optional resource columns (rooms, staff) instead of a single list */
  columns?: string[]
}
const TONE: Record<string, string> = {
  accent: 'bg-[color-mix(in_srgb,var(--offer-accent)_14%,white)] text-[var(--offer-accent)]',
  violet: 'bg-violet-100 text-violet-900',
  amber: 'bg-amber-100 text-amber-900',
  emerald: 'bg-emerald-100 text-emerald-900',
}
/** Hour rows with booking chips (pattern from the cryo-booking admin calendar). */
export function DaySchedule({ title, hours, items, columns }: DayScheduleProps): React.ReactElement {
  return (
    <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
        <span className="font-semibold text-slate-900">{title}</span>
        {columns?.length ? (
          <span className="flex gap-3 text-[11px] text-slate-500">
            {columns.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </span>
        ) : null}
      </div>
      <div className="divide-y divide-slate-100">
        {hours.map((h) => (
          <div key={h} className="flex min-h-[34px] items-center gap-3 px-3 py-1.5">
            <span className="w-12 shrink-0 text-[11px] text-slate-400" dir="ltr">
              {h}
            </span>
            <div className="flex flex-1 flex-wrap gap-2">
              {(items[h] ?? []).map((b) => (
                <span key={b.label} className={cx('rounded px-2 py-0.5 text-[12px] font-medium', TONE[b.tone ?? 'accent'])}>
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export interface KanbanProps {
  columns: { title: string; tone?: 'accent' | 'neutral' | 'success' | 'warning'; cards: { title: string; meta?: string; tag?: string; person?: string }[] }[]
}
export function Kanban({ columns }: KanbanProps): React.ReactElement {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
      {columns.map((c) => (
        <div key={c.title} className="rounded-xl bg-slate-100/70 p-2">
          <div className="mb-2 flex items-center justify-between px-1 text-[12px] font-semibold text-slate-700">
            {c.title}
            <Pill tone={c.tone ?? 'neutral'}>{c.cards.length}</Pill>
          </div>
          <div className="space-y-2">
            {c.cards.map((card) => (
              <div key={card.title} className="rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-200">
                <div className="font-medium text-slate-900">{card.title}</div>
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  {card.meta ? <span className="text-[11px] text-slate-500">{card.meta}</span> : <span />}
                  {card.person ? <Avatar name={card.person} size={20} /> : card.tag ? <Pill>{card.tag}</Pill> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export interface ActivityFeedProps {
  title: string
  items: { who: string; what: string; when: string; icon?: IconName }[]
}
export function ActivityFeed({ title, items }: ActivityFeedProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="mb-2 font-semibold text-slate-900">{title}</div>
      <ul className="space-y-2.5">
        {items.map((a, i) => (
          <li key={i} className="flex items-start gap-2.5">
            {a.icon ? (
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] text-[var(--offer-accent)]">
                <Icon name={a.icon} className="h-3.5 w-3.5" />
              </span>
            ) : (
              <Avatar name={a.who} size={24} />
            )}
            <span className="flex-1 text-slate-600">
              <span className="font-medium text-slate-900">{a.who}</span> {a.what}
            </span>
            <span className="shrink-0 text-[11px] text-slate-400">{a.when}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export interface FormPanelProps {
  title: string
  fields: { label: string; value?: string; kind?: 'text' | 'select' | 'toggle' | 'textarea'; half?: boolean }[]
  actions?: string[]
}
/** Settings / edit form (static), two columns where fields are `half`. */
export function FormPanel({ title, fields, actions = [] }: FormPanelProps): React.ReactElement {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <div className="mb-3 font-semibold text-slate-900">{title}</div>
      <div className="grid grid-cols-2 gap-3">
        {fields.map((f) => (
          <div key={f.label} className={f.half ? '' : 'col-span-2'}>
            <div className="mb-1 text-[11px] font-medium text-slate-600">{f.label}</div>
            {f.kind === 'toggle' ? (
              <span className="flex h-5 w-9 items-center justify-end rounded-full bg-[var(--offer-accent)] p-0.5">
                <span className="h-4 w-4 rounded-full bg-white" />
              </span>
            ) : (
              <div className={cx('flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-2.5 text-slate-700', f.kind === 'textarea' ? 'h-16 items-start py-2' : 'h-8')}>
                <span className="truncate">{f.value ?? ''}</span>
                {f.kind === 'select' ? <Icon name="chevronRight" className="h-3.5 w-3.5 rotate-90 text-slate-400" /> : null}
              </div>
            )}
          </div>
        ))}
      </div>
      {actions.length ? (
        <div className="mt-4 flex justify-end gap-2">
          {actions.map((a, i) => (
            <span key={a} className={cx('rounded-md px-3 py-1.5 font-medium', i === actions.length - 1 ? 'bg-[var(--offer-accent)] text-white' : 'border border-slate-200 text-slate-700')}>
              {a}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
