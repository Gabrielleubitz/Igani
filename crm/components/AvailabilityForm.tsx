'use client'

import { useState, useTransition } from 'react'
import { saveMyAvailability } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export interface DayHours {
  enabled: boolean
  startTime: string
  endTime: string
}

export function AvailabilityForm({ timeZone: initialZone, days: initialDays }: { timeZone: string; days: DayHours[] }): React.ReactElement {
  const [timeZone, setTimeZone] = useState(initialZone)
  const [days, setDays] = useState(initialDays)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const update = (i: number, patch: Partial<DayHours>): void => setDays((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)))

  function save(e: React.FormEvent): void {
    e.preventDefault()
    start(async () => {
      const res = await saveMyAvailability({
        timeZone,
        rules: days.flatMap((d, dayOfWeek) => (d.enabled ? [{ dayOfWeek, startTime: d.startTime, endTime: d.endTime }] : [])),
      })
      setMsg(res.ok ? 'Saved.' : res.error)
    })
  }

  return (
    <form onSubmit={save} className="max-w-xl space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tz">Time zone (IANA)</Label>
        <Input id="tz" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} placeholder="Asia/Jerusalem" />
      </div>
      {days.map((d, i) => (
        <div key={DAYS[i]} className="flex items-center gap-3">
          <label className="flex w-36 items-center gap-2 text-sm">
            <input type="checkbox" checked={d.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
            {DAYS[i]}
          </label>
          <Input type="time" className="w-32" disabled={!d.enabled} value={d.startTime} onChange={(e) => update(i, { startTime: e.target.value })} />
          <span className="text-muted-foreground">–</span>
          <Input type="time" className="w-32" disabled={!d.enabled} value={d.endTime} onChange={(e) => update(i, { endTime: e.target.value })} />
        </div>
      ))}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : 'Save hours'}
      </Button>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
    </form>
  )
}
