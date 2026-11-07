'use client'

import { useEffect, useState } from 'react'
import { SignaturePad } from '@/components/SignaturePad'
import { AGREEMENT_CSS, namesMatch } from '@/lib/sales-contract-core'

const LOGO = '/igani-logo%202.png'

interface Preview {
  html: string
  repName: string
}

/** Public signing page, styled like the offer pages: logo header, soft background, step labels, accent button. */
export function CommissionSign({ code }: { code: string }): React.ReactElement {
  const [pv, setPv] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [businessNumber, setBusinessNumber] = useState('')
  const [sig, setSig] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    fetch('/api/public/sales-contract/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code }) })
      .then(async (r) => {
        const j = (await r.json()) as Preview & { error?: string }
        if (!r.ok) setError(j.error ?? 'This signing link is not valid.')
        else setPv(j)
      })
      .catch(() => setError('We could not load the agreement. Please check your connection and reload.'))
  }, [code])

  async function submit(): Promise<void> {
    setError(null)
    if (!namesMatch(name, pv?.repName ?? '')) return setError(`Please type your name exactly as written in the agreement: ${pv?.repName ?? ''}`)
    if (businessName.trim().length < 2) return setError('Please enter your registered business name.')
    if (!/^[0-9A-Za-z][0-9A-Za-z\-/ ]{4,29}$/.test(businessNumber.trim())) return setError('Please enter your business registration number (company, dealer or tax number).')
    if (!sig) return setError('Please draw your signature.')
    if (!agree) return setError('Please accept the agreement.')
    setBusy(true)
    try {
      const r = await fetch('/api/public/sales-contract/sign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code, name, businessName: businessName.trim(), businessNumber: businessNumber.trim(), signature: sig, agree: true }) })
      const j = (await r.json()) as { error?: string }
      if (!r.ok) setError(j.error ?? 'Something went wrong.')
      else {
        setDone(true)
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const frame = (children: React.ReactNode, step?: 1 | 2): React.ReactElement => (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 border-b border-slate-900/5 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO} alt="Igani" className="h-7 w-auto" />
          {step ? (
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={step === 1 ? 'rounded-full bg-blue-600 px-2.5 py-1 text-white' : 'px-2.5 py-1'}>1 · Review</span>
              <span className={step === 2 ? 'rounded-full bg-blue-600 px-2.5 py-1 text-white' : 'px-2.5 py-1'}>2 · Sign</span>
            </div>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-10">{children}</div>
      <p className="pb-8 text-center text-xs text-slate-400">© {new Date().getFullYear()} Igani · Yosef Lapid 1, Netanya, Israel · info@igani.co</p>
    </main>
  )

  if (done)
    return frame(
      <div className="rounded-2xl bg-white p-10 text-center shadow-[0_20px_60px_-30px_rgba(15,23,42,.35)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-2xl text-emerald-600">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Thank you, it&apos;s signed</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">The signed agreement was emailed to you and to Igani. Please keep that email. Igani also keeps a signed copy.</p>
      </div>,
    )
  if (!pv)
    return frame(
      <div className="rounded-2xl bg-white p-10 text-center text-slate-600 shadow-[0_20px_60px_-30px_rgba(15,23,42,.35)]">{error ?? 'Loading your agreement…'}</div>,
    )

  return frame(
    <div className="space-y-5">
      <style>{AGREEMENT_CSS}</style>
      <div className="rounded-2xl bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,.35)] sm:p-10" dangerouslySetInnerHTML={{ __html: pv.html }} />
      <section className="rounded-2xl bg-white p-5 shadow-[0_20px_60px_-30px_rgba(15,23,42,.35)] sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[.12em] text-blue-600">Step 2 · Sign</p>
        <h2 className="mt-1 text-xl font-bold">Sign the agreement</h2>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Type your full name exactly as written above</span>
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" value={name} onChange={(e) => setName(e.target.value)} placeholder={pv.repName} autoComplete="off" />
            {name.trim() && !namesMatch(name, pv.repName) ? <span className="block text-xs text-amber-600">Must match exactly: {pv.repName}</span> : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Your registered business name</span>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Business registration number</span>
              <input className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20" value={businessNumber} onChange={(e) => setBusinessNumber(e.target.value)} placeholder="Company, dealer or tax number" autoComplete="off" />
            </label>
          </div>
          <p className="-mt-2 text-xs text-slate-500">You sign in the name of your registered business, as the law requires for an independent representative. Both appear on the signed agreement.</p>
          <SignaturePad label="Your signature" onChange={setSig} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I have read this agreement and agree to its terms. I understand that typing my name and drawing my signature is my legal electronic signature.</span>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" onClick={() => void submit()} disabled={busy || !namesMatch(name, pv.repName) || !businessName.trim() || !businessNumber.trim() || !sig || !agree} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto">
            {busy ? 'Signing…' : 'Sign and submit'}
          </button>
          <p className="text-xs text-slate-500">After you sign, the final PDF is emailed to you and to Igani, and Igani keeps a signed copy.</p>
        </div>
      </section>
    </div>,
    2,
  )
}
