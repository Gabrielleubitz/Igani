'use client'

import type { Role } from '@prisma/client'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { resendInvite, upsertAllowedUser, upsertBookingPage } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label, Select, Textarea } from '@/components/ui/input'

type Msg = { ok: boolean; text: string } | null

function useAction(): [boolean, Msg, (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void] {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<Msg>(null)
  return [
    pending,
    msg,
    (fn, okMsg = 'Saved.') =>
      start(async () => {
        const res = await fn()
        setMsg(res.ok ? { ok: true, text: okMsg } : { ok: false, text: res.error ?? 'Failed' })
        router.refresh()
      }),
  ]
}

function Note({ msg }: { msg: Msg }): React.ReactElement | null {
  return msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span> : null
}

const ROLE_HELP: Record<Role, string> = {
  SALES: 'Sales: contacts, pipeline, meetings and tasks',
  MARKETING: 'Marketing: contacts, reports and lead sources',
  ADMIN: 'Admin: everything, including team and settings',
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
        run(() => upsertAllowedUser({ email, role, active: true }), `✓ ${email} can sign in. New teammates get an invite email.`)
        setEmail('')
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="wl-email">Email</Label>
        <Input id="wl-email" type="email" required className="w-72" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="wl-role">Role</Label>
        <Select id="wl-role" className="w-40" value={role} onChange={(e) => setRole(e.target.value as Role)}>
          <option value="SALES">Sales</option>
          <option value="MARKETING">Marketing</option>
          <option value="ADMIN">Admin</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add & send invite'}
      </Button>
      <p className="w-full text-xs text-muted-foreground">{ROLE_HELP[role]}</p>
      <Note msg={msg} />
    </form>
  )
}

export function AllowedUserToggle({ email, role, active, showResend = true }: { email: string; role: Role; active: boolean; showResend?: boolean }): React.ReactElement {
  const [pending, msg, run] = useAction()
  return (
    <div className="flex items-center gap-2">
      <Select aria-label={`Role for ${email}`} title={ROLE_HELP[role]} className="h-8 w-36" disabled={pending} value={role} onChange={(e) => run(() => upsertAllowedUser({ email, role: e.target.value as Role, active }), 'Role updated.')}>
        <option value="SALES">Sales</option>
        <option value="MARKETING">Marketing</option>
        <option value="ADMIN">Admin</option>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => (!active || window.confirm(`Deactivate ${email}? They lose access immediately and their contacts become unassigned.`)) && run(() => upsertAllowedUser({ email, role, active: !active }), active ? 'Deactivated.' : 'Activated.')}
      >
        {active ? 'Deactivate' : 'Activate'}
      </Button>
      {active && showResend ? (
        <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => resendInvite(email), 'Invite sent.')}>
          Resend invite
        </Button>
      ) : null}
      <Note msg={msg} />
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
  const fid = initial?.slug ?? 'new'
  return (
    <form
      className="grid gap-3 md:grid-cols-3"
      onSubmit={(e) => {
        e.preventDefault()
        run(() => upsertBookingPage({ ...v, slug: v.slug.replace(/-+$/, ''), description: v.description || undefined }, { isNew: !initial }), initial ? 'Saved.' : 'Page created. It is live now.')
      }}
    >
      <div className="space-y-1">
        <Label htmlFor={`bp-slug-${fid}`}>Link (/book/…)</Label>
        <Input
          id={`bp-slug-${fid}`}
          required
          value={v.slug}
          disabled={Boolean(initial)}
          placeholder="intro-call"
          onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '') })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`bp-title-${fid}`}>Title</Label>
        <Input id={`bp-title-${fid}`} required value={v.title} onChange={(e) => set({ title: e.target.value })} />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`bp-host-${fid}`}>Host</Label>
        <Select id={`bp-host-${fid}`} value={v.hostId} onChange={(e) => set({ hostId: e.target.value })}>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1 md:col-span-2">
        <Label htmlFor={`bp-desc-${fid}`}>Description (shown on the page)</Label>
        <Textarea id={`bp-desc-${fid}`} rows={2} maxLength={1000} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder="What the call is about and what to prepare" />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`bp-len-${fid}`}>Length</Label>
        <Select id={`bp-len-${fid}`} value={v.durationMinutes} onChange={(e) => set({ durationMinutes: Number(e.target.value) })}>
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
          {initial ? 'Save changes' : 'Create page'}
        </Button>
        <Note msg={msg} />
      </div>
    </form>
  )
}
