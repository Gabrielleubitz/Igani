'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GROUP_LABEL, MODULE_GROUPS, allModulesTotal, formatPrice, normalizeSelection, selectionTotal, type OfferModuleItem } from '@/lib/offer-modules'
import { cn } from '@/lib/utils'
import type { Lang } from '@/offers/types'
import { ui } from './i18n'

// ─── Shared selection state ──────────────────────────────────────────────────

interface SelectionState {
  selected: string[]
  toggle: (id: string) => void
  total: number
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
export function OfferSelectionProvider({ slug, modules, initial, editable, children }: { slug: string; modules: OfferModuleItem[]; initial: string[]; editable: boolean; children: ReactNode }): React.ReactElement {
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

  const value = useMemo(() => ({ selected, toggle, total: selectionTotal(modules, selected), editable, saveState }), [selected, toggle, modules, editable, saveState])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** The live one-time total, for the summary card. */
export function SelectedTotal({ currency }: { currency: string }): React.ReactElement {
  const { total } = useSelection()
  return <>{formatPrice(total, currency)}</>
}

// ─── Modules & pricing ───────────────────────────────────────────────────────

export interface ModuleCopy {
  title: string
  summary: string
  bullets: string[]
}

export function ModulePicker({ modules, copy, currency, monthlyPrice, lang }: { modules: OfferModuleItem[]; copy: Record<string, ModuleCopy>; currency: string; monthlyPrice: number | null; lang: Lang }): React.ReactElement {
  const { selected, toggle, total, editable, saveState } = useSelection()
  const chosen = new Set(selected)
  return (
    <div className="space-y-10">
      {MODULE_GROUPS.map((g) => {
        const items = modules.filter((m) => m.group === g)
        if (!items.length) return null
        return (
          <div key={g}>
            <div className="mb-4 flex items-baseline justify-between gap-4 border-b border-slate-200 pb-2">
              <h3 className="text-lg font-semibold text-slate-900">{GROUP_LABEL[g][lang]}</h3>
              <span className="text-sm tabular-nums text-slate-500">{formatPrice(items.reduce((s, m) => s + m.price, 0), currency)}</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((m) => {
                const on = chosen.has(m.id)
                const c = copy[m.id]
                return (
                  <label
                    key={m.id}
                    id={`module-${m.id}`}
                    className={cn(
                      'flex scroll-mt-24 flex-col rounded-2xl border bg-white p-5 transition-shadow',
                      on ? 'border-[var(--offer-accent)] shadow-[0_8px_30px_-12px_var(--offer-accent)]' : 'border-slate-200',
                      editable && !m.required ? 'cursor-pointer hover:shadow-md' : '',
                    )}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4 accent-[var(--offer-accent)]"
                        checked={on}
                        disabled={!editable || m.required}
                        onChange={() => toggle(m.id)}
                      />
                      <span className="flex-1">
                        <span className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="font-semibold text-slate-900">{c?.title || m.name}</span>
                          <span className="font-semibold tabular-nums text-slate-900">{formatPrice(m.price, currency)}</span>
                        </span>
                        <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          {m.required ? ui('required', lang) : m.included ? ui('recommended', lang) : ui('optional', lang)}
                        </span>
                      </span>
                    </span>
                    {c?.summary ? <span className="mt-3 text-sm leading-relaxed text-slate-600">{c.summary}</span> : null}
                    {c?.bullets.length ? (
                      <ul className="mt-3 space-y-1 text-sm text-slate-600">
                        {c.bullets.map((b, n) => (
                          <li key={n} className="flex gap-2">
                            <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--offer-accent)]" />
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
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 px-6 py-4 text-white shadow-xl">
        <div>
          <div className="text-xs uppercase tracking-wider text-slate-400">{ui('yourPackage', lang)}</div>
          <div className="text-2xl font-semibold tabular-nums">
            {formatPrice(total, currency)}
            {monthlyPrice ? (
              <span className="ms-2 text-sm font-normal text-slate-300">
                {ui('plusMonthly', lang)} {formatPrice(monthlyPrice, currency)} {ui('perMonth', lang)}
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-end text-xs text-slate-400">
          <div>
            {ui('allModules', lang)}: <span className="tabular-nums">{formatPrice(allModulesTotal(modules), currency)}</span>
          </div>
          <div aria-live="polite" className="h-4">
            {saveState === 'saving' ? ui('saving', lang) : saveState === 'saved' ? ui('saved', lang) : ''}
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

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
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
    if (dirty.current && ref.current) onChange(ref.current.toDataURL('image/png'))
  }
  const clear = (): void => {
    const c = ref.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    dirty.current = false
    onChange(null)
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <button type="button" onClick={clear} className="text-slate-500 underline-offset-2 hover:underline">
          {clearLabel}
        </button>
      </div>
      <canvas
        ref={ref}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="h-40 w-full touch-none rounded-xl border border-dashed border-slate-300 bg-white"
        aria-label={label}
      />
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

export function SignPanel({ slug, lang, currency, modules, moduleTitles, contractUrl, defaultName, defaultEmail, signed, preview }: SignPanelProps): React.ReactElement {
  const { selected, total } = useSelection()
  const [name, setName] = useState(defaultName)
  const [email, setEmail] = useState(defaultEmail)
  const [signature, setSignature] = useState<string | null>(null)
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ name: string; at: string } | null>(signed)

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900">
        <div className="text-lg font-semibold">{ui('signedTitle', lang)}</div>
        <p className="mt-1 text-sm">
          {ui('signedBy', lang)} {done.name} {ui('on', lang)} {new Date(done.at).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-GB', { timeZone: 'Asia/Jerusalem' })}.
        </p>
        <p className="mt-2 text-sm">{ui('signedBody', lang)}</p>
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
  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-slate-900">{ui('contract', lang)}</div>
        {contractUrl ? (
          <a href={contractUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-[var(--offer-accent)] underline-offset-2 hover:underline">
            {ui('readContract', lang)}
          </a>
        ) : (
          <span className="text-sm text-slate-500">{ui('noContract', lang)}</span>
        )}
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
        <div className="mb-2 font-medium">{ui('youSign', lang)}:</div>
        <ul className="space-y-1">
          {chosen.map((m) => (
            <li key={m.id} className="flex justify-between gap-4">
              <span>{moduleTitles[m.id] || m.name}</span>
              <span className="tabular-nums">{formatPrice(m.price, currency)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 font-semibold text-slate-900">
          <span>{ui('setupTotal', lang)}</span>
          <span className="tabular-nums">{formatPrice(total, currency)}</span>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{ui('fullName', lang)}</span>
          <input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} disabled={disabled} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[var(--offer-accent)]" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">{ui('email', lang)}</span>
          <input required type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} disabled={disabled} dir="ltr" className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-[var(--offer-accent)]" />
        </label>
      </div>
      {disabled ? null : <SignaturePad onChange={setSignature} label={ui('signHere', lang)} clearLabel={ui('clear', lang)} />}
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} disabled={disabled} className="mt-0.5 h-4 w-4 accent-[var(--offer-accent)]" />
        {ui('agree', lang)}
      </label>
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <button type="submit" disabled={disabled || busy} className="w-full rounded-xl bg-[var(--offer-accent)] px-5 py-3 font-semibold text-white transition-opacity disabled:opacity-50">
        {busy ? ui('signing', lang) : ui('signButton', lang)}
      </button>
      {preview ? <p className="text-center text-xs text-slate-500">{ui('draft', lang)}</p> : null}
    </form>
  )
}
