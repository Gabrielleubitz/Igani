'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setSalespersonTermination } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** The day this salesperson's agreement ended. Only deals the client paid for before that day still pay commission. */
export function TerminationForm({ userId, endedOn }: { userId: string; endedOn: string | null }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [date, setDate] = useState(endedOn ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = (value: string | null): void =>
    start(async () => {
      const res = await setSalespersonTermination(userId, value)
      setMsg(res.ok ? { ok: true, text: value ? 'Saved.' : 'Agreement active again.' } : { ok: false, text: res.error })
      if (res.ok && !value) setDate('')
      router.refresh()
    })
  return (
    <div className="space-y-2 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" className="w-44" value={date} onChange={(e) => setDate(e.target.value)} />
        <Button size="sm" disabled={pending || !date} onClick={() => save(date)}>Set end date</Button>
        {endedOn ? <Button size="sm" variant="ghost" disabled={pending} onClick={() => save(null)}>Clear</Button> : null}
      </div>
      <p className="text-xs text-muted-foreground">After this date, a deal whose client payment arrives later earns no commission. Payments received before it still pay out.</p>
      {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p> : null}
    </div>
  )
}
