'use client'

import { Check, Copy } from 'lucide-react'
import { useMemo, useState, useTransition } from 'react'
import { generateContractLink } from '@/app/actions/sales-contracts'
import { SignaturePad } from '@/components/SignaturePad'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { AGREEMENT_CSS, DEFAULT_FIGURES, agreementHtml, basePayout, validate, type Figures } from '@/lib/sales-contract-core'

const today = (): string => new Date().toISOString().slice(0, 10)

export function SalesContractForm({ adminName, adminEmail }: { adminName: string; adminEmail: string }): React.ReactElement {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [date, setDate] = useState(today())
  const [f, setF] = useState<Figures>(DEFAULT_FIGURES)
  const [sig, setSig] = useState('')
  const [link, setLink] = useState<{ url: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [pending, start] = useTransition()

  const data = { name, email, effectiveDate: date, figures: f }
  const preview = useMemo(
    () =>
      agreementHtml(
        { name: name.trim() || '[Representative name]', email: email || 'representative@email', effectiveDate: date || today(), figures: f },
        {
          logo: '/igani-logo%202.png',
          status: 'preview',
          reference: 'PREVIEW',
          admin: { name: adminName, email: adminEmail, signature: sig || null, signedAt: null },
          rep: { name: name.trim(), email, signature: null, signedAt: null },
        },
      ),
    [name, email, date, f, sig, adminName, adminEmail],
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

  function generate(): void {
    setError(null)
    const err = validate(data) ?? (sig ? null : 'Please draw your signature (Igani signs first).')
    if (err) return setError(err)
    start(async () => {
      const res = await generateContractLink(data, sig)
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
            {num('milestone1Percent', 'Milestone 1 (share of the downpayment)', '%')}
            <div className="text-sm">
              <span className="font-medium">Base payout (calculated)</span>
              <p className="mt-2 text-lg font-semibold">{Number.isFinite(basePayout(f)) ? basePayout(f).toLocaleString('en-US') : '—'} ILS</p>
            </div>
          </div>
          <div className="rounded-lg bg-white p-3 text-neutral-900">
            <SignaturePad label={`Igani signature: ${adminName}`} onChange={(p) => (setLink(null), setSig(p))} />
          </div>
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <Button onClick={generate} disabled={pending}>
            {pending ? 'Generating…' : 'Sign and generate link'}
          </Button>
          {link ? (
            <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
              <p className="font-medium">Signing link (valid until {new Date(link.expiresAt).toLocaleDateString('en-GB')}, one use)</p>
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
              <p className="text-muted-foreground">Nothing is saved on the site: the agreement is inside this link. When {name.trim() || 'the representative'} signs, the final PDF is emailed to you and to them. Lose the link? Generate a new one.</p>
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
