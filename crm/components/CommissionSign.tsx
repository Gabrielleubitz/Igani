'use client'

import { useEffect, useState } from 'react'
import { SignaturePad } from '@/components/SignaturePad'
import { AGREEMENT_CSS } from '@/lib/sales-contract-core'

interface Preview {
  html: string
  repName: string
  adminName: string
  effectiveDate: string
  adminSignature: string
}

export function CommissionSign(): React.ReactElement {
  const [token, setToken] = useState('')
  const [pv, setPv] = useState<Preview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [sig, setSig] = useState('')
  const [agree, setAgree] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = window.location.hash.slice(1)
    if (!t) return setError('This signing link is incomplete. Please use the full link you were sent.')
    setToken(t)
    fetch('/api/public/sales-contract/preview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: t }) })
      .then(async (r) => {
        const j = (await r.json()) as Preview & { error?: string }
        if (!r.ok) setError(j.error ?? 'This signing link is not valid.')
        else setPv(j)
      })
      .catch(() => setError('We could not load the agreement. Please check your connection and reload.'))
  }, [])

  async function submit(): Promise<void> {
    setError(null)
    if (name.trim().length < 2) return setError('Please type your full name.')
    if (!sig) return setError('Please draw your signature.')
    if (!agree) return setError('Please accept the agreement.')
    setBusy(true)
    try {
      const r = await fetch('/api/public/sales-contract/sign', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, name, signature: sig, agree: true }) })
      const j = (await r.json()) as { error?: string }
      if (!r.ok) setError(j.error ?? 'Something went wrong.')
      else {
        setDone(true)
        history.replaceState(null, '', window.location.pathname) // drop the token from the address bar
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const shell = (children: React.ReactNode): React.ReactElement => (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900" style={{ fontFamily: 'Helvetica, Arial, sans-serif' }}>
      <div className="mx-auto max-w-2xl rounded-xl bg-white p-6 shadow-sm sm:p-10">
        <p className="mb-6 text-right text-xs leading-5 text-slate-500">
          <b className="block text-2xl text-slate-900">Igani.</b>Yosef Lapid 1, Netanya, Israel
        </p>
        {children}
      </div>
    </main>
  )

  if (done)
    return shell(
      <div className="py-10 text-center">
        <p className="text-4xl">✓</p>
        <h1 className="mt-3 text-2xl font-bold">Thank you, it&apos;s signed</h1>
        <p className="mt-2 text-slate-600">The signed agreement was emailed to you and to Igani. Please keep that email: it is not stored on our website.</p>
      </div>,
    )
  if (!pv) return shell(<p className="py-10 text-center text-slate-600">{error ?? 'Loading your agreement…'}</p>)

  return shell(
    <>
      <style>{AGREEMENT_CSS}</style>
      <div className="agr" dangerouslySetInnerHTML={{ __html: pv.html }} />
      <div className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-sm font-bold tracking-wide">SIGNATURES</h2>
        <div className="mt-3 flex items-center gap-4 rounded-lg bg-slate-50 p-3 text-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pv.adminSignature} alt="Igani signature" className="h-14 w-32 object-contain" />
          <span>
            Signed for Igani by <b>{pv.adminName}</b>
          </span>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Your full name</span>
            <input className="w-full rounded-md border border-slate-300 px-3 py-2" value={name} onChange={(e) => setName(e.target.value)} placeholder={pv.repName} autoComplete="name" />
          </label>
          <SignaturePad label="Your signature" onChange={setSig} />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" className="mt-1" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
            <span>I have read this agreement and agree to its terms. I understand that typing my name and drawing my signature is my legal electronic signature.</span>
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="button" onClick={() => void submit()} disabled={busy} className="rounded-lg bg-slate-900 px-5 py-2.5 font-medium text-white disabled:opacity-60">
            {busy ? 'Signing…' : 'Sign and submit'}
          </button>
          <p className="text-xs text-slate-500">After you sign, the final PDF is emailed to you and to Igani. Nothing is stored on the website.</p>
        </div>
      </div>
    </>,
  )
}
