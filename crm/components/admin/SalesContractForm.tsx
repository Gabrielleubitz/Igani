'use client'

import { Check, Copy } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { generateContractLink } from '@/app/actions/sales-contracts'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { SignerPicker, type SignerView } from '@/components/admin/SignerPicker'
import { AGREEMENT_CSS, CHOSEN_TERMS, DEFAULT_FIGURES, agreementHtml, basePayout, validate, type Figures, type LegalTerms } from '@/lib/sales-contract-core'

const today = (): string => new Date().toISOString().slice(0, 10)

export function SalesContractForm({ signers, meId, adminEmail }: { signers: SignerView[]; meId: string; adminEmail: string }): React.ReactElement {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState(today())
  const [f, setF] = useState<Figures>(DEFAULT_FIGURES)
  const [t, setT] = useState<LegalTerms>(CHOSEN_TERMS)
  const firstReady = signers.find((x) => x.userId === meId && x.signature) ?? signers.find((x) => x.signature)
  const [signerId, setSignerId] = useState(firstReady?.userId ?? '')
  const signer = signers.find((x) => x.userId === signerId)
  const sig = signer?.signature ?? ''
  const adminName = signer ? (signer.title ? `${signer.name}, ${signer.title}` : signer.name) : ''
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  const data = { name, email, effectiveDate: date, figures: f, terms: t }
  const preview = useMemo(
    () =>
      agreementHtml(
        { name: name.trim() || '[Representative name]', email: email || 'representative@email', effectiveDate: date || today(), figures: f, terms: { ...t, companyLegalName: t.companyLegalName || '[Legal name]', companyIdNumber: t.companyIdNumber || '[number]', companyAddress: t.companyAddress || '[Company address]', agentAddress: t.agentAddress || '[Representative address]', jurisdiction: t.jurisdiction || '[Jurisdiction]' } },
        {
          logo: '/igani-logo%202.png',
          status: 'preview',
          reference: 'PREVIEW',
          admin: { name: adminName, email: adminEmail, signature: sig || null, signedAt: null },
          rep: { name: name.trim(), email, signature: null, signedAt: null },
        },
      ),
    [name, email, date, f, t, sig, adminName, adminEmail],
  )

  const num = (key: keyof Figures, label: string, suffix: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input type="number" min={0} step="any" value={Number.isFinite(f[key]) ? f[key] : ''} onChange={(e) => (setLink(null), setF({ ...f, [key]: e.target.value === '' ? NaN : Number(e.target.value) }))} />
        <span className="text-muted-foreground">{suffix}</span>
      </div>
    </label>
  )

  const txt = (key: 'companyLegalName' | 'companyTradingAs' | 'companyIdNumber' | 'companyAddress' | 'agentAddress' | 'jurisdiction', label: string, placeholder: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input value={t[key]} onChange={(e) => (setLink(null), setT({ ...t, [key]: e.target.value }))} placeholder={placeholder} />
    </label>
  )
  const days = (key: 'payoutDays' | 'clawbackDays' | 'noticeDays', label: string, suffix: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} step={1} value={Number.isFinite(t[key]) ? t[key] : ''} onChange={(e) => (setLink(null), setT({ ...t, [key]: e.target.value === '' ? NaN : Number(e.target.value) }))} />
        <span className="text-muted-foreground">{suffix}</span>
      </div>
    </label>
  )

  function generate(): void {
    setError(null)
    const err = validate(data) ?? (sig ? null : 'Pick who signs for the company. They need a saved signature: click Edit signature.')
    if (err) return setError(err)
    start(async () => {
      const res = await generateContractLink(data, signerId)
      if (res.ok) setLink({ url: res.url, expiresAt: res.expiresAt })
      else setError(res.error)
    })
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Agreement details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Representative name</span>
              <Input value={name} onChange={(e) => (setLink(null), setName(e.target.value))} placeholder="Ariel Tzadok" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Representative email</span>
              <Input type="email" value={email} onChange={(e) => (setLink(null), setEmail(e.target.value))} placeholder="ariel@example.com" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium">Effective date</span>
              <Input type="date" value={date} onChange={(e) => (setLink(null), setDate(e.target.value))} />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {num('threshold', 'Tier threshold', 'ILS')}
            {num('basePercent', 'Commission up to the threshold', '%')}
            {num('bonus', 'Bonus per increment', 'ILS')}
            {num('increment', 'Increment size above the threshold', 'ILS')}
            <div className="text-sm">
              <span className="font-medium">Base payout (calculated)</span>
              <p className="mt-2 text-lg font-semibold">{Number.isFinite(basePayout(f)) ? basePayout(f).toLocaleString('en-US') : '—'} ILS</p>
            </div>
          </div>
          <p className="pt-1 text-sm font-medium">Legal terms (prefilled with the agreed values; enter the name, number and address exactly as on the tax certificate)</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {txt('companyLegalName', 'Contracting party’s full legal name', 'As on the tax certificate')}
            {txt('companyTradingAs', 'Trading as', 'Caleno')}
            {txt('companyIdNumber', 'Exempt dealer / company number', 'From the tax certificate')}
            {txt('companyAddress', 'Company address', 'Street, city')}
            {txt('agentAddress', 'Representative address', 'Street, city')}
            {txt('jurisdiction', 'Governing jurisdiction', 'Israel')}
            {days('payoutDays', 'Payout after month end', 'business days')}
            {days('clawbackDays', 'Clawback window', 'days')}
            {days('noticeDays', 'Termination notice', 'days')}
          </div>
          <SignerPicker signers={signers} selected={signerId} onSelect={(id) => (setLink(null), setSignerId(id))} meId={meId} />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button onClick={generate} disabled={pending}>
            {pending ? 'Generating…' : 'Sign and generate link'}
          </Button>
          {link ? (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">Signing link (valid until {new Date(link.expiresAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}, one use)</p>
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
              <p className="text-muted-foreground">The agreement is kept for 12 hours or until it is signed, then deleted. When {name.trim() || 'the representative'} signs, the final PDF is emailed to you and to them. Link expired or lost? Generate a new one.</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Agreement preview</CardTitle>
        </CardHeader>
        <CardContent>
          <style>{AGREEMENT_CSS}</style>
          <div className="rounded-lg bg-white p-6 text-neutral-900">
            <div dangerouslySetInnerHTML={{ __html: preview }} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
