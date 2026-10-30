'use client'

import type { Role } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { upsertAllowedUser, upsertBookingPage } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'

function useAction(): [boolean, string | null, (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void] {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  return [
    pending,
    msg,
    (fn, okMsg = 'Saved.') =>
      start(async () => {
        const res = await fn()
        setMsg(res.ok ? okMsg : (res.error ?? 'Failed'))
        router.refresh()
      }),
  ]
}

export function AllowedUserForm(): React.ReactElement {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('SALES')
  const [pending, msg, run] = useAction()
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => upsertAllowedUser({ email, role, active: true }), `${email} can now sign in.`)
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="wl-email">Email</Label>
        <Input id="wl-email" type="email" required className="w-72" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wl-role">Role</Label>
        <Select id="wl-role" className="w-40" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="SALES">SALES</option>
          <option value="MARKETING">MARKETING</option>
          <option value="ADMIN">ADMIN</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        Add / update
      </Button>
      {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
    </form>
  )
}

export function AllowedUserToggle({ email, role, active }: { email: string; role: Role; active: boolean }): React.ReactElement {
  const [pending, msg, run] = useAction()
  return (
    <div className="flex items-center gap-2">
      <Select className="h-8 w-36" disabled={pending} value={role} onChange={(e) => run(() => upsertAllowedUser({ email, role: e.target.value as Role, active }))}>
        <option value="SALES">SALES</option>
        <option value="MARKETING">MARKETING</option>
        <option value="ADMIN">ADMIN</option>
      </Select>
      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => upsertAllowedUser({ email, role, active: !active }))}>
        {active ? 'Deactivate' : 'Activate'}
      </Button>
      {msg && msg !== 'Saved.' ? <span className="text-xs text-red-400">{msg}</span> : null}
    </div>
  )
}

export interface BookingPageValues {
  slug: string
  title: string
  description: string
  durationMinutes: number
  requiresApproval: boolean
  active: boolean
  hostId: string
}

export function BookingPageForm({ hosts, initial, defaultDuration = 30 }: { hosts: { id: string; label: string }[]; initial?: BookingPageValues; defaultDuration?: number }): React.ReactElement {
  const [v, setV] = useState<BookingPageValues>(
    initial ?? { slug: '', title: 'Intro call with Igani', description: '', durationMinutes: defaultDuration, requiresApproval: false, active: true, hostId: hosts[0]?.id ?? '' },
  )
  const [pending, msg, run] = useAction()
  const set = (patch: Partial<BookingPageValues>): void => setV((x) => ({ ...x, ...patch }))
  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => upsertBookingPage({ ...v, description: v.description || undefined }))
      }}
    >
      <div className="space-y-1">
        <Label>Slug (/book/…)</Label>
        <Input required value={v.slug} disabled={Boolean(initial)} onChange={(e) => set({ slug: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Title</Label>
        <Input required value={v.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Host</Label>
        <Select value={v.hostId} onChange={(e) => set({ hostId: e.target.value })}>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label>Description</Label>
        <Input value={v.description} onChange={(e) => set({ description: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label>Length</Label>
        <Select value={v.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })}>
          {[15, 30, 45, 60, 90].map((m) => (
            <option key={m} value={m}>
              {m} min
            </option>
          ))}
        </Select>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.requiresApproval} onChange={(e) => set({ requiresApproval: e.target.checked })} />
        Admin must approve each booking
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.active} onChange={(e) => set({ active: e.target.checked })} />
        Page is live
      </label>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending || !v.hostId}>
          {initial ? 'Save' : 'Create page'}
        </Button>
        {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  )
}
