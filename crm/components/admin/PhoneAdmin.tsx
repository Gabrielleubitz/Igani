'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import { assignPhoneLine, removePhoneLine, restoreIncomingRouting, routeIncomingToCrm } from '@/app/actions/phone-lines'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DIAL_COUNTRIES, formatPhone, type DialCountry } from '@/lib/phone-numbers'

export interface TwilioNumber {
  sid: string
  number: string
  name: string
}

/** One teammate's line: pick a number from the Twilio account (or type one), or remove it. */
export function PhoneLineRow({ userId, name, role, current, numbers, takenBy }: { userId: string; name: string; role: string; current: string | null; numbers: TwilioNumber[] | null; takenBy: Record<string, string> }): React.ReactElement {
  const router = useRouter()
  const [value, setValue] = useState(current ?? '')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const dirty = value.trim() !== (current ?? '')
  const save = (): void =>
    start(async () => {
      setMsg(null)
      const sid = numbers?.find((n) => n.number === value)?.sid ?? null
      if (!value.trim()) {
        const r = await removePhoneLine(userId)
        setMsg(r.ok ? { ok: true, text: 'Removed' } : { ok: false, text: r.error })
        if (r.ok) router.refresh()
        return
      }
      const r = await assignPhoneLine({ userId, number: value, twilioSid: sid })
      if (!r.ok) return setMsg({ ok: false, text: r.error })
      const incoming = r.data.incoming
      setMsg(
        incoming === 'routed' || incoming === 'already'
          ? { ok: true, text: 'Saved · calls in and out work in the CRM' }
          : { ok: false, text: incoming === 'not-found' ? 'Saved for calling out. This number isn’t in the Twilio account, so incoming calls can’t ring in the CRM.' : 'Saved for calling out. Couldn’t set up incoming calls (check the Twilio connection above).' },
      )
      router.refresh()
    })
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:w-56">
        <div className="truncate font-medium">{name}</div>
        <div className="text-xs text-muted-foreground">{role === 'ADMIN' ? 'Admin' : 'Sales'}</div>
      </div>
      <div className="flex flex-1 flex-wrap items-center gap-2">
        {numbers ? (
          <select value={value} onChange={(e) => setValue(e.target.value)} aria-label={`Number for ${name}`} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm sm:max-w-xs">
            <option value="">No number</option>
            {numbers.map((n) => (
              <option key={n.sid} value={n.number} disabled={Boolean(takenBy[n.number] && takenBy[n.number] !== userId)}>
                {formatPhone(n.number)}
                {n.name && n.name !== n.number ? ` · ${n.name}` : ''}
                {takenBy[n.number] && takenBy[n.number] !== userId ? ' (taken)' : ''}
              </option>
            ))}
          </select>
        ) : (
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="+972 50 123 4567" aria-label={`Number for ${name}`} className="h-9 min-w-0 flex-1 sm:max-w-xs" />
        )}
        <Button size="sm" variant={dirty ? 'default' : 'outline'} disabled={!dirty || pending} onClick={save}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}

/** Recording, and which countries can be called. */
export function VoiceSettingsForm({ initial }: { initial: { record: boolean; hints: boolean; countries: DialCountry[] } }): React.ReactElement {
  const router = useRouter()
  const [v, setV] = useState(initial)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const save = (): void =>
    start(async () => {
      setMsg(null)
      const r = await saveSettings({ 'voice.record': v.record, 'voice.hints': v.hints, 'voice.countries': v.countries })
      setMsg(r.ok ? { ok: true, text: 'Saved' } : { ok: false, text: r.error })
      if (r.ok) router.refresh()
    })
  return (
    <div className="space-y-4 text-sm">
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1" checked={v.record} onChange={(e) => setV({ ...v, record: e.target.checked })} />
        <span>
          <span className="font-medium">Record calls</span>
          <span className="block text-xs text-muted-foreground">Both sides, from the moment they answer. Needed later for transcripts, coaching and reviews (CallMap).</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1" checked={v.hints} onChange={(e) => setV({ ...v, hints: e.target.checked })} />
        <span>
          <span className="font-medium">Live Straight Line hints</span>
          <span className="block text-xs text-muted-foreground">While a salesperson is on a call, short coaching hints appear on their screen. Their call audio is transcribed live by OpenAI and not stored by us. Each rep can switch it off for themselves.</span>
        </span>
      </label>
      <fieldset className="space-y-1">
        <legend className="font-medium">Countries you can call</legend>
        <div className="flex flex-wrap gap-4">
          {(Object.keys(DIAL_COUNTRIES) as DialCountry[]).map((c) => (
            <label key={c} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={v.countries.includes(c)}
                onChange={(e) => setV({ ...v, countries: e.target.checked ? [...v.countries, c] : v.countries.filter((x) => x !== c) })}
              />
              {DIAL_COUNTRIES[c].flag} {DIAL_COUNTRIES[c].label}
            </label>
          ))}
        </div>
        <span className="block text-xs text-muted-foreground">Premium-rate numbers are always blocked. Twilio’s own geo permissions must allow these countries too.</span>
      </fieldset>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || v.countries.length === 0}>
          {pending ? 'Saving…' : 'Save'}
        </Button>
        {msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}

/** One Twilio number's incoming calls: ring in the CRM (for whoever owns the number) or keep going where they went. */
export function IncomingRoutingRow({ sid, number, owner, routed, canUndo, elsewhere }: { sid: string; number: string; owner: string | null; routed: boolean; canUndo: boolean; elsewhere: string }): React.ReactElement {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okText: string): void =>
    start(async () => {
      setMsg(null)
      const r = await fn()
      setMsg(r.ok ? { ok: true, text: okText } : { ok: false, text: r.error ?? 'Failed' })
      if (r.ok) router.refresh()
    })
  return (
    <div className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 sm:w-56">
        <div className="font-medium tabular-nums">{formatPhone(number)}</div>
        <div className="truncate text-xs text-muted-foreground">{owner ? `Rings ${owner}` : 'Not assigned to anyone yet'}</div>
      </div>
      <div className="min-w-0 flex-1 text-sm">
        {routed ? (
          <span className="inline-flex items-center gap-1.5 text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden /> Rings in the CRM
          </span>
        ) : (
          <span className="block truncate text-muted-foreground" title={elsewhere}>
            Goes to {elsewhere || 'nothing set'}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {routed ? (
          canUndo ? (
            <Button size="sm" variant="outline" disabled={pending} onClick={() => window.confirm('Send this number’s calls back to where they went before?') && run(() => restoreIncomingRouting(sid), 'Restored')}>
              Undo
            </Button>
          ) : null
        ) : (
          <Button size="sm" disabled={pending || !owner} title={owner ? undefined : 'Assign the number to someone first'} onClick={() => window.confirm(`Incoming calls to ${formatPhone(number)} will ring in the CRM for ${owner}. Its current routing is saved so you can undo. Continue?`) && run(() => routeIncomingToCrm(sid), 'Done: calls now ring in the CRM')}>
            Ring in the CRM
          </Button>
        )}
        {msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}
