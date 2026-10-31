'use client'

import { useMemo, useState, useTransition } from 'react'
import { saveMyAvailability } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { cn } from '@/lib/utils'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const
const FALLBACK_ZONES = ['UTC', 'Asia/Jerusalem', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Asia/Dubai', 'Asia/Singapore', 'Australia/Sydney']

export interface DayHours {
  enabled: boolean
  startTime: string
  endTime: string
}

export function AvailabilityForm({ timeZone: initialZone, days: initialDays }: { timeZone: string; days: DayHours[] }): React.ReactElement {
  const [timeZone, setTimeZone] = useState(initialZone)
  const [days, setDays] = useState(initialDays)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_ZONES
    return list.includes(initialZone) ? list : [initialZone, ...list]
  }, [initialZone])
  const browserZone = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  const update = (i: number, patch: Partial<DayHours>): void => {
    setMsg(null)
    setDays((d) => d.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  }
  const copyToAll = (i: number): void => {
    const src = days[i]
    if (!src) return
    setDays((d) => d.map((x) => (x.enabled ? { ...x, startTime: src.startTime, endTime: src.endTime } : x)))
    setMsg({ ok: true, text: `Copied ${DAYS[i]}'s hours to every working day. Remember to save.` })
  }
  const preset = (kind: 'sun-thu' | 'mon-fri'): void => {
    const on = kind === 'sun-thu' ? [0, 1, 2, 3, 4] : [1, 2, 3, 4, 5]
    setDays((d) => d.map((x, j) => ({ ...x, enabled: on.includes(j), startTime: on.includes(j) ? '09:00' : x.startTime, endTime: on.includes(j) ? '17:00' : x.endTime })))
    setMsg(null)
  }
  const invalid = days.some((d) => d.enabled && d.endTime <= d.startTime)

  function save(e: React.FormEvent): void {
    e.preventDefault()
    start(async () => {
      const res = await saveMyAvailability({
        timeZone,
        rules: days.flatMap((d, dayOfWeek) => (d.enabled ? [{ dayOfWeek, startTime: d.startTime, endTime: d.endTime }] : [])),
      })
      setMsg(res.ok ? { ok: true, text: '✓ Hours saved. New bookings will use them right away.' } : { ok: false, text: res.error })
    })
  }

  return (
    <form onSubmit={save} className="max-w-2xl space-y-5">
      <div className="space-y-2">
        <Label htmlFor="tz">Time zone</Label>
        <div className="flex flex-wrap items-center gap-2">
          <Select id="tz" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} className="w-72">
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replaceAll('_', ' ')}
              </option>
            ))}
          </Select>
          {browserZone && browserZone !== timeZone ? (
            <button type="button" onClick={() => setTimeZone(browserZone)} className="text-sm text-primary underline-offset-4 hover:underline">
              Use my current zone ({browserZone.replaceAll('_', ' ')})
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Quick set:</span>
        <Button type="button" size="sm" variant="outline" onClick={() => preset('sun-thu')}>
          Sun–Thu, 9–5
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => preset('mon-fri')}>
          Mon–Fri, 9–5
        </Button>
      </div>
      <div className="divide-y rounded-lg border">
        {days.map((d, i) => (
          <div key={DAYS[i]} className={cn('flex flex-wrap items-center gap-3 px-4 py-3', !d.enabled && 'opacity-60')}>
            <label className="flex w-36 items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={d.enabled} onChange={(e) => update(i, { enabled: e.target.checked })} />
              {DAYS[i]}
            </label>
            {d.enabled ? (
              <>
                <Input type="time" aria-label={`${DAYS[i]} start`} className="w-32" value={d.startTime} onChange={(e) => update(i, { startTime: e.target.value })} />
                <span className="text-muted-foreground">to</span>
                <Input type="time" aria-label={`${DAYS[i]} end`} className={cn('w-32', d.endTime <= d.startTime && 'border-red-500')} value={d.endTime} onChange={(e) => update(i, { endTime: e.target.value })} />
                <button type="button" onClick={() => copyToAll(i)} className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                  Copy to all days
                </button>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">Unavailable</span>
            )}
          </div>
        ))}
      </div>
      {invalid ? <p className="text-sm text-red-400">End time must be after start time.</p> : null}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || invalid}>
          {pending ? 'Saving…' : 'Save hours'}
        </Button>
        {msg ? <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p> : null}
      </div>
    </form>
  )
}
