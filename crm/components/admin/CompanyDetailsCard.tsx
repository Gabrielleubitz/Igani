'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { companyIsComplete, type CompanySettings } from '@/lib/sales-contract-core'

/** The company named in every sales agreement, with its fixed legal terms. Set once here; the agreement form never asks again. */
export function CompanyDetailsCard({ company }: { company: CompanySettings }): React.ReactElement {
  const router = useRouter()
  const complete = companyIsComplete(company)
  const [open, setOpen] = useState(!complete)
  const [c, setC] = useState<CompanySettings>(company)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const txt = (key: 'legalName' | 'tradingAs' | 'idNumber' | 'address' | 'jurisdiction', label: string, placeholder: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })} placeholder={placeholder} />
    </label>
  )
  const days = (key: 'payoutDays' | 'clawbackDays' | 'noticeDays', label: string, suffix: string): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Input type="number" min={1} step={1} value={Number.isFinite(c[key]) ? c[key] : ''} onChange={(e) => setC({ ...c, [key]: e.target.value === '' ? NaN : Number(e.target.value) })} />
        <span className="text-muted-foreground">{suffix}</span>
      </div>
    </label>
  )

  function save(): void {
    setMsg(null)
    start(async () => {
      const res = await saveSettings({ 'contract.company': c })
      if (res.ok) {
        setMsg({ ok: true, text: 'Saved. Every new agreement uses these details.' })
        setOpen(false)
        router.refresh()
      } else setMsg({ ok: false, text: res.error })
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center justify-between gap-2">
          <span>Company details (set once)</span>
          {complete && !open ? (
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Edit
            </Button>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {complete && !open ? (
          <div className="space-y-1">
            <p>
              <b>
                {company.legalName}, trading as {company.tradingAs || '—'} (dba Igani)
              </b>
              , {company.address}, registered no. {company.idNumber}
            </p>
            <p className="text-muted-foreground">
              {company.jurisdiction} · payout {company.payoutDays} business days after month end · clawback window {company.clawbackDays} days · {company.noticeDays} days’ notice
            </p>
          </div>
        ) : (
          <>
            {!complete ? <p className="text-amber-400">Fill this in once. Every agreement uses it, so it is never asked again. Enter the name, number and address exactly as on the tax certificate.</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {txt('legalName', 'Full legal name', 'As on the tax certificate')}
              {txt('tradingAs', 'Trading as (agreements add "dba Igani")', 'Caleno')}
              {txt('idNumber', 'Exempt dealer / company number', 'From the tax certificate')}
              {txt('address', 'Company address', 'Street, city')}
              {txt('jurisdiction', 'Governing jurisdiction', 'Israel')}
              {days('payoutDays', 'Payout after month end', 'business days')}
              {days('clawbackDays', 'Clawback window', 'days')}
              {days('noticeDays', 'Termination notice', 'days')}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={pending}>
                {pending ? 'Saving…' : 'Save company details'}
              </Button>
              {complete ? (
                <Button size="sm" variant="ghost" onClick={() => (setC(company), setOpen(false))}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </>
        )}
        {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p> : null}
      </CardContent>
    </Card>
  )
}
