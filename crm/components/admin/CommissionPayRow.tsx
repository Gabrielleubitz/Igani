'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setBonusPaid, setPaymentCommissionPaid } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { formatIls } from '@/lib/commission'
import { DEFAULT_TIME_ZONE } from '@/lib/default-time-zone'
import { localDateKey } from '@/lib/time'

/**
 * One commission to pay out: the commission on one client payment, or the bonus (paymentId null) once the whole price is paid.
 * Shown as payable now, with a button to mark it paid, or as paid, with an undo.
 */
export function CommissionPayRow({ leadId, paymentId, label, lead, salesperson, amount, paidOut }: { leadId: string; paymentId: string | null; label: string; lead: string; salesperson: string; amount: number; paidOut: boolean }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const today = localDateKey(new Date(), DEFAULT_TIME_ZONE) // the team works on Israel time
  const run = (date: string | null): void =>
    start(async () => {
      const res = paymentId ? await setPaymentCommissionPaid(paymentId, date) : await setBonusPaid(leadId, date)
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
          {salesperson} · {label} · {formatIls(amount)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {paidOut ? (
          <>
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs text-emerald-300">Paid</span>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(null)}>
              Undo
            </Button>
          </>
        ) : (
          <>
            <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs text-amber-300">Payable now</span>
            <Button size="sm" disabled={pending} onClick={() => run(today)}>
              Mark paid
            </Button>
          </>
        )}
        {error ? <span className="text-xs text-red-400">{error}</span> : null}
      </div>
    </div>
  )
}
