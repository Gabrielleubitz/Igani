'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setCommissionPayment } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { formatIls } from '@/lib/commission'
import { DEFAULT_TIME_ZONE } from '@/lib/default-time-zone'
import { localDateKey } from '@/lib/time'

/** One won deal's commission on the admin overview, with the two steps to settle it: client paid, then paid out. */
export function CommissionPayRow({ leadId, lead, salesperson, amount, clientPaid, paidOut }: { leadId: string; lead: string; salesperson: string; amount: number; clientPaid: boolean; paidOut: boolean }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = localDateKey(new Date(), DEFAULT_TIME_ZONE) // the team works on Israel time
  const run = (kind: 'received' | 'paid', date: string | null): void =>
    start(async () => {
      const res = await setCommissionPayment(leadId, { kind, date })
      setError(res.ok ? null : res.error)
      router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 text-sm">
      <div className="min-w-0">
        <Link href={`/sales/leads/${leadId}`} className="truncate font-medium underline-offset-4 hover:underline">
          {lead}
        </Link>
        <div className="text-xs text-muted-foreground">
          {salesperson} · {formatIls(amount)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {paidOut ? (
          <>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-300">Paid</span>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('paid', null)}>
              Undo
            </Button>
          </>
        ) : clientPaid ? (
          <>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300">Payable now</span>
            <Button size="sm" disabled={pending} onClick={() => run('paid', today)}>
              Mark paid
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run('received', null)}>
              Undo client payment
            </Button>
          </>
        ) : (
          <>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">Waiting for the client</span>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => run('received', today)}>
              Client paid
            </Button>
          </>
        )}
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  )
}
