'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { createOffer, deleteDraftOffer, saveOfferContract, setOfferStatus, suggestModulesFromTranscript, updateOffer } from '@/app/actions/offers'
import type { TranscriptModules } from '@/lib/offer-transcript-ai'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { BILLING_PERIODS, GROUP_LABEL, MODULE_GROUPS, PERIOD_LABEL, allModulesTotal, defaultSelection, formatPrice, recurringTotals, selectionTotal, slugProblem, slugify, type BillingPeriod, type ModuleGroup, type OfferModuleItem } from '@/lib/offer-modules'

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

export function OfferEditor({ value, aiEnabled = false }: { value: OfferEditorValue; aiEnabled?: boolean }): React.ReactElement {
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

  const unpriced = modules.filter((m) => !m.price).length

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
        <Field label="Fixed monthly fee" hint="Optional, on top of monthly modules">
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

      {aiEnabled && !locked ? (
        <TranscriptPanel
          offerId={value.id}
          onAdd={(picked) => {
            setModules((ms) => [...ms, ...picked])
            setMsg({ ok: true, text: `Added ${picked.length} module${picked.length === 1 ? '' : 's'}. Set their prices, then Save numbers.` })
          }}
        />
      ) : null}

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
                <th className="px-2 py-2 text-start font-medium">Billing</th>
                <th className="px-2 py-2 text-center font-medium">Required</th>
                <th className="px-2 py-2 text-center font-medium">In package</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {modules.map((m, i) => (
                <tr key={i} className="border-t border-border">
                  <td className="space-y-1 p-1.5">
                    <Input value={m.name} onChange={(e) => set(i, { name: e.target.value, ...(m.id.startsWith('module-') && e.target.value ? { id: slugify(e.target.value).slice(0, 30) || m.id } : {}) })} disabled={locked} placeholder="e.g. Back office" />
                    <Input value={m.summary ?? ''} onChange={(e) => set(i, { summary: e.target.value || undefined })} disabled={locked} placeholder="One-line description (optional)" className="h-8 text-xs text-muted-foreground" />
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
                    <Input inputMode="numeric" value={m.price || ''} onChange={(e) => set(i, { price: toInt(e.target.value) ?? 0 })} disabled={locked} placeholder="Set price" className={`w-28 tabular-nums ${m.price ? '' : 'border-amber-500/60'}`} />
                  </td>
                  <td className="p-1.5">
                    <select value={m.period ?? 'once'} onChange={(e) => set(i, { period: e.target.value === 'once' ? undefined : (e.target.value as BillingPeriod) })} disabled={locked} className="h-10 rounded-md border border-input bg-background px-2 text-sm" aria-label="Billing">
                      {BILLING_PERIODS.map((p) => (
                        <option key={p} value={p}>
                          {PERIOD_LABEL[p].en}
                        </option>
                      ))}
                    </select>
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
            Recommended package <span className="font-semibold tabular-nums text-foreground">{formatPrice(selectionTotal(modules, defaultSelection(modules)), currency)}</span>
            {(() => {
              const r = recurringTotals(modules, defaultSelection(modules), toInt(monthly))
              return (
                <>
                  {r.month ? <span className="tabular-nums"> + {formatPrice(r.month, currency)} / month</span> : null}
                  {r.year ? <span className="tabular-nums"> + {formatPrice(r.year, currency)} / year</span> : null}
                </>
              )
            })()}{' '}
            · All one-time modules <span className="tabular-nums">{formatPrice(allModulesTotal(modules), currency)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="button" onClick={save} disabled={pending || locked}>
          {pending ? 'Saving…' : 'Save numbers'}
        </Button>
        {unpriced ? <span className="text-sm text-amber-400">{unpriced} module{unpriced === 1 ? '' : 's'} without a price</span> : null}
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

// ─── Transcript → modules (AI) ───────────────────────────────────────────────

const CONFIDENCE_TONE: Record<string, string> = { high: 'text-emerald-400', medium: 'text-amber-400', low: 'text-rose-400' }

/** Upload or paste a call transcript; OpenAI suggests modules; the admin ticks which to add (prices stay empty). */
function TranscriptPanel({ offerId, onAdd }: { offerId: string; onAdd: (modules: OfferModuleItem[]) => void }): React.ReactElement {
  const fileRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [result, setResult] = useState<TranscriptModules | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  async function readFile(file: File): Promise<void> {
    if (file.size > 1_000_000) return setError('That file is over 1 MB. Trim it to the call itself.')
    setText(await file.text())
    setFileName(file.name)
    setError(null)
  }

  function run(): void {
    setError(null)
    setResult(null)
    start(async () => {
      const res = await suggestModulesFromTranscript({ id: offerId, transcript: text })
      if (!res.ok) return setError(res.error)
      setResult(res.data)
      setPicked(new Set(res.data.modules.filter((m) => m.confidence !== 'low').map((m) => m.key)))
    })
  }

  function add(): void {
    if (!result) return
    onAdd(
      result.modules
        .filter((m) => picked.has(m.key))
        .map((m) => ({ id: m.key, group: m.group, name: m.name, price: 0, required: m.group === 'core', included: m.group === 'core' || m.included, summary: m.summary || undefined })),
    )
    setResult(null)
    setOpen(false)
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        Break a call transcript into modules (AI)
      </Button>
    )
  }

  return (
    <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Call transcript → modules</h3>
          <p className="text-xs text-muted-foreground">Upload a .txt or paste the call. The AI suggests modules with the quote they come from. It never sets prices; you do.</p>
        </div>
        <button type="button" className="text-sm text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input ref={fileRef} type="file" accept=".txt,.md,.vtt,.srt,text/plain" className="hidden" onChange={(e) => e.target.files?.[0] && void readFile(e.target.files[0])} />
        <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
          Upload .txt
        </Button>
        {fileName ? <span className="text-xs text-muted-foreground">{fileName} · {text.length.toLocaleString()} characters</span> : null}
      </div>
      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setFileName(null)
        }}
        rows={6}
        placeholder="…or paste the transcript here"
        className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
      />
      <div className="flex items-center gap-3">
        <Button type="button" size="sm" onClick={run} disabled={pending || text.trim().length < 200}>
          {pending ? 'Reading the call… (1–2 minutes)' : 'Break into modules'}
        </Button>
        {error ? <span className="text-sm text-rose-400">{error}</span> : null}
      </div>

      {result ? (
        <div className="space-y-4">
          {result.clientSummary ? <p className="text-sm"><span className="text-muted-foreground">What they want: </span>{result.clientSummary}</p> : null}
          <ul className="space-y-2">
            {result.modules.map((m) => (
              <li key={m.key} className="rounded-md border border-border bg-background/60 p-3">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={picked.has(m.key)}
                    onChange={(e) =>
                      setPicked((p) => {
                        const n = new Set(p)
                        e.target.checked ? n.add(m.key) : n.delete(m.key)
                        return n
                      })
                    }
                  />
                  <span className="flex-1 space-y-1 text-sm">
                    <span className="flex flex-wrap items-baseline gap-2">
                      <span className="font-medium">{m.name}</span>
                      <span className="rounded bg-muted px-1.5 text-[11px]">{GROUP_LABEL[m.group].en}</span>
                      {m.group !== 'core' ? <span className="text-[11px] text-muted-foreground">{m.included ? 'in package' : 'optional'}</span> : null}
                      <span className={`text-[11px] ${CONFIDENCE_TONE[m.confidence]}`}>{m.confidence} confidence</span>
                    </span>
                    {m.summary ? <span className="block text-muted-foreground">{m.summary}</span> : null}
                    {m.evidence ? <span className="block border-s-2 border-border ps-2 text-xs italic text-muted-foreground">“{m.evidence}”</span> : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {result.excluded.length ? (
            <div className="text-sm">
              <div className="mb-1 font-medium">Discussed but left out</div>
              <ul className="list-disc space-y-0.5 ps-5 text-muted-foreground">
                {result.excluded.map((x, i) => (
                  <li key={i}>
                    <span className="text-foreground">{x.topic}</span>: {x.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {result.openQuestions.length ? (
            <div className="text-sm">
              <div className="mb-1 font-medium">Open questions</div>
              <ul className="list-disc space-y-0.5 ps-5 text-muted-foreground">
                {result.openQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button type="button" size="sm" onClick={add} disabled={!picked.size}>
            Add {picked.size} module{picked.size === 1 ? '' : 's'}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
