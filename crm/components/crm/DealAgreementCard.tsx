'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveExcludedCosts, setDealRefund } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { formatIls } from '@/lib/commission'
import { DEFAULT_TIME_ZONE } from '@/lib/default-time-zone'
import { parseShekels } from '@/lib/money'
import { localDateKey } from '@/lib/time'

/** Admin-only, for a won deal: costs taken off the price before commission, and a refund (clawback) if the client's money came back. */
export function DealAgreementCard({ leadId, quotedPrice, excludedCosts, clientPaidAt, refundedAt }: { leadId: string; quotedPrice: number | null; excludedCosts: number | null; clientPaidAt: string | null; refundedAt: string | null }): React.ReactElement {
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
  const today = localDateKey(new Date(), DEFAULT_TIME_ZONE)
  const entered = parseShekels(costs)
  const parsed = entered.ok ? (entered.value ?? 0) : null
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission base and refunds</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <Label htmlFor={`costs-${leadId}`}>Excluded costs (hosting, taxes, out-of-pocket)</Label>
          <div className="flex gap-2">
            <Input id={`costs-${leadId}`} inputMode="numeric" value={costs} onChange={(e) => setCosts(e.target.value)} placeholder="0" disabled={!!clientPaidAt} />
            <Button size="sm" disabled={pending || !!clientPaidAt || parsed === null} onClick={() => run(() => saveExcludedCosts(leadId, parsed ?? 0), 'Saved. The commission was recalculated.')}>
              Save
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {quotedPrice ? `Commission is calculated on ${formatIls(Math.max(0, quotedPrice - (parsed ?? 0)))} (price ${formatIls(quotedPrice)} minus these costs).` : 'Enter the price first.'}
            {clientPaidAt ? ' Locked: the client’s payment is already recorded.' : ''}
          </p>
        </div>
        {clientPaidAt ? (
          <div className="space-y-1.5 border-t pt-3">
            <span className="font-medium">Client refund</span>
            {refundedAt ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-amber-300">Client money returned on {new Date(refundedAt).toLocaleDateString('en-GB')}</span>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setDealRefund(leadId, null), 'Refund undone.')}>
                  Undo
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setDealRefund(leadId, today), 'Refund recorded.')}>
                  Client was refunded today
                </Button>
                <span className="text-xs text-muted-foreground">An unpaid commission is cancelled. A paid one is listed under Payouts to claw back.</span>
              </div>
            )}
          </div>
        ) : null}
        {!entered.ok ? <p className="text-xs text-red-400">{entered.error}</p> : null}
        {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p> : null}
      </CardContent>
    </Card>
  )
}
