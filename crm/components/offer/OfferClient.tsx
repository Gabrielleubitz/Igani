'use client'

import { Check, FileText, Lock, PenLine, ShieldCheck } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GROUP_LABEL, MODULE_GROUPS, allModulesTotal, formatModulePrice, formatPrice, normalizeSelection, periodOf, recurringTotals, selectionTotal, type OfferModuleItem } from '@/lib/offer-modules'
import { cn } from '@/lib/utils'
import type { Lang } from '@/offers/types'
import { ui } from './i18n'

// ─── Shared selection state ──────────────────────────────────────────────────

interface SelectionState {
  selected: string[]
  toggle: (id: string) => void
  total: number
  /** Recurring payments of the selection (monthly includes the offer's fixed monthly fee) */
  recurring: { month: number; year: number }
  editable: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
}

const Ctx = createContext<SelectionState | null>(null)
const useSelection = (): SelectionState => {
  const v = useContext(Ctx)
  if (!v) throw new Error('OfferSelectionProvider missing')
  return v
}

/** Holds the client's module choice for the whole page and saves it to the CRM (live offers only). */
export function OfferSelectionProvider({ slug, modules, initial, editable, fixedMonthly = null, children }: { slug: string; modules: OfferModuleItem[]; initial: string[]; editable: boolean; fixedMonthly?: number | null; children: ReactNode }): React.ReactElement {
  const [selected, setSelected] = useState(() => normalizeSelection(modules, initial))
  const [saveState, setSaveState] = useState<SelectionState['saveState']>('idle')
  // What the CRM already has: only a real change is saved (never the initial render, never twice)
  const lastSaved = useRef(JSON.stringify(normalizeSelection(modules, initial)))

  const toggle = useCallback(
    (id: string) => {
      const m = modules.find((x) => x.id === id)
      if (!editable || !m || m.required) return
      setSelected((cur) => normalizeSelection(modules, cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))
    },
    [modules, editable],
  )

  useEffect(() => {
    const key = JSON.stringify(selected)
    if (!editable || key === lastSaved.current) return
    setSaveState('saving')
    const timer = setTimeout(() => {
      fetch(`/api/public/offers/${encodeURIComponent(slug)}/select`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ modules: selected }) })
        .then((r) => {
          if (r.ok) lastSaved.current = key
          setSaveState(r.ok ? 'saved' : 'error')
        })
        .catch(() => setSaveState('error'))
    }, 700)
    return () => clearTimeout(timer)
  }, [selected, slug, editable])

  const value = useMemo(
    () => ({ selected, toggle, total: selectionTotal(modules, selected), recurring: recurringTotals(modules, selected, fixedMonthly), editable, saveState }),
    [selected, toggle, modules, editable, saveState, fixedMonthly],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The live one-time total, for the summary card. */
export function SelectedTotal({ currency }: { currency: string }): React.ReactElement {
  const { total } = useSelection()
  return <>{formatPrice(total, currency)}</>
}

/** Monthly / yearly lines under the package price (nothing when there are no recurring payments). For dark surfaces. */
export function PackageRecurring({ currency, labels }: { currency: string; labels: { month: string; year: string; perMonth: string; perYear: string } }): React.ReactElement | null {
  const { recurring } = useSelection()
  if (!recurring.month && !recurring.year) return null
  return (
    <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
      {recurring.month ? (
        <div>
          <div className="text-[12px] text-slate-400">{labels.month}</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatPrice(recurring.month, currency)} <span className="text-[12px] font-normal text-slate-400">{labels.perMonth}</span>
          </div>
        </div>
      ) : null}
      {recurring.year ? (
        <div>
          <div className="text-[12px] text-slate-400">{labels.year}</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums">
            {formatPrice(recurring.year, currency)} <span className="text-[12px] font-normal text-slate-400">{labels.perYear}</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}

/** @deprecated kept for older imports; use PackageRecurring */
export function SelectedRecurring({ currency, period, label }: { currency: string; period: 'month' | 'year'; label: string }): React.ReactElement | null {
  const { recurring } = useSelection()
  if (!recurring[period]) return null
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{formatPrice(recurring[period], currency)}</div>
    </div>
  )
}

// ─── Modules & pricing ───────────────────────────────────────────────────────

export interface ModuleCopy {
  title: string
  summary: string
  bullets: string[]
}

function CheckMark({ on, locked }: { on: boolean; locked: boolean }): React.ReactElement {
  return (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all duration-200',
        on ? 'bg-[var(--offer-accent)] text-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--offer-accent)_16%,transparent)]' : 'bg-white ring-1 ring-inset ring-slate-300 group-hover:ring-slate-400',
      )}
    >
      {locked ? <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden /> : on ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
    </span>
  )
}

export function ModulePicker({ modules, copy, currency, lang }: { modules: OfferModuleItem[]; copy: Record<string, ModuleCopy>; currency: string; lang: Lang }): React.ReactElement {
  const { selected, toggle, total, recurring, editable, saveState } = useSelection()
  const chosen = new Set(selected)
  return (
    <div className="space-y-12">
      {MODULE_GROUPS.map((g) => {
        const items = modules.filter((m) => m.group === g)
        if (!items.length) return null
        const picked = items.filter((m) => chosen.has(m.id)).length
        return (
          <div key={g}>
            <div className="mb-5 flex items-center justify-between gap-4">
              <h3 className="flex items-center gap-3 text-lg font-semibold tracking-tight text-slate-900">
                {GROUP_LABEL[g][lang]}
                <span className="rounded-full bg-slate-900/[0.05] px-2 py-0.5 text-[12px] font-semibold tabular-nums text-slate-500">
                  {picked}/{items.length}
                </span>
              </h3>
              <span className="text-sm font-medium tabular-nums text-slate-500">{formatPrice(items.filter((m) => periodOf(m) === 'once').reduce((sum, m) => sum + m.price, 0), currency)}</span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {items.map((m) => {
                const on = chosen.has(m.id)
                const c = copy[m.id]
                const clickable = editable && !m.required
                const recurringBadge = periodOf(m) !== 'once'
                return (
                  <label
                    key={m.id}
                    id={`module-${m.id}`}
                    className={cn(
                      'group relative flex scroll-mt-28 flex-col rounded-[22px] bg-white p-5 transition-all duration-200 sm:p-6',
                      on ? 'shadow-[0_18px_40px_-24px_color-mix(in_srgb,var(--offer-accent)_70%,transparent)] ring-2 ring-[var(--offer-accent)]' : 'ring-1 ring-slate-900/[0.07]',
                      clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]' : '',
                    )}
                  >
                    <input type="checkbox" className="sr-only" checked={on} disabled={!clickable} onChange={() => toggle(m.id)} />
                    <span className="flex items-start gap-3.5">
                      <CheckMark on={on} locked={m.required} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <span className="text-[16px] font-semibold leading-snug text-slate-900">{c?.title || m.name}</span>
                          <span className="whitespace-nowrap text-[16px] font-semibold tabular-nums text-slate-900">{formatModulePrice(m, currency, lang)}</span>
                        </span>
                        <span className="mt-2 flex flex-wrap gap-1.5">
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                              m.required ? 'bg-slate-900 text-white' : m.included ? 'bg-[color-mix(in_srgb,var(--offer-accent)_12%,white)] text-[var(--offer-accent)]' : 'bg-slate-900/[0.05] text-slate-600',
                            )}
                          >
                            {m.required ? ui('required', lang) : m.included ? ui('recommended', lang) : ui('optional', lang)}
                          </span>
                          {recurringBadge ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700">{periodOf(m) === 'month' ? ui('monthly', lang) : ui('yearly', lang)}</span> : null}
                        </span>
                      </span>
                    </span>
                    {c?.summary ? <span className="mt-4 text-[15px] leading-7 text-slate-600">{c.summary}</span> : null}
                    {c?.bullets.length ? (
                      <ul className="mt-3 space-y-1.5 border-t border-slate-900/[0.06] pt-3 text-sm text-slate-600">
                        {c.bullets.map((b, k) => (
                          <li key={k} className="flex gap-2.5">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--offer-accent)]" strokeWidth={2.5} aria-hidden />
                            {b}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="sticky bottom-4 z-20">
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-[22px] bg-slate-950/90 px-5 py-4 text-white shadow-[0_20px_50px_-20px_rgba(15,23,42,0.7)] ring-1 ring-white/10 backdrop-blur-xl sm:px-6">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] rtl:tracking-normal text-slate-400">{ui('yourPackage', lang)}</div>
            <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-2xl font-semibold tabular-nums tracking-tight">{formatPrice(total, currency)}</span>
              {recurring.month ? (
                <span className="text-sm text-slate-300">
                  + {formatPrice(recurring.month, currency)} {ui('perMonth', lang)}
                </span>
              ) : null}
              {recurring.year ? (
                <span className="text-sm text-slate-300">
                  + {formatPrice(recurring.year, currency)} {ui('perYear', lang)}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden text-end text-[12px] text-slate-400 sm:block">
              <div>
                {ui('allModules', lang)}: <span className="tabular-nums text-slate-300">{formatPrice(allModulesTotal(modules), currency)}</span>
              </div>
              <div aria-live="polite" className="h-4">
                {saveState === 'saving' ? ui('saving', lang) : saveState === 'saved' ? `✓ ${ui('saved', lang)}` : ''}
              </div>
            </div>
            <a href="#sign" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100">
              {ui('sign', lang)}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Signing ─────────────────────────────────────────────────────────────────

function SignaturePad({ onChange, label, clearLabel }: { onChange: (dataUrl: string | null) => void; label: string; clearLabel: string }): React.ReactElement {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  const [hasInk, setHasInk] = useState(false)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1b33'
  }, [])

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }
  const down = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = e.currentTarget.getContext('2d')!
    const [x, y] = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + 0.1, y + 0.1)
    ctx.stroke()
  }
  const move = (e: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!drawing.current) return
    const ctx = e.currentTarget.getContext('2d')!
    const [x, y] = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    dirty.current = true
  }
  const up = (): void => {
    if (!drawing.current) return
    drawing.current = false
    if (dirty.current && ref.current) {
      setHasInk(true)
      onChange(ref.current.toDataURL('image/png'))
    }
  }
  const clear = (): void => {
    const c = ref.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    dirty.current = false
    setHasInk(false)
    onChange(null)
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        {hasInk ? (
          <button type="button" onClick={clear} className="text-[13px] font-medium text-slate-500 hover:text-slate-900">
            {clearLabel}
          </button>
        ) : null}
      </div>
      <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(180deg,#fff,#f8fafc)] ring-1 ring-slate-900/10 focus-within:ring-2 focus-within:ring-[var(--offer-accent)]">
        <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} className="relative z-10 h-40 w-full cursor-crosshair touch-none" aria-label={label} />
        {/* signing line */}
        <span aria-hidden className="pointer-events-none absolute inset-x-6 bottom-9 border-b border-dashed border-slate-300" />
        <span aria-hidden className="pointer-events-none absolute bottom-6 start-6 text-lg text-slate-300">×</span>
        {!hasInk ? (
          <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400">
            <PenLine className="h-4 w-4" />
            {label}
          </span>
        ) : null}
      </div>
    </div>
  )
}

export interface SignPanelProps {
  slug: string
  lang: Lang
  currency: string
  modules: OfferModuleItem[]
  moduleTitles: Record<string, string>
  contractUrl: string | null
  defaultName: string
  defaultEmail: string
  /** null = open for signing */
  signed: { name: string; at: string } | null
  preview: boolean
}

function StepTitle({ n, children }: { n: number; children: ReactNode }): React.ReactElement {
  return (
    <div className="mb-3 flex items-center gap-2.5 text-[13px] font-semibold text-slate-900">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">{n}</span>
      {children}
    </div>
  )
}

export function SignPanel({ slug, lang, currency, modules, moduleTitles, contractUrl, defaultName, defaultEmail, signed, preview }: SignPanelProps): React.ReactElement {
  const { selected, total, recurring } = useSelection()
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [signature, setSignature] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ name: string; at: string } | null>(signed)

  if (done) {
    return (
      <div className="relative overflow-hidden rounded-[28px] bg-white p-8 text-center ring-1 ring-emerald-200 shadow-[0_30px_70px_-40px_rgba(5,150,105,0.5)]">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_8px_rgba(16,185,129,0.15)]">
          <Check className="h-7 w-7" strokeWidth={3} aria-hidden />
        </span>
        <div className="mt-5 text-2xl font-semibold tracking-tight text-slate-900">{ui('signedTitle', lang)}</div>
        <p className="mt-2 text-sm text-slate-600">
          {ui('signedBy', lang)} <b className="font-semibold text-slate-900">{done.name}</b> {ui('on', lang)} {new Date(done.at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { timeZone: 'Asia/Jerusalem', dateStyle: 'long' })}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-slate-600">{ui('signedBody', lang)}</p>
      </div>
    )
  }

  const disabled = preview || !contractUrl
  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!signature) return setError(ui('needSignature', lang))
    if (!agree) return setError(ui('needAgree', lang))
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/offers/${encodeURIComponent(slug)}/sign`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name, email, signature, agree, modules: selected, lang }),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string; signedAt?: string }
      if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`)
      setDone({ name, at: data.signedAt ?? new Date().toISOString() })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  const chosen = modules.filter((m) => selected.includes(m.id))
  const input = 'mt-1.5 w-full rounded-xl bg-white px-3.5 py-2.5 text-[15px] text-slate-900 shadow-sm outline-none ring-1 ring-slate-900/10 transition placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--offer-accent)] disabled:bg-slate-50 disabled:text-slate-400'
  return (
    <form onSubmit={submit} className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-45px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/[0.06] sm:p-8">
      <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--offer-accent)] via-[color-mix(in_srgb,var(--offer-accent)_45%,white)] to-[var(--offer-accent)]" />

      {/* 1. The agreement */}
      <StepTitle n={1}>{ui('contract', lang)}</StepTitle>
      {contractUrl ? (
        <a href={contractUrl} target="_blank" rel="noreferrer" className="group flex items-center gap-3 rounded-2xl bg-slate-50 p-3.5 ring-1 ring-slate-900/[0.06] transition hover:ring-[var(--offer-accent)]">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[var(--offer-accent)] ring-1 ring-slate-900/[0.06]">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <span className="flex-1 text-sm font-semibold text-slate-900">{ui('readContract', lang)}</span>
          <span className="text-slate-400 transition group-hover:text-[var(--offer-accent)]">↗</span>
        </a>
      ) : (
        <div className="rounded-2xl bg-slate-50 p-3.5 text-sm text-slate-500 ring-1 ring-slate-900/[0.06]">{ui('noContract', lang)}</div>
      )}

      {/* Summary of what is being signed */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm ring-1 ring-slate-900/[0.04]">
        <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.14em] rtl:tracking-normal text-slate-400">{ui('youSign', lang)}</div>
        <ul className="space-y-1.5 text-slate-700">
          {chosen.map((m) => (
            <li key={m.id} className="flex justify-between gap-4">
              <span className="min-w-0 truncate">{moduleTitles[m.id] || m.name}</span>
              <span className="shrink-0 tabular-nums text-slate-500">{formatModulePrice(m, currency, lang)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 space-y-1 border-t border-slate-900/[0.07] pt-3">
          <div className="flex justify-between text-[15px] font-semibold text-slate-900">
            <span>{ui('setupTotal', lang)}</span>
            <span className="tabular-nums">{formatPrice(total, currency)}</span>
          </div>
          {recurring.month ? (
            <div className="flex justify-between text-slate-600">
              <span>{ui('monthly', lang)}</span>
              <span className="tabular-nums">
                {formatPrice(recurring.month, currency)} {ui('perMonth', lang)}
              </span>
            </div>
          ) : null}
          {recurring.year ? (
            <div className="flex justify-between text-slate-600">
              <span>{ui('yearly', lang)}</span>
              <span className="tabular-nums">
                {formatPrice(recurring.year, currency)} {ui('perYear', lang)}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      {/* 2. Details */}
      <div className="mt-7">
        <StepTitle n={2}>{ui('yourDetails', lang)}</StepTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-[13px] font-medium text-slate-600">
            {ui('fullName', lang)}
            <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} className={input} autoComplete="name" />
          </label>
          <label className="block text-[13px] font-medium text-slate-600">
            {ui('email', lang)}
            <input required type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} dir="ltr" className={input} autoComplete="email" />
          </label>
        </div>
      </div>

      {/* 3. Signature */}
      <div className="mt-7">
        <StepTitle n={3}>{ui('signHere', lang)}</StepTitle>
        {disabled ? (
          <div className="flex h-28 items-center justify-center rounded-2xl bg-slate-50 text-sm text-slate-400 ring-1 ring-dashed ring-slate-900/10">
            <Lock className="me-2 h-4 w-4" aria-hidden />
            {preview ? ui('draft', lang) : ui('noContract', lang)}
          </div>
        ) : (
          <SignaturePad onChange={setSignature} label={ui('signHere', lang)} clearLabel={ui('clear', lang)} />
        )}
        <label className={cn('mt-4 flex cursor-pointer items-start gap-3 rounded-2xl p-3 text-sm leading-6 text-slate-700 transition', agree ? 'bg-[color-mix(in_srgb,var(--offer-accent)_7%,white)]' : 'hover:bg-slate-50')}>
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={disabled} className="sr-only" />
          <span className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md transition', agree ? 'bg-[var(--offer-accent)] text-white' : 'bg-white ring-1 ring-inset ring-slate-300')}>
            {agree ? <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden /> : null}
          </span>
          {ui('agree', lang)}
        </label>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{error}</p> : null}
      <button
        type="submit"
        disabled={disabled || busy}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--offer-accent)] px-5 py-4 text-[15px] font-semibold text-white shadow-[0_14px_30px_-14px_var(--offer-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
      >
        <PenLine className="h-4 w-4" aria-hidden />
        {busy ? ui('signing', lang) : ui('signButton', lang)}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] text-slate-400">
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
        {ui('secureNote', lang)}
      </p>
    </form>
  )
}
