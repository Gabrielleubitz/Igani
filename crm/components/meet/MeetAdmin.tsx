'use client'

import { Check, CircleDot, Clock, CloudUpload, Copy, Download, Loader2, Mail, Play, Plus, Send, Trash2, UserPlus, Video, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { addMeetInvites, createMeetRoom, endMeetRoom, removeMeetInvite, removeMeetRecording, resendMeetInvite, retryMeetRecording } from '@/app/actions/meet'
import { Button } from '@/components/ui/button'
import { Input, Select, Textarea } from '@/components/ui/input'
import { Tag } from '@/components/ui/tone'
import { cn } from '@/lib/utils'

export interface Teammate {
  id: string
  name: string
  email: string
}

/** Pick teammates (chips) and type any other emails. */
function Invitees({ teammates, picked, setPicked, emails, setEmails, exclude = [] }: { teammates: Teammate[]; picked: string[]; setPicked: (v: string[]) => void; emails: string; setEmails: (v: string) => void; exclude?: string[] }): React.ReactElement {
  const list = teammates.filter((t) => !exclude.includes(t.email.toLowerCase()))
  return (
    <div className="space-y-3">
      {list.length ? (
        <div>
          <div className="mb-1.5 text-xs text-muted-foreground">Teammates</div>
          <div className="flex flex-wrap gap-1.5">
            {list.map((t) => {
              const on = picked.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setPicked(on ? picked.filter((x) => x !== t.id) : [...picked, t.id])}
                  className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition', on ? 'border-primary/50 bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted')}
                  aria-pressed={on}
                >
                  {on ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {t.name}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-xs text-muted-foreground">Other people (any email, comma or new line between them)</span>
        <Textarea rows={2} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="dana@client.com, Mike Amory <mike@cryo.com>" className="text-sm" />
      </label>
    </div>
  )
}

export function NewMeetForm({ teammates, ready }: { teammates: Teammate[]; ready: boolean }): React.ReactElement {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [when, setWhen] = useState('')
  const [duration, setDuration] = useState(30)
  const [picked, setPicked] = useState<string[]>([])
  const [emails, setEmails] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()

  const submit = (startNow: boolean) =>
    start(async () => {
      setMsg(null)
      const res = await createMeetRoom({ title: title || (startNow ? 'Quick call' : ''), when: startNow ? '' : when, durationMin: duration, userIds: picked, emails, send: true })
      if (!res.ok) return setMsg({ ok: false, text: res.error })
      const { sent, failed, code } = res.data
      setMsg({ ok: failed === 0, text: `${sent ? `Invites sent to ${sent} ${sent === 1 ? 'person' : 'people'}.` : 'Call created.'}${failed ? ` ${failed} couldn’t be emailed: copy their link below.` : ''}` })
      setTitle('')
      setWhen('')
      setPicked([])
      setEmails('')
      router.refresh()
      if (startNow) window.open(`/meet/${code}`, '_blank', 'noopener')
    })

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-foreground">Name of the call</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Demo with Wine & Grind" maxLength={120} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-foreground">When (optional)</span>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="sm:w-56" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs text-muted-foreground">Length</span>
          <Select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="sm:w-28">
            {[15, 30, 45, 60, 90].map((m) => (
              <option key={m} value={m}>
                {m} min
              </option>
            ))}
          </Select>
        </label>
      </div>
      <Invitees teammates={teammates} picked={picked} setPicked={setPicked} emails={emails} setEmails={setEmails} />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" disabled={pending || !ready || !title.trim()} onClick={() => submit(false)}>
          {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
          {picked.length || emails.trim() ? 'Create & send invites' : 'Create call'}
        </Button>
        <Button type="button" variant="outline" disabled={pending || !ready} onClick={() => submit(true)}>
          <Video className="mr-1.5 h-4 w-4" /> Start now
        </Button>
        {msg ? <span className={cn('text-sm', msg.ok ? 'text-emerald-300' : 'text-amber-300')}>{msg.text}</span> : null}
      </div>
    </div>
  )
}

export interface RoomView {
  id: string
  code: string
  title: string
  when: string | null
  durationMin: number
  ended: boolean
  hostName: string
  recordings: RecordingView[]
  invites: { id: string; email: string; name: string | null; teammate: boolean; link: string; sent: boolean; error: string | null; joined: boolean }[]
}

export interface RecordingView {
  id: string
  when: string
  duration: string | null
  state: 'processing' | 'saved' | 'temporary' | 'expired'
  note: string | null
  /** when 8x8's own copy goes away */
  until: string | null
}

const STATE_TAG: Record<RecordingView['state'], { tone: 'emerald' | 'sky' | 'amber' | 'slate'; label: string }> = {
  saved: { tone: 'emerald', label: 'Saved' },
  processing: { tone: 'sky', label: 'Saving…' },
  temporary: { tone: 'amber', label: 'Not saved yet' },
  expired: { tone: 'slate', label: 'Expired' },
}

/** One recording: play it right here, download it, and (while 8x8 still has it) save a copy again. */
function RecordingRow({ rec, pending, run }: { rec: RecordingView; pending: boolean; run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void }): React.ReactElement {
  const [playing, setPlaying] = useState(false)
  const src = `/api/admin/meet/recordings/${rec.id}`
  const playable = rec.state !== 'expired'
  const tag = STATE_TAG[rec.state]
  const btn = 'inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50'
  return (
    <li className="px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-400">
          <CircleDot className="h-3.5 w-3.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate">{rec.when}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {rec.duration ?? 'Recording'}
            {rec.state === 'temporary' && rec.until ? ` · 8x8 keeps it until ${rec.until}` : ''}
          </span>
        </span>
        <Tag tone={tag.tone}>{tag.label}</Tag>
        {playable ? (
          <>
            <button type="button" className={btn} onClick={() => setPlaying((v) => !v)}>
              <Play className="h-3.5 w-3.5" /> {playing ? 'Hide' : 'Play'}
            </button>
            <a className={btn} href={`${src}?download=1`}>
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </>
        ) : null}
        {rec.state === 'temporary' ? (
          <button type="button" className={btn} disabled={pending} onClick={() => run(() => retryMeetRecording(rec.id))}>
            <CloudUpload className="h-3.5 w-3.5" /> Save copy
          </button>
        ) : null}
        <button type="button" title="Delete this recording" aria-label="Delete this recording" className={cn(btn, 'hover:text-rose-300')} disabled={pending} onClick={() => run(() => removeMeetRecording(rec.id))}>
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      {rec.note && rec.state !== 'saved' ? <p className="mt-1.5 pl-9 text-xs text-amber-300/90">{rec.note}</p> : null}
      {playing && playable ? <video src={src} controls autoPlay playsInline className="mt-2.5 aspect-video w-full rounded-lg bg-black" /> : null}
    </li>
  )
}

function CopyIcon({ text }: { text: string }): React.ReactElement {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      title="Copy their personal link"
      aria-label="Copy their personal link"
      onClick={() =>
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        })
      }
      className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {done ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

export function RoomCard({ room, teammates }: { room: RoomView; teammates: Teammate[] }): React.ReactElement {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const [emails, setEmails] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (fn: () => Promise<{ ok: boolean; error?: string } & Record<string, unknown>>, after?: () => void) =>
    start(async () => {
      setMsg(null)
      const r = await fn()
      if (!r.ok) setMsg(r.error ?? 'Something went wrong.')
      else after?.()
      router.refresh()
    })

  return (
    <li className={cn('rounded-2xl border bg-card/60 p-4', room.ended && 'opacity-70')}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-medium">{room.title}</h3>
            {room.ended ? <Tag tone="slate">Ended</Tag> : room.when ? <Tag tone="violet">Scheduled</Tag> : <Tag tone="emerald">Open</Tag>}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {room.when ? `${room.when} · ${room.durationMin} min` : 'Any time'} · host {room.hostName}
          </p>
        </div>
        {!room.ended ? (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button asChild size="sm">
              <a href={`/meet/${room.code}`} target="_blank" rel="noopener">
                <Video className="mr-1.5 h-4 w-4" /> Join
              </a>
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAdding((v) => !v)}>
              <UserPlus className="mr-1.5 h-4 w-4" /> Invite
            </Button>
            <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => endMeetRoom(room.id))} title="End the call: links stop working">
              End
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => endMeetRoom(room.id, { remove: true }))}>
            <Trash2 className="mr-1.5 h-4 w-4" /> Remove
          </Button>
        )}
      </div>

      {room.invites.length ? (
        <ul className="mt-3 divide-y divide-border/60 rounded-xl border">
          {room.invites.map((i) => (
            <li key={i.id} className="flex items-center gap-2.5 px-3 py-2 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6aa6ff] to-[#2f5fd0] text-[11px] font-semibold text-white">{(i.name ?? i.email).charAt(0).toUpperCase()}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate">{i.name ?? i.email}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {i.name ? i.email : null}
                  {i.teammate ? `${i.name ? ' · ' : ''}teammate` : null}
                </span>
              </span>
              {i.joined ? <Tag tone="emerald">Joined</Tag> : i.error ? <Tag tone="rose">Not emailed</Tag> : i.sent ? <Tag tone="sky">Invited</Tag> : <Tag tone="slate">Link only</Tag>}
              {!room.ended ? (
                <>
                  <CopyIcon text={i.link} />
                  <button type="button" disabled={pending} title="Email the invite again" aria-label="Email the invite again" onClick={() => run(() => resendMeetInvite(i.id))} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground">
                    <Mail className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" disabled={pending} title="Remove (their link stops working)" aria-label="Remove invite" onClick={() => run(() => removeMeetInvite(i.id))} className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-rose-300">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : null}
            </li>
          ))}
        </ul>
      ) : !room.ended ? (
        <p className="mt-3 text-xs text-muted-foreground">No one invited yet. Use Invite to add teammates or any email.</p>
      ) : null}

      {room.recordings.length ? (
        <div className="mt-3">
          <div className="mb-1.5 text-xs text-muted-foreground">Recordings</div>
          <ul className="divide-y divide-border/60 rounded-xl border">
            {room.recordings.map((r) => (
              <RecordingRow key={r.id} rec={r} pending={pending} run={(fn) => run(fn)} />
            ))}
          </ul>
        </div>
      ) : null}

      {adding && !room.ended ? (
        <div className="mt-3 space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
          <Invitees teammates={teammates} picked={picked} setPicked={setPicked} emails={emails} setEmails={setEmails} exclude={room.invites.map((i) => i.email)} />
          <Button
            size="sm"
            disabled={pending || (!picked.length && !emails.trim())}
            onClick={() =>
              run(
                () => addMeetInvites({ roomId: room.id, userIds: picked, emails }),
                () => {
                  setPicked([])
                  setEmails('')
                  setAdding(false)
                },
              )
            }
          >
            {pending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />} Send invites
          </Button>
        </div>
      ) : null}
      {msg ? <p className="mt-2 text-sm text-amber-300">{msg}</p> : null}
    </li>
  )
}
