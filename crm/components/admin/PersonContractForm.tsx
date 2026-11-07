'use client'

import { Check, Copy } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { generateContractLink } from '@/app/actions/sales-contracts'
import type { SignerView } from '@/components/admin/SignerPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AGREEMENT_CSS, agreementHtml, basePayout, companyIsComplete, termsFromCompany, validate, type CompanySettings, type Figures } from '@/lib/sales-contract-core'

const today = (): string => new Date().toISOString().slice(0, 10)

/**
 * The commission agreement for ONE salesperson, on their own page. Their name and email are fixed, the commission figures start from
 * their saved terms, and the company details come from Settings. Sending a new contract here replaces only this person's earlier
 * unsigned link, never anyone else's.
 */
export function PersonContractForm({
  person,
  initialFigures,
  signers,
  meId,
  adminEmail,
  company,
  pending,
}: {
  person: { name: string; email: string }
  initialFigures: Figures
  signers: SignerView[]
  meId: string
  adminEmail: string
  company: CompanySettings
  pending: { url: string; expiresAt: string } | null
}): React.ReactElement {
  const router = useRouter()
  const [date, setDate] = useState(today())
  const [agentAddress, setAgentAddress] = useState('')
  const [f, setF] = useState<Figures>(initialFigures)
  const ready = signers.filter((s) => s.signature)
  const [signerId, setSignerId] = useState((ready.find((s) => s.userId === meId) ?? ready[0])?.userId ?? '')
  const signer = signers.find((s) => s.userId === signerId)
  const sig = signer?.signature ?? ''
  const adminName = signer ? (signer.title ? `${signer.name}, ${signer.title}` : signer.name) : ''
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(pending)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, start] = useTransition()

  const t = useMemo(() => termsFromCompany(company, agentAddress), [company, agentAddress])
  const data = { name: person.name, email: person.email, effectiveDate: date, figures: f, terms: t }
  const preview = useMemo(
    () =>
      agreementHtml(
        { name: person.name, email: person.email, effectiveDate: date || today(), figures: f, terms: { ...t, companyLegalName: t.companyLegalName || '[Legal name]', companyIdNumber: t.companyIdNumber || '[number]', companyAddress: t.companyAddress || '[Company address]', agentAddress: t.agentAddress || '[Representative address]' } },
        {
          logo: '/igani-logo%202.png',
          status: 'preview',
          reference: 'PREVIEW',
          admin: { name: adminName, email: adminEmail, signature: sig || null, signedAt: null },
          rep: { name: person.name, email: person.email, signature: null, signedAt: null },
        },
      ),
    [person, date, f, t, sig, adminName, adminEmail],
  )

  const num = (key: keyof Figures, label: string, suffix: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} step="any" value={Number.isFinite(f[key]) ? f[key] : ''} onChange={(e) => setF({ ...f, [key]: e.target.value === '' ? NaN : Number(e.target.value) })} />
        <span className="text-muted-foreground">{suffix}</span>
      </div>
    </label>
  )

  function generate(): void {
    setError(null)
    const err = validate(data) ?? (sig ? null : 'Pick who signs for the company. They need a saved signature (Sales contracts page).')
    if (err) return setError(err)
    start(async () => {
      const res = await generateContractLink(data, signerId)
      if (res.ok) {
        setLink({ url: res.url, expiresAt: res.expiresAt })
        router.refresh()
      } else setError(res.error)
    })
  }

  if (!companyIsComplete(company)) {
    return (
      <p className="text-sm text-amber-400">
        The company details aren’t saved yet. Fill them in once on <Link className="underline" href="/admin/sales-contracts">Sales contracts</Link>, then come back to send {person.name}’s agreement.
      </p>
    )
  }

  return (
    <div className="space-y-4 text-sm">
      <p className="text-muted-foreground">
        Agreement for <b className="text-foreground">{person.name}</b> ({person.email}). The figures start from their saved commission terms.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="font-medium">Effective date</span>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block space-y-1">
          <span className="font-medium">Their address</span>
          <Input value={agentAddress} onChange={(e) => setAgentAddress(e.target.value)} placeholder="Street, city" />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {num('threshold', 'Tier threshold', 'ILS')}
        {num('basePercent', 'Commission up to the threshold', '%')}
        {num('bonus', 'Bonus per increment', 'ILS')}
        {num('increment', 'Increment size above the threshold', 'ILS')}
      </div>
      <p className="text-muted-foreground">Base payout: {Number.isFinite(basePayout(f)) ? basePayout(f).toLocaleString('en-US') : '—'} ILS</p>
      <label className="block space-y-1">
        <span className="font-medium">Signs for the company</span>
        {ready.length === 0 ? (
          <span className="block text-amber-400">
            No admin has a saved signature yet. Add one on <Link className="underline" href="/admin/sales-contracts">Sales contracts</Link>.
          </span>
        ) : (
          <select className="h-10 w-full rounded-md border border-input bg-background px-3" value={signerId} onChange={(e) => setSignerId(e.target.value)}>
            {ready.map((s) => (
              <option key={s.userId} value={s.userId}>
                {s.name}
                {s.title ? `, ${s.title}` : ''}
              </option>
            ))}
          </select>
        )}
      </label>
      {error ? <p className="text-red-500">{error}</p> : null}
      <Button onClick={generate} disabled={busy}>
        {busy ? 'Generating…' : link ? 'Replace with a new contract link' : 'Sign and generate link'}
      </Button>
      {link ? (
        <div className="space-y-2 rounded-lg border border-border p-3">
          <p className="font-medium">Contract link for {person.name} (valid until {new Date(link.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}, one use)</p>
          <div className="flex gap-2">
            <Input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                void navigator.clipboard.writeText(link.url).then(() => (setCopied(true), setTimeout(() => setCopied(false), 2000)))
              }}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
              <span className="ml-1">{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
          <p className="text-muted-foreground">Open for 12 hours or until signed. A new link here replaces only {person.name}’s earlier one; other salespeople’s contracts are not touched. When they sign, the PDF is emailed to you and to them.</p>
        </div>
      ) : null}
      <details>
        <summary className="cursor-pointer font-medium">Preview the agreement</summary>
        <style>{AGREEMENT_CSS}</style>
        <div className="mt-3 rounded-lg bg-white p-6 text-neutral-900">
          <div dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
      </details>
    </div>
  )
}
