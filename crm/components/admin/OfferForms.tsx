'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { createOffer, deleteDraftOffer, saveOfferContract, setOfferStatus, updateOffer } from '@/app/actions/offers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GROUP_LABEL, MODULE_GROUPS, allModulesTotal, defaultSelection, formatPrice, selectionTotal, slugProblem, slugify, type ModuleGroup, type OfferModuleItem } from '@/lib/offer-modules'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  )
}

function Msg({ msg }: { msg: { ok: boolean; text: string } | null }): React.ReactElement | null {
  if (!msg) return null
  return <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</p>
}

// ─── New offer ───────────────────────────────────────────────────────────────

export interface LeadOption {
  id: string
  label: string
  suggestedSlug: string
}

export function NewOfferForm({ leads, initialLeadId }: { leads: LeadOption[]; initialLeadId?: string }): React.ReactElement {
  const router = useRouter()
  const initial = leads.find((l) => l.id === initialLeadId)
  const [query, setQuery] = useState(initial?.label ?? '')
  const [leadId, setLeadId] = useState(initial?.id ?? '')
  const [slug, setSlug] = useState(initial?.suggestedSlug ?? '')
  const [title, setTitle] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q || leads.some((l) => l.label === query)) return []
    return leads.filter((l) => l.label.toLowerCase().includes(q)).slice(0, 8)
  }, [query, leads])
  const slugIssue = slug ? slugProblem(slug) : null

  function pick(l: LeadOption): void {
    setLeadId(l.id)
    setQuery(l.label)
    if (!slug) setSlug(l.suggestedSlug)
  }

  function submit(e: React.FormEvent): void {
    e.preventDefault()
    if (!leadId) return setMsg({ ok: false, text: 'Choose the lead this offer is for.' })
    start(async () => {
      const res = await createOffer({ leadId, slug, title })
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      router.push(`/admin/offers/${res.data.id}`)
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Lead" hint="Every offer belongs to an existing lead. When they sign, that lead moves to Signed.">
        <div className="relative">
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setLeadId('')
            }}
            placeholder="Search by name, company or email"
            autoComplete="off"
          />
          {matches.length ? (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg">
              {matches.map((l) => (
                <li key={l.id}>
                  <button type="button" onClick={() => pick(l)} className="w-full rounded px-2 py-1.5 text-start text-sm hover:bg-muted">
                    {l.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Field>
      <Field label="Offer title" hint='Shown in the CRM and on the signed PDF, e.g. "Booking system for Honey".'>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} maxLength={160} />
      </Field>
      <Field label="Web address" hint={slugIssue ?? (slug ? `${slug}.app.igani.co` : 'Lowercase letters, numbers and dashes.')}>
        <div className="flex items-center gap-2">
          <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} required className="max-w-[16rem]" />
          <span className="text-sm text-muted-foreground">.app.igani.co</span>
        </div>
      </Field>
      <Msg msg={msg} />
      <Button type="submit" disabled={pending || !!slugIssue}>
        {pending ? 'Creating…' : 'Create draft offer'}
      </Button>
    </form>
  )
}

// ─── Numbers + modules ───────────────────────────────────────────────────────

export interface OfferEditorValue {
  id: string
  title: string
  slug: string
  status: string
  currency: string
  monthlyPrice: number | null
  timelineMonths: number | null
  modules: OfferModuleItem[]
}

const blankModule = (n: number): OfferModuleItem => ({ id: `module-${n}`, group: 'main', name: '', price: 0, required: false, included: true })
const toInt = (v: string): number | null => (v.trim() === '' ? null : Math.max(0, Math.round(Number(v.replace(/[^\d.]/g, '')) || 0)))

export function OfferEditor({ value }: { value: OfferEditorValue }): React.ReactElement {
  const router = useRouter()
  const [title, setTitle] = useState(value.title)
  const [slug, setSlug] = useState(value.slug)
  const [currency, setCurrency] = useState(value.currency)
  const [monthly, setMonthly] = useState(value.monthlyPrice?.toString() ?? '')
  const [months, setMonths] = useState(value.timelineMonths?.toString() ?? '')
  const [modules, setModules] = useState<OfferModuleItem[]>(value.modules)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const locked = value.status === 'SIGNED'

  const set = (i: number, patch: Partial<OfferModuleItem>): void => setModules((ms) => ms.map((m, n) => (n === i ? { ...m, ...patch, ...(patch.group === 'core' ? { required: true, included: true } : {}) } : m)))
  const move = (i: number, d: -1 | 1): void =>
    setModules((ms) => {
      const j = i + d
      if (j < 0 || j >= ms.length) return ms
      const next = [...ms]
      ;[next[i], next[j]] = [next[j]!, next[i]!]
      return next
    })

  function save(): void {
    setMsg(null)
    start(async () => {
      const res = await updateOffer({
        id: value.id,
        title,
        slug,
        currency: currency as 'ILS',
        monthlyPrice: toInt(monthly),
        timelineMonths: toInt(months),
        modules: modules.map((m) => ({ ...m, id: slugify(m.id) || m.id, required: m.group === 'core' || m.required, included: m.group === 'core' || m.required || m.included })),
      })
      setMsg(res.ok ? { ok: true, text: 'Saved.' } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="sm:col-span-2">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={locked} />
          </Field>
        </div>
        <Field label="Web address" hint={value.status === 'DRAFT' ? undefined : 'Locked once published'}>
          <Input value={slug} onChange={(e) => setSlug(slugify(e.target.value))} disabled={locked || value.status !== 'DRAFT'} />
        </Field>
        <Field label="Monthly fee">
          <Input inputMode="numeric" value={monthly} onChange={(e) => setMonthly(e.target.value)} placeholder="none" disabled={locked} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={locked} className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm">
              {['ILS', 'USD', 'EUR', 'GBP'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Months">
            <Input inputMode="numeric" value={months} onChange={(e) => setMonths(e.target.value)} placeholder="–" disabled={locked} />
          </Field>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h3 className="font-semibold">Modules and prices</h3>
          <span className="text-xs text-muted-foreground">Key = how Claude refers to the module in the written content. Core modules are always required.</span>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th className="px-2 py-2 text-start font-medium">Name</th>
                <th className="px-2 py-2 text-start font-medium">Key</th>
                <th className="px-2 py-2 text-start font-medium">Group</th>
                <th className="px-2 py-2 text-start font-medium">Price</th>
                <th className="px-2 py-2 text-center font-medium">Required</th>
                <th className="px-2 py-2 text-center font-medium">In package</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {modules.map((m, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="p-1.5">
                    <Input value={m.name} onChange={(e) => set(i, { name: e.target.value, ...(m.id.startsWith('module-') && e.target.value ? { id: slugify(e.target.value).slice(0, 30) || m.id } : {}) })} disabled={locked} placeholder="e.g. Back office" />
                  </td>
                  <td className="p-1.5">
                    <Input value={m.id} onChange={(e) => set(i, { id: slugify(e.target.value) })} disabled={locked} className="w-36 font-mono text-xs" />
                  </td>
                  <td className="p-1.5">
                    <select value={m.group} onChange={(e) => set(i, { group: e.target.value as ModuleGroup })} disabled={locked} className="h-10 rounded-md border border-input bg-background px-2 text-sm">
                      {MODULE_GROUPS.map((g) => (
                        <option key={g} value={g}>
                          {GROUP_LABEL[g].en}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1.5">
                    <Input inputMode="numeric" value={m.price || ''} onChange={(e) => set(i, { price: toInt(e.target.value) ?? 0 })} disabled={locked} className="w-28 tabular-nums" />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="checkbox" checked={m.group === 'core' || m.required} disabled={locked || m.group === 'core'} onChange={(e) => set(i, { required: e.target.checked })} />
                  </td>
                  <td className="p-1.5 text-center">
                    <input type="checkbox" checked={m.group === 'core' || m.required || m.included} disabled={locked || m.group === 'core' || m.required} onChange={(e) => set(i, { included: e.target.checked })} />
                  </td>
                  <td className="whitespace-nowrap p-1.5 text-end">
                    <button type="button" className="px-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)} disabled={locked} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" className="px-1 text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)} disabled={locked} aria-label="Move down">
                      ↓
                    </button>
                    <button type="button" className="px-1 text-rose-400 hover:text-rose-300" onClick={() => setModules((ms) => ms.filter((_, n) => n !== i))} disabled={locked} aria-label="Remove">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setModules((ms) => [...ms, blankModule(ms.length + 1)])} disabled={locked}>
            + Add module
          </Button>
          <div className="text-sm text-muted-foreground">
            Recommended package <span className="font-semibold tabular-nums text-foreground">{formatPrice(selectionTotal(modules, defaultSelection(modules)), currency)}</span> · All modules{' '}
            <span className="tabular-nums">{formatPrice(allModulesTotal(modules), currency)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending || locked}>
          {pending ? 'Saving…' : 'Save numbers'}
        </Button>
        <Msg msg={msg} />
      </div>
    </div>
  )
}

// ─── Contract ────────────────────────────────────────────────────────────────

export function ContractUpload({ offerId, current, locked }: { offerId: string; current: { url: string; fileName: string } | null; locked: boolean }): React.ReactElement {
  const router = useRouter()
  const ref = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function upload(file: File): Promise<void> {
    if (file.type !== 'application/pdf') return setMsg({ ok: false, text: 'Please choose a PDF.' })
    if (file.size > 20 * 1024 * 1024) return setMsg({ ok: false, text: 'The PDF is over 20 MB.' })
    setBusy(true)
    setMsg(null)
    try {
      const sig = await fetch(`/api/admin/offers/${offerId}/contract-upload`, { method: 'POST' })
      const s = (await sig.json()) as { uploadUrl?: string; fields?: Record<string, string | number>; error?: string }
      if (!sig.ok || !s.uploadUrl || !s.fields) throw new Error(s.error ?? 'Could not start the upload.')
      const form = new FormData()
      for (const [k, v] of Object.entries(s.fields)) form.append(k, String(v))
      form.append('file', file)
      const up = await fetch(s.uploadUrl, { method: 'POST', body: form })
      const out = (await up.json()) as { secure_url?: string; public_id?: string; error?: { message?: string } }
      if (!up.ok || !out.secure_url || !out.public_id) throw new Error(out.error?.message ?? 'Cloudinary refused the upload.')
      const saved = await saveOfferContract({ id: offerId, url: out.secure_url, publicId: out.public_id, fileName: file.name })
      if (!saved.ok) throw new Error(saved.error)
      setMsg({ ok: true, text: 'Contract uploaded.' })
      router.refresh()
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : String(err) })
    } finally {
      setBusy(false)
      if (ref.current) ref.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      {current ? (
        <a href={current.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline-offset-2 hover:underline">
          {current.fileName}
        </a>
      ) : (
        <p className="text-sm text-muted-foreground">No contract yet. The client can only sign once one is attached.</p>
      )}
      {locked ? null : (
        <div className="flex items-center gap-3">
          <input ref={ref} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && void upload(e.target.files[0])} />
          <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
            {busy ? 'Uploading…' : current ? 'Replace PDF' : 'Upload PDF'}
          </Button>
          <Msg msg={msg} />
        </div>
      )}
    </div>
  )
}

// ─── Status ──────────────────────────────────────────────────────────────────

export function OfferStatusActions({ offerId, status }: { offerId: string; status: string }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void): void =>
    start(async () => {
      const res = await fn()
      if (!res.ok) return setMsg({ ok: false, text: res.error ?? 'Failed' })
      setMsg(null)
      after ? after() : router.refresh()
    })

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'DRAFT' ? (
        <Button size="sm" disabled={pending} onClick={() => run(() => setOfferStatus({ id: offerId, status: 'LIVE' }))}>
          Publish
        </Button>
      ) : null}
      {status === 'LIVE' ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setOfferStatus({ id: offerId, status: 'DRAFT' }))}>
          Back to draft
        </Button>
      ) : null}
      {status !== 'ARCHIVED' && status !== 'DRAFT' ? (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setOfferStatus({ id: offerId, status: 'ARCHIVED' }))}>
          Archive
        </Button>
      ) : null}
      {status === 'ARCHIVED' ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setOfferStatus({ id: offerId, status: 'DRAFT' }))}>
          Restore as draft
        </Button>
      ) : null}
      {status === 'DRAFT' ? (
        <Button size="sm" variant="ghost" className="text-rose-400" disabled={pending} onClick={() => run(() => deleteDraftOffer(offerId), () => router.push('/admin/offers'))}>
          Delete draft
        </Button>
      ) : null}
      <Msg msg={msg} />
    </div>
  )
}
