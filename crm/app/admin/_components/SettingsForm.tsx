'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import type { SETTING_DEFAULTS } from '@/lib/settings'

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }): React.ReactElement {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input type="checkbox" className="mt-1 h-4 w-4" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-muted-foreground">{hint}</span>
      </span>
    </label>
  )
}

export function SettingsForm({ initial }: { initial: typeof SETTING_DEFAULTS }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [v, setV] = useState({ ...initial, emails: initial['notifications.emails'].join(', ') })
  const set = (patch: Partial<typeof v>): void => {
    setMsg(null)
    setV((x) => ({ ...x, ...patch }))
  }
  return (
    <form
      className="grid max-w-3xl gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        start(async () => {
          const res = await saveSettings({
            'roundRobin.enabled': v['roundRobin.enabled'],
            'notifications.emails': v.emails
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter(Boolean),
            'notifications.newLead': v['notifications.newLead'],
            'reminders.meetingEmails': v['reminders.meetingEmails'],
            'booking.defaultDurationMinutes': Number(v['booking.defaultDurationMinutes']),
            'booking.bufferMinutes': Number(v['booking.bufferMinutes']),
            'brand.name': v['brand.name'],
            'brand.supportEmail': v['brand.supportEmail'],
            'leads.staleDays': Number(v['leads.staleDays']),
          })
          setMsg(res.ok ? { ok: true, text: '✓ Settings saved.' } : { ok: false, text: res.error })
          router.refresh()
        })
      }}
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Leads</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Toggle checked={v['roundRobin.enabled']} onChange={(x) => set({ 'roundRobin.enabled': x })} label="Auto-assign new leads (round-robin)" hint="Each new website lead goes to the next active sales rep in turn. Off = leads wait unassigned for someone to claim." />
          <div className="max-w-xs space-y-1">
            <Label htmlFor="stale">Flag a deal as “needs follow-up” after (days)</Label>
            <Input id="stale" type="number" min={1} max={365} value={v['leads.staleDays']} onChange={(e) => set({ 'leads.staleDays': Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="emails">Notification emails</Label>
            <Input id="emails" placeholder="you@igani.co, sales@igani.co" value={v.emails} onChange={(e) => set({ emails: e.target.value })} />
            <p className="text-xs text-muted-foreground">Comma separated. These addresses get booking approval requests and (if on) new-lead alerts. Admins always get approval requests.</p>
          </div>
          <Toggle checked={v['notifications.newLead']} onChange={(x) => set({ 'notifications.newLead': x })} label="Email the list above when a new lead arrives" hint="A branded alert with the lead's details and a button to open them in the CRM." />
          <Toggle checked={v['reminders.meetingEmails']} onChange={(x) => set({ 'reminders.meetingEmails': x })} label="Remind guests the day before a meeting" hint="Sent about 24 hours before each confirmed meeting, with the Meet link. Cuts no-shows." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Booking</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="dur">Default meeting length (minutes)</Label>
            <Input id="dur" type="number" min={15} max={240} step={15} value={v['booking.defaultDurationMinutes']} onChange={(e) => set({ 'booking.defaultDurationMinutes': Number(e.target.value) })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="buf">Buffer between meetings (minutes)</Label>
            <Input id="buf" type="number" min={0} max={120} step={5} value={v['booking.bufferMinutes']} onChange={(e) => set({ 'booking.bufferMinutes': Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Brand (used in every email)</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="brand">Company name</Label>
            <Input id="brand" value={v['brand.name']} onChange={(e) => set({ 'brand.name': e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="support">Support email (email footer)</Label>
            <Input id="support" type="email" value={v['brand.supportEmail']} onChange={(e) => set({ 'brand.supportEmail': e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save settings'}
        </Button>
        {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-red-400'}`}>{msg.text}</span> : null}
      </div>
    </form>
  )
}
