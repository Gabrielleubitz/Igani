import type { ReactNode } from 'react'
import { AccentButton, Avatar, Icon, Picture, Pill, cx, type IconName } from './base'

/* Phone app screens and parts. Sized for the 300 px phone frame; they also work in a narrow desktop column. */

// ─── Shell ───────────────────────────────────────────────────────────────────

export interface AppTopBarProps {
  title: string
  back?: boolean
  action?: IconName
  rtl?: boolean
}
export function AppTopBar({ title, back = false, action, rtl = false }: AppTopBarProps): React.ReactElement {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-slate-900/[0.05] bg-white/85 px-3 py-2.5 backdrop-blur-md">
      {back ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/[0.04]">
          <Icon name={rtl ? 'chevronRight' : 'chevronLeft'} className="h-4 w-4 text-slate-600" />
        </span>
      ) : null}
      <span className={cx('flex-1 truncate text-[17px] font-semibold tracking-[-0.01em] text-slate-900', !back && 'ps-1')}>{title}</span>
      {action ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/[0.04]">
          <Icon name={action} className="h-4 w-4 text-slate-600" />
        </span>
      ) : null}
    </div>
  )
}

export interface TabBarProps {
  tabs: { icon: IconName; label: string }[]
  active: number
}
export function TabBar({ tabs, active }: TabBarProps): React.ReactElement {
  return (
    <nav className="sticky bottom-0 grid border-t border-slate-900/[0.05] bg-white/90 px-2 pb-4 pt-1.5 backdrop-blur-md" style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}>
      {tabs.map((t, i) => (
        <span key={t.label} className={cx('flex flex-col items-center gap-0.5 py-1 text-[10px]', i === active ? 'font-semibold text-[var(--offer-accent)]' : 'text-slate-400')}>
          <span className={cx('flex h-7 w-12 items-center justify-center rounded-full transition', i === active && 'bg-[color-mix(in_srgb,var(--offer-accent)_12%,white)]')}>
            <Icon name={t.icon} className="h-[18px] w-[18px]" />
          </span>
          {t.label}
        </span>
      ))}
    </nav>
  )
}

/** Full phone screen: optional top bar, scrolling content, optional bottom tab bar or sticky action button. */
export function AppScreen({ top, children, tabs, cta }: { top?: AppTopBarProps; children: ReactNode; tabs?: TabBarProps; cta?: string }): React.ReactElement {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      {top ? <AppTopBar {...top} /> : null}
      <div className="flex-1 space-y-4 p-4">{children}</div>
      {cta ? (
        <div className="sticky bottom-0 bg-white/95 p-4">
          <AccentButton className="w-full py-3.5">{cta}</AccentButton>
        </div>
      ) : null}
      {tabs ? <TabBar {...tabs} /> : null}
    </div>
  )
}

// ─── Content ─────────────────────────────────────────────────────────────────

export interface GreetingProps {
  hello: string
  name: string
  subtitle?: string
  avatar?: string
}
export function Greeting({ hello, name, subtitle, avatar }: GreetingProps): React.ReactElement {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} src={avatar} size={44} />
      <div>
        <div className="text-xs text-slate-500">{hello}</div>
        <div className="text-lg font-semibold text-slate-900">{name}</div>
        {subtitle ? <div className="text-xs text-slate-500">{subtitle}</div> : null}
      </div>
    </div>
  )
}

export interface SearchFieldProps {
  placeholder: string
  chips?: string[]
  activeChip?: number
}
export function SearchField({ placeholder, chips, activeChip = 0 }: SearchFieldProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] px-3 py-2.5 text-sm text-slate-400">
        <Icon name="search" className="h-4 w-4" />
        {placeholder}
      </div>
      {chips?.length ? (
        <div className="flex gap-2 overflow-x-auto">
          {chips.map((c, i) => (
            <span key={c} className={cx('whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium', i === activeChip ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]')}>
              {c}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export interface ListItem {
  title: string
  subtitle?: string
  meta?: string
  image?: string
  icon?: IconName
  badge?: string
  selected?: boolean
}
/** Rows with an optional picture or icon, subtitle, trailing meta (price, time) and badge. */
export function ItemList({ items, title }: { items: ListItem[]; title?: string }): React.ReactElement {
  return (
    <div>
      {title ? <div className="mb-2 text-sm font-semibold text-slate-900">{title}</div> : null}
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.title} className={cx('flex items-center gap-3 rounded-2xl border bg-white p-3', it.selected ? 'border-[var(--offer-accent)] ring-1 ring-[var(--offer-accent)]' : 'border-slate-200')}>
            {it.image ? (
              <Picture src={it.image} alt={it.title} className="h-12 w-12 shrink-0 rounded-xl" sizes="48px" />
            ) : it.icon ? (
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] text-[var(--offer-accent)]">
                <Icon name={it.icon} className="h-5 w-5" />
              </span>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-medium text-slate-900">{it.title}</span>
                {it.badge ? <Pill>{it.badge}</Pill> : null}
              </div>
              {it.subtitle ? <div className="truncate text-xs text-slate-500">{it.subtitle}</div> : null}
            </div>
            {it.meta ? <span className="shrink-0 text-sm font-semibold text-slate-900">{it.meta}</span> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export interface ProductGridProps {
  products: { name: string; price: string; image?: string; tag?: string; unit?: string }[]
  addLabel?: string
}
/** Two-column shop grid with a quick add button. */
export function ProductGrid({ products, addLabel = '+' }: ProductGridProps): React.ReactElement {
  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((p) => (
        <div key={p.name} className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
          <div className="relative">
            <Picture src={p.image} alt={p.name} className="aspect-square w-full" sizes="150px" />
            {p.tag ? (
              <span className="absolute start-2 top-2">
                <Pill>{p.tag}</Pill>
              </span>
            ) : null}
          </div>
          <div className="p-2.5">
            <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">
                {p.price}
                {p.unit ? <span className="ms-0.5 text-[11px] font-normal text-slate-500">{p.unit}</span> : null}
              </span>
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[var(--offer-accent)] px-2 text-sm font-semibold text-white">{addLabel}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export interface DetailHeroProps {
  image?: string
  title: string
  subtitle?: string
  price?: string
  facts?: { icon: IconName; label: string }[]
  description?: string
}
export function DetailHero({ image, title, subtitle, price, facts, description }: DetailHeroProps): React.ReactElement {
  return (
    <div className="-m-4 mb-0">
      <Picture src={image} alt={title} className="aspect-[4/3] w-full" sizes="300px" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
          </div>
          {price ? <div className="text-xl font-bold text-slate-900">{price}</div> : null}
        </div>
        {facts?.length ? (
          <div className="flex flex-wrap gap-2">
            {facts.map((f) => (
              <span key={f.label} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
                <Icon name={f.icon} className="h-3.5 w-3.5" />
                {f.label}
              </span>
            ))}
          </div>
        ) : null}
        {description ? <p className="text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
    </div>
  )
}

// ─── Booking & commerce ──────────────────────────────────────────────────────

export interface DayPickerProps {
  days: { weekday: string; day: string; disabled?: boolean }[]
  selected: number
}
export function DayPicker({ days, selected }: DayPickerProps): React.ReactElement {
  return (
    <div className="flex gap-2 overflow-x-auto">
      {days.map((d, i) => (
        <span
          key={i}
          className={cx('min-w-[52px] rounded-xl border py-2 text-center', i === selected ? 'border-transparent bg-[var(--offer-accent)] text-white' : d.disabled ? 'border-slate-100 text-slate-300' : 'border-slate-200 bg-white text-slate-700')}
        >
          <span className="block text-[11px] opacity-80">{d.weekday}</span>
          <span className="block text-lg font-semibold">{d.day}</span>
        </span>
      ))}
    </div>
  )
}

export interface TimeSlotsProps {
  slots: string[]
  selected?: number
  /** Indexes of taken slots (shown struck through) */
  taken?: number[]
  note?: string
}
/** Grid of times: taken ones struck through, the chosen one highlighted (from the cryo-booking flow). */
export function TimeSlots({ slots, selected, taken = [], note }: TimeSlotsProps): React.ReactElement {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {slots.map((s, i) => (
          <span
            key={s}
            className={cx(
              'rounded-lg border py-2 text-center text-sm',
              i === selected ? 'border-[var(--offer-accent)] bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] font-semibold text-[var(--offer-accent)]' : taken.includes(i) ? 'border-slate-100 text-slate-300 line-through' : 'border-slate-200 bg-white text-slate-700',
            )}
          >
            {s}
          </span>
        ))}
      </div>
      {note ? <p className="mt-3 text-xs leading-5 text-slate-500">{note}</p> : null}
    </div>
  )
}

export interface OrderSummaryProps {
  lines: { label: string; value: string; muted?: boolean }[]
  total: { label: string; value: string }
  note?: string
}
export function OrderSummary({ lines, total, note }: OrderSummaryProps): React.ReactElement {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
      <div className="space-y-2 text-sm">
        {lines.map((l) => (
          <div key={l.label} className="flex justify-between gap-3">
            <span className={l.muted ? 'text-slate-400' : 'text-slate-600'}>{l.label}</span>
            <span className={cx('tabular-nums', l.muted ? 'text-slate-400' : 'text-slate-900')}>{l.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-100 pt-3 font-semibold text-slate-900">
        <span>{total.label}</span>
        <span className="tabular-nums">{total.value}</span>
      </div>
      {note ? <p className="mt-2 text-xs text-slate-500">{note}</p> : null}
    </div>
  )
}

export interface PaymentMethodsProps {
  wallet?: string
  orCard: string
  cardFields: string[]
  consent?: string
}
/** Wallet button, then a card form (static). */
export function PaymentMethods({ wallet = ' Pay', orCard, cardFields, consent }: PaymentMethodsProps): React.ReactElement {
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-black py-3 text-center text-sm font-semibold text-white">{wallet}</div>
      <div className="text-center text-xs text-slate-400">{orCard}</div>
      {cardFields.map((f) => (
        <div key={f} className="rounded-xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-3 text-sm text-slate-400" dir="ltr">
          {f}
        </div>
      ))}
      {consent ? (
        <div className="flex items-center gap-2 pt-1 text-xs text-slate-500">
          <span className="h-4 w-4 rounded border border-slate-300" />
          {consent}
        </div>
      ) : null}
    </div>
  )
}

export interface SuccessScreenProps {
  title: string
  body: string
  card?: { title: string; subtitle?: string; actions?: string[] }
  footnote?: string
}
export function SuccessScreen({ title, body, card, footnote }: SuccessScreenProps): React.ReactElement {
  return (
    <div className="flex min-h-full flex-col items-center bg-[linear-gradient(180deg,color-mix(in_srgb,var(--offer-accent)_10%,white),white)] px-6 pt-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--offer-accent)] text-white">
        <Icon name="check" className="h-8 w-8" />
      </div>
      <div className="mt-6 text-2xl font-semibold text-slate-900">{title}</div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
      {card ? (
        <div className="mt-6 w-full rounded-2xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4 text-start text-sm">
          <div className="font-semibold text-slate-900">{card.title}</div>
          {card.subtitle ? <div className="mt-1 text-slate-500">{card.subtitle}</div> : null}
          {card.actions?.length ? (
            <div className="mt-3 flex gap-3 text-xs font-semibold text-[var(--offer-accent)]">
              {card.actions.map((a) => (
                <span key={a}>{a}</span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {footnote ? <div className="mt-6 text-xs text-slate-500">{footnote}</div> : null}
    </div>
  )
}

// ─── Account ─────────────────────────────────────────────────────────────────

export interface OtpSignInProps {
  brand: string
  title: string
  subtitle: string
  /** Digits already typed, e.g. "48" of a 6-digit code */
  typed?: string
  length?: number
  resend?: string
  cta: string
}
/** Sign in with a one-time code (no passwords). */
export function OtpSignIn({ brand, title, subtitle, typed = '', length = 6, resend, cta }: OtpSignInProps): React.ReactElement {
  return (
    <div className="flex min-h-full flex-col bg-white px-6 pt-12">
      <div className="text-lg font-bold text-[var(--offer-accent)]">{brand}</div>
      <h2 className="mt-8 text-2xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      <div className="mt-6 flex justify-between gap-2" dir="ltr">
        {Array.from({ length }, (_, i) => (
          <span key={i} className={cx('flex h-12 flex-1 items-center justify-center rounded-xl border text-lg font-semibold', i < typed.length ? 'border-slate-300 text-slate-900' : i === typed.length ? 'border-[var(--offer-accent)] ring-2 ring-[color-mix(in_srgb,var(--offer-accent)_25%,white)]' : 'border-slate-200')}>
            {typed[i] ?? ''}
          </span>
        ))}
      </div>
      {resend ? <div className="mt-4 text-center text-xs text-slate-500">{resend}</div> : null}
      <AccentButton className="mt-8 w-full py-3.5">{cta}</AccentButton>
    </div>
  )
}

export interface ProfileHeaderProps {
  name: string
  subtitle?: string
  avatar?: string
  stats?: { value: string; label: string }[]
}
export function ProfileHeader({ name, subtitle, avatar, stats }: ProfileHeaderProps): React.ReactElement {
  return (
    <div className="rounded-2xl bg-white p-4 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
      <div className="flex justify-center">
        <Avatar name={name} src={avatar} size={64} />
      </div>
      <div className="mt-3 text-lg font-semibold text-slate-900">{name}</div>
      {subtitle ? <div className="text-sm text-slate-500">{subtitle}</div> : null}
      {stats?.length ? (
        <div className="mt-4 grid grid-cols-3 divide-x divide-slate-100 rtl:divide-x-reverse">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="font-semibold tabular-nums text-slate-900">{s.value}</div>
              <div className="text-[11px] text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export interface SettingsListProps {
  groups: { title?: string; rows: { icon: IconName; label: string; value?: string; toggle?: boolean }[] }[]
  rtl?: boolean
}
export function SettingsList({ groups, rtl = false }: SettingsListProps): React.ReactElement {
  return (
    <div className="space-y-4">
      {groups.map((g, gi) => (
        <div key={gi}>
          {g.title ? <div className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</div> : null}
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
            {g.rows.map((r) => (
              <div key={r.label} className="flex items-center gap-3 px-3 py-3 text-sm">
                <Icon name={r.icon} className="h-4 w-4 text-slate-400" />
                <span className="flex-1 text-slate-800">{r.label}</span>
                {r.toggle !== undefined ? (
                  <span className={cx('flex h-5 w-9 items-center rounded-full p-0.5', r.toggle ? 'justify-end bg-[var(--offer-accent)]' : 'bg-slate-200')}>
                    <span className="h-4 w-4 rounded-full bg-white shadow" />
                  </span>
                ) : (
                  <>
                    {r.value ? <span className="text-slate-500">{r.value}</span> : null}
                    <Icon name={rtl ? 'chevronLeft' : 'chevronRight'} className="h-4 w-4 text-slate-300" />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Messaging ───────────────────────────────────────────────────────────────

export interface ChatThreadProps {
  with: string
  avatar?: string
  messages: { from: 'me' | 'them'; text: string; time?: string; image?: string }[]
  composer: string
}
export function ChatThread({ with: who, avatar, messages, composer }: ChatThreadProps): React.ReactElement {
  return (
    <div className="flex min-h-full flex-col bg-slate-50">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <Avatar name={who} src={avatar} size={32} />
        <span className="font-semibold text-slate-900">{who}</span>
      </div>
      <div className="flex-1 space-y-2 p-4">
        {messages.map((m, i) => (
          <div key={i} className={cx('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div className={cx('max-w-[78%] rounded-2xl px-3 py-2 text-sm', m.from === 'me' ? 'rounded-ee-md bg-[var(--offer-accent)] text-white' : 'rounded-es-md bg-white text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]')}>
              {m.image ? <Picture src={m.image} className="mb-2 aspect-[4/3] w-48 rounded-xl" sizes="200px" /> : null}
              {m.text}
              {m.time ? <div className={cx('mt-0.5 text-[10px]', m.from === 'me' ? 'text-white/70' : 'text-slate-400')}>{m.time}</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-slate-100 bg-white p-3">
        <span className="flex-1 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-400">{composer}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--offer-accent)] text-white">
          <Icon name="arrowRight" className="h-4 w-4 rtl:rotate-180" />
        </span>
      </div>
    </div>
  )
}

export interface NotificationListProps {
  items: { icon: IconName; title: string; body: string; time: string; unread?: boolean }[]
}
export function NotificationList({ items }: NotificationListProps): React.ReactElement {
  return (
    <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
      {items.map((n, i) => (
        <div key={i} className="flex gap-3 p-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] text-[var(--offer-accent)]">
            <Icon name={n.icon} className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{n.title}</span>
              {n.unread ? <span className="h-2 w-2 rounded-full bg-[var(--offer-accent)]" /> : null}
            </div>
            <div className="text-slate-500">{n.body}</div>
          </div>
          <span className="shrink-0 text-[11px] text-slate-400">{n.time}</span>
        </div>
      ))}
    </div>
  )
}

export interface StatusTimelineProps {
  steps: { label: string; time?: string; done?: boolean; current?: boolean }[]
}
/** Order / delivery / application progress. */
export function StatusTimeline({ steps }: StatusTimelineProps): React.ReactElement {
  return (
    <ol className="space-y-0 rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
      {steps.map((s, i) => (
        <li key={s.label} className="relative flex gap-3 pb-4 last:pb-0">
          {i < steps.length - 1 ? <span className={cx('absolute start-[9px] top-5 h-full w-0.5', s.done ? 'bg-[var(--offer-accent)]' : 'bg-slate-200')} /> : null}
          <span className={cx('relative z-10 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2', s.done ? 'border-[var(--offer-accent)] bg-[var(--offer-accent)] text-white' : s.current ? 'border-[var(--offer-accent)] bg-white' : 'border-slate-200 bg-white')}>
            {s.done ? <Icon name="check" className="h-3 w-3" /> : null}
          </span>
          <span className="text-sm">
            <span className={cx('block font-medium', s.done || s.current ? 'text-slate-900' : 'text-slate-400')}>{s.label}</span>
            {s.time ? <span className="block text-xs text-slate-500">{s.time}</span> : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
