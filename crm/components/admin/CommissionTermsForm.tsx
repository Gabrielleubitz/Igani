'use client'

import { useState, useTransition } from 'react'
import { saveSalespersonTerms } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { type CommissionTerms, DEFAULT_COMMISSION_TERMS, calculateCommission, formatIls } from '@/lib/commission'

const FIELDS: { key: keyof CommissionTerms; label: string; hint: string }[] = [
  { key: 'baseRatePct', label: 'Base rate %', hint: 'Share of the deal (up to the threshold)' },
  { key: 'threshold', label: 'Threshold ₪', hint: 'Deals above this earn bonus increments' },
  { key: 'incrementSize', label: 'Increment size ₪', hint: 'Each completed step above the threshold' },
  { key: 'bonusPerIncrement', label: 'Bonus per increment ₪', hint: 'Earned per completed step' },
]

/** Admin-only: a salesperson's agreed commission terms. Changing them never touches deals that are already won. */
export function CommissionTermsForm({ userId, terms, usingDefaults }: { userId: string; terms: CommissionTerms; usingDefaults: boolean }): React.ReactElement {
  const [v, setV] = useState<Record<keyof CommissionTerms, string>>({
    baseRatePct: String(terms.baseRatePct),
    threshold: String(terms.threshold),
    incrementSize: String(terms.incrementSize),
    bonusPerIncrement: String(terms.bonusPerIncrement),
  })
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const parsed = Object.fromEntries(FIELDS.map((f) => [f.key, Number(v[f.key])])) as unknown as CommissionTerms
  const valid = FIELDS.every((f) => v[f.key].trim() !== '' && Number.isFinite(Number(v[f.key])) && Number(v[f.key]) >= 0) && parsed.baseRatePct <= 100

  const save = (next: CommissionTerms | null, ok: string): void =>
    start(async () => {
      const res = await saveSalespersonTerms(userId, next)
      setMsg(res.ok ? { ok: true, text: ok } : { ok: false, text: res.error })
      if (res.ok && next === null) setV(Object.fromEntries(FIELDS.map((f) => [f.key, String(DEFAULT_COMMISSION_TERMS[f.key])])) as Record<keyof CommissionTerms, string>)
    })

  return (
    <div className="space-y-4">
      <div className="grid max-w-xl gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="space-y-1 text-sm">
            <span className="font-medium">{f.label}</span>
            <Input inputMode="decimal" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            <span className="block text-xs text-muted-foreground">{f.hint}</span>
          </label>
        ))}
      </div>
      {valid ? (
        <p className="text-xs text-muted-foreground">
          With these terms: ₪10,000 → {formatIls(calculateCommission(10_000, parsed).total)} · ₪25,000 → {formatIls(calculateCommission(25_000, parsed).total)} · ₪30,000 → {formatIls(calculateCommission(30_000, parsed).total)}
        </p>
      ) : (
        <p className="text-xs text-red-400">Use plain numbers (percentages 0–100).</p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={pending || !valid} onClick={() => save(parsed, '✓ Terms saved. Deals already won keep the terms they were won with.')}>
          {pending ? 'Saving…' : 'Save terms'}
        </Button>
        {!usingDefaults ? (
          <Button variant="ghost" disabled={pending} onClick={() => save(null, '✓ Back to the default terms.')}>
            Reset to defaults
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Using the default terms.</span>
        )}
        {msg ? <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p> : null}
      </div>
    </div>
  )
}
