'use client'

import { ArrowDown, ArrowUp, CheckCircle2, ExternalLink, Loader2, Lock, Plus, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { approveContract, draftContractWithAI, reopenContract, saveContract } from '@/app/actions/contracts'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import type { ContractDoc } from '@/lib/contract'

type Lang = 'he' | 'en'

/** Clauses are edited as paragraphs separated by a blank line. */
const toText = (clauses: string[]): string => clauses.join('\n\n')
const toClauses = (text: string): string[] =>
  text
    .split(/\n\s*\n/)
    .map((c) => c.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)

export function ContractEditor({
  offerId,
  initial,
  initialLang,
  approved,
  signed,
  signerReady,
}: {
  offerId: string
  initial: ContractDoc | null
  initialLang: Lang
  approved: boolean
  signed: boolean
  signerReady: boolean
}): React.ReactElement {
  const router = useRouter()
  const [lang, setLang] = useState<Lang>(initialLang)
  const [doc, setDoc] = useState<ContractDoc | null>(initial)
  const [dirty, setDirty] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [version, setVersion] = useState(0)
  const [confirmRedraft, setConfirmRedraft] = useState(false)
  const [pending, start] = useTransition()
  const [drafting, setDrafting] = useState(false)
  const locked = approved || signed
  const rtl = lang === 'he'

  const change = (next: ContractDoc): void => {
    setDoc(next)
    setDirty(true)
  }
  const setSection = (i: number, patch: Partial<ContractDoc['sections'][number]>): void => {
    if (doc) change({ ...doc, sections: doc.sections.map((s, n) => (n === i ? { ...s, ...patch } : s)) })
  }
  const move = (i: number, d: -1 | 1): void => {
    if (!doc) return
    const j = i + d
    if (j < 0 || j >= doc.sections.length) return
    const next = [...doc.sections]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    change({ ...doc, sections: next })
  }

  function draft(): void {
    if (doc && !confirmRedraft) return setConfirmRedraft(true)
    setConfirmRedraft(false)
    setMsg(null)
    setDrafting(true)
    start(async () => {
      const res = await draftContractWithAI({ id: offerId, lang })
      setDrafting(false)
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setDoc(res.data)
      setDirty(false)
      setVersion((v) => v + 1)
      setMsg({ ok: true, text: 'Drafted. Read it through, edit anything, then approve.' })
    })
  }

  function save(after?: () => void): void {
    if (!doc) return
    setMsg(null)
    start(async () => {
      const res = await saveContract({ id: offerId, lang, doc })
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setDirty(false)
      setVersion((v) => v + 1)
      if (after) after()
      else setMsg({ ok: true, text: 'Saved.' })
    })
  }

  function approve(): void {
    const go = (): void =>
      start(async () => {
        const res = await approveContract(offerId)
        if (!res.ok) return setMsg({ ok: false, text: res.error })
        setMsg({ ok: true, text: 'Approved and signed for Igani. The client can sign it on the offer page.' })
        setVersion((v) => v + 1)
        router.refresh()
      })
    dirty ? save(go) : go()
  }

  function reopen(): void {
    start(async () => {
      const res = await reopenContract(offerId)
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      setMsg({ ok: true, text: 'Reopened for edits. Approve again when ready.' })
      setVersion((v) => v + 1)
      router.refresh()
    })
  }

  const preview = `/api/admin/offers/${offerId}/contract/preview?v=${version}`

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ── Editor ── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3">
          <span className="text-sm text-muted-foreground">Language</span>
          {(['he', 'en'] as const).map((l) => (
            <Button key={l} size="sm" variant={lang === l ? 'secondary' : 'ghost'} disabled={locked} onClick={() => (setLang(l), setDirty(true))}>
              {l === 'he' ? 'עברית' : 'English'}
            </Button>
          ))}
          <span className="mx-1 h-5 w-px bg-border" />
          <Button size="sm" variant={doc ? 'outline' : 'default'} onClick={draft} disabled={locked || pending}>
            {drafting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Sparkles className="h-4 w-4" aria-hidden />}
            {drafting ? 'Drafting… (about 30 s)' : confirmRedraft ? 'Replace the current text?' : doc ? 'Redraft with AI' : 'Draft with AI'}
          </Button>
          {confirmRedraft ? (
            <Button size="sm" variant="ghost" onClick={() => setConfirmRedraft(false)}>
              Keep it
            </Button>
          ) : null}
          <span className="ms-auto flex items-center gap-2">
            {locked ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                {signed ? 'Signed' : 'Approved'}
              </span>
            ) : dirty ? (
              <span className="text-xs text-amber-400">Unsaved changes</span>
            ) : null}
          </span>
        </div>

        {!doc ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No contract yet. <b className="text-foreground">Draft with AI</b> writes it from Igani&apos;s standard terms and this offer (scope, modules, timeline, recurring fees). Prices are never in the text: Schedule A is built from the modules.
          </div>
        ) : (
          <div className="space-y-3" dir={rtl ? 'rtl' : 'ltr'}>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Title</span>
              <Input value={doc.title} disabled={locked} onChange={(e) => change({ ...doc, title: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Subtitle</span>
              <Input value={doc.subtitle ?? ''} disabled={locked} onChange={(e) => change({ ...doc, subtitle: e.target.value })} />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Opening paragraph</span>
              <Textarea rows={3} value={doc.intro} disabled={locked} onChange={(e) => change({ ...doc, intro: e.target.value })} />
            </label>
            {doc.sections.map((s, i) => (
              <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 text-sm font-semibold tabular-nums text-muted-foreground">{i + 1}.</span>
                  <Input value={s.heading} disabled={locked} onChange={(e) => setSection(i, { heading: e.target.value })} className="font-semibold" />
                  {!locked ? (
                    <span className="flex shrink-0">
                      <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-1.5 text-muted-foreground hover:text-foreground" onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown className="h-4 w-4" />
                      </button>
                      <button type="button" className="p-1.5 text-rose-400 hover:text-rose-300" onClick={() => change({ ...doc, sections: doc.sections.filter((_, n) => n !== i) })} aria-label="Remove section">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null}
                </div>
                <Textarea
                  rows={Math.min(14, Math.max(3, s.clauses.join(' ').length / 90 + s.clauses.length))}
                  value={toText(s.clauses)}
                  disabled={locked}
                  onChange={(e) => setSection(i, { clauses: toClauses(e.target.value) })}
                  className="text-sm leading-6"
                />
                <div className="text-xs text-muted-foreground">
                  {s.clauses.length} clause{s.clauses.length === 1 ? '' : 's'} · separate clauses with an empty line (numbered {i + 1}.1, {i + 1}.2 … automatically)
                </div>
              </div>
            ))}
            {!locked ? (
              <Button type="button" variant="outline" size="sm" onClick={() => change({ ...doc, sections: [...doc.sections, { heading: lang === 'he' ? 'סעיף חדש' : 'New section', clauses: [''] }] })}>
                <Plus className="h-4 w-4" aria-hidden /> Add section
              </Button>
            ) : null}
          </div>
        )}

        <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/95 p-3 backdrop-blur">
          {locked ? (
            !signed ? (
              <Button variant="outline" onClick={reopen} disabled={pending}>
                Reopen for edits
              </Button>
            ) : null
          ) : (
            <>
              <Button variant="outline" onClick={() => save()} disabled={!doc || !dirty || pending}>
                Save
              </Button>
              <Button onClick={approve} disabled={!doc || pending || !signerReady} title={signerReady ? 'Locks the text and adds Igani’s signature' : 'Add Igani’s signer and signature in Settings first'}>
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Approve & sign for Igani
              </Button>
            </>
          )}
          {!signerReady && !locked ? (
            <Link href="/admin/settings#contract-signer" className="text-xs text-amber-400 underline-offset-2 hover:underline">
              Set Igani&apos;s signature in Settings first
            </Link>
          ) : null}
          {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="space-y-2 xl:sticky xl:top-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Preview (what the client sees)</span>
          <a href={`${preview}&format=pdf`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
            Open the PDF <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </div>
        <iframe key={version} src={preview} title="Contract preview" className="h-[calc(100vh-8rem)] min-h-[640px] w-full rounded-lg border border-border bg-[#f1f5f9]" />
        {dirty ? <p className="text-xs text-amber-400">The preview shows the last saved version. Save to update it.</p> : null}
      </div>
    </div>
  )
}
