'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setSalespersonTermination } from '@/app/actions/deals'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

/** The day this salesperson's agreement ended, and whether it ended immediately for an unfixable breach. */
export function TerminationForm({ userId, endedOn, forCause: wasForCause = false }: { userId: string; endedOn: string | null; forCause?: boolean }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [date, setDate] = useState(endedOn ?? '')
  const [forCause, setForCause] = useState(wasForCause)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const save = (value: string | null): void =>
    start(async () => {
      const res = await setSalespersonTermination(userId, value, forCause)
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
      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={forCause} onChange={(e) => setForCause(e.target.checked)} />
        Ended immediately for an unfixable breach (dishonesty or fraud, breaking confidentiality, diverting a lead or client)
      </label>
      <p className="text-xs text-muted-foreground">Payments received before this date always pay out. A client who signed before it keeps paying commission on later contract payments (not maintenance), unless this is ticked. A client who signs after it earns nothing.</p>
      {msg ? <p className={msg.ok ? 'text-emerald-400' : 'text-red-400'}>{msg.text}</p> : null}
    </div>
  )
}
