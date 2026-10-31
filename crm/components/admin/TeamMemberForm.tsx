'use client'

import { useMemo, useState, useTransition } from 'react'
import { updateTeamMember } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'

const FALLBACK_ZONES = ['UTC', 'Asia/Jerusalem', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles']

/** Admin edits a salesperson's personal details. The email is their sign-in identity, so it is shown but not editable. */
export function TeamMemberForm({ userId, name: initialName, email, timeZone: initialZone }: { userId: string; name: string; email: string; timeZone: string }): React.ReactElement {
  const [name, setName] = useState(initialName)
  const [timeZone, setTimeZone] = useState(initialZone)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const zones = useMemo(() => {
    const list = typeof Intl.supportedValuesOf === 'function' ? Intl.supportedValuesOf('timeZone') : FALLBACK_ZONES
    return list.includes(initialZone) ? list : [initialZone, ...list]
  }, [initialZone])
  const changed = name.trim() !== initialName || timeZone !== initialZone

  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        setMsg(null)
        start(async () => {
          const res = await updateTeamMember({ userId, name, timeZone })
          setMsg(res.ok ? { ok: true, text: '✓ Details saved.' } : { ok: false, text: res.error })
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="tm-name">Name</Label>
        <Input id="tm-name" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tm-email">Email (sign-in)</Label>
        <Input id="tm-email" value={email} disabled readOnly />
      </div>
      <div className="space-y-2">
        <Label htmlFor="tm-zone">Time zone</Label>
        <Select id="tm-zone" value={timeZone} onChange={(e) => setTimeZone(e.target.value)}>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z.replaceAll('_', ' ')}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !changed}>
          {pending ? 'Saving…' : 'Save details'}
        </Button>
        {msg ? <p className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</p> : null}
      </div>
    </form>
  )
}
