'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveExcludedCosts } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { formatIls } from '@/lib/commission'
import { parseShekels } from '@/lib/money'

/** Admin-only, for a won deal: costs taken off the price before commission. Locked once a client payment is recorded. */
export function DealAgreementCard({ leadId, quotedPrice, excludedCosts, hasPayments }: { leadId: string; quotedPrice: number | null; excludedCosts: number | null; hasPayments: boolean }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [costs, setCosts] = useState(excludedCosts ? String(excludedCosts) : '')
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, done: string): void =>
    start(async () => {
      const res = await fn()
      setMsg(res.ok ? { ok: true, text: done } : { ok: false, text: res.error ?? 'Could not save.' })
      router.refresh()
    })
  const entered = parseShekels(costs)
  const parsed = entered.ok ? (entered.value ?? 0) : null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission base</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <Label htmlFor={`costs-${leadId}`}>Excluded costs (hosting, taxes, out-of-pocket)</Label>
          <div className="flex gap-2">
            <Input id={`costs-${leadId}`} inputMode="numeric" value={costs} onChange={(e) => setCosts(e.target.value)} placeholder="0" disabled={hasPayments} />
            <Button size="sm" disabled={pending || hasPayments || parsed === null} onClick={() => run(() => saveExcludedCosts(leadId, parsed ?? 0), 'Saved. The commission was recalculated.')}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {quotedPrice ? `Commission is calculated on ${formatIls(Math.max(0, quotedPrice - (parsed ?? 0)))} (price ${formatIls(quotedPrice)} minus these costs).` : 'Enter the price first.'}
            {hasPayments ? ' Locked: a client payment is already recorded.' : ''}
          </p>
        </div>
        {!entered.ok ? <p className="text-xs text-red-400">{entered.error}</p> : null}
        {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p> : null}
      </CardContent>
    </Card>
  )
}
