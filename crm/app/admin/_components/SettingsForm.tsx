'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import type { SETTING_DEFAULTS } from '@/lib/settings'

export function SettingsForm({ initial }: { initial: typeof SETTING_DEFAULTS }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [v, setV] = useState({ ...initial, emails: initial['notifications.emails'].join(', ') })
  const set = (patch: Partial<typeof v>): void => setV((x) => ({ ...x, ...patch }))
  return (
    <form
      className="grid max-w-xl gap-4"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveSettings({
            'roundRobin.enabled': v['roundRobin.enabled'],
            'notifications.emails': v.emails.split(',').map((s) => s.trim()).filter(Boolean),
            'booking.defaultDurationMinutes': Number(v['booking.defaultDurationMinutes']),
            'booking.bufferMinutes': Number(v['booking.bufferMinutes']),
            'brand.name': v['brand.name'],
            'brand.supportEmail': v['brand.supportEmail'],
            'leads.staleDays': Number(v['leads.staleDays']),
          })
          setMsg(res.ok ? 'Settings saved.' : res.error)
          router.refresh()
        })
      }}
    >
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v['roundRobin.enabled']} onChange={(e) => set({ 'roundRobin.enabled': e.target.checked })} />
        Auto-assign new leads round-robin
      </label>
      <div className="space-y-1">
        <Label>Notification emails (comma separated)</Label>
        <Input value={v.emails} onChange={(e) => set({ emails: e.target.value })} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Default meeting (min)</Label>
          <Input type="number" min={15} max={240} value={v['booking.defaultDurationMinutes']} onChange={(e) => set({ 'booking.defaultDurationMinutes': Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Buffer (min)</Label>
          <Input type="number" min={0} max={120} value={v['booking.bufferMinutes']} onChange={(e) => set({ 'booking.bufferMinutes': Number(e.target.value) })} />
        </div>
        <div className="space-y-1">
          <Label>Stale after (days)</Label>
          <Input type="number" min={1} max={365} value={v['leads.staleDays']} onChange={(e) => set({ 'leads.staleDays': Number(e.target.value) })} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Brand name</Label>
          <Input value={v['brand.name']} onChange={(e) => set({ 'brand.name': e.target.value })} />
        </div>
        <div className="space-y-1">
          <Label>Support email</Label>
          <Input type="email" value={v['brand.supportEmail']} onChange={(e) => set({ 'brand.supportEmail': e.target.value })} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Save settings
        </Button>
        {msg ? <span className="text-sm text-muted-foreground">{msg}</span> : null}
      </div>
    </form>
  )
}
