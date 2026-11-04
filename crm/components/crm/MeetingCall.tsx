'use client'

import { GOOGLE_CONNECT_SCOPES } from '@/lib/google-scopes'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useTransition } from 'react'
import { deleteTeamMeeting, recheckMeetingNotes, syncMeetings, tidyMeetingNotes } from '@/app/sales/actions'
import { Button } from '@/components/ui/button'
import type { OrganizedNotes } from '@/lib/organize-notes'

export interface MeetingCallView {
  bookingId: string
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'NOT_HELD'
  started: string | null
  ended: string | null
  minutes: number | null
  people: string[]
  notesStatus: 'WAITING' | 'READY' | 'LINK_ONLY' | 'NONE' | 'NOT_AVAILABLE' | null
  docUrl: string | null
  summary: string | null
  nextSteps: string | null
  fullText: string | null
  notes: OrganizedNotes | null
  ai: boolean
  canTidy: boolean
  timesUnknown: boolean
}

/** Checks this contact's Meet calls (or the user's own) in the background and refreshes when something changed. */
export function MeetingSyncTrigger({ leadId, everyMs = 0 }: { leadId?: string; everyMs?: number }): null {
  const router = useRouter()
  useEffect(() => {
    let alive = true
    const run = (): void => {
      void syncMeetings(leadId).then((r) => {
        if (alive && r.ok && r.data.checked > 0) router.refresh()
      })
    }
    run()
    const t = everyMs ? setInterval(run, everyMs) : null
    return () => {
      alive = false
      if (t) clearInterval(t)
    }
  }, [router, leadId, everyMs])
  return null
}

/** Banner when the user's Google grant predates Meet tracking (one reconnect adds the two read-only permissions). */
export function MeetConnectBanner(): React.ReactElement {
  return (
    <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2.5 text-xs">
      <p>Reconnect Google once so the CRM can record when your calls really start and end, and pull in the Gemini notes.</p>
      <p className="mt-1 text-muted-foreground">
        On Google&apos;s screen click <strong>Advanced</strong> → <strong>Go to igani (unsafe)</strong> → <strong>Allow</strong>, keeping the Meet and Docs boxes ticked.
      </p>
      <Button size="sm" className="mt-2" onClick={() => void signIn('google', { callbackUrl: window.location.pathname }, { scope: GOOGLE_CONNECT_SCOPES, access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' })}>
        Reconnect Google
      </Button>
    </div>
  )
}

const NOTE_TEXT: Record<string, string> = {
  WAITING: 'Waiting for Gemini notes. They usually arrive 3-10 minutes after the call.',
  LINK_ONLY: 'Gemini notes found, but the CRM could not read them yet.',
  NONE: 'No Gemini notes were made for this call (notes were off, or someone outside the team took them).',
  NOT_AVAILABLE: 'Gemini notes are only pulled in when an @igani.co teammate hosts the call.',
}

function Section({ title, items, numbered }: { title: string; items: string[]; numbered?: boolean }): React.ReactElement | null {
  if (!items.length) return null
  const List = numbered ? 'ol' : 'ul'
  return (
    <div>
      <p className="mb-1 font-semibold">{title}</p>
      <List className={`space-y-1 pl-4 leading-relaxed ${numbered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </List>
    </div>
  )
}

/** Summary, decisions, next steps and topics as short lists instead of one wall of text. */
function NotesSections({ n }: { n: OrganizedNotes }): React.ReactElement {
  return (
    <div className="space-y-3">
      {n.overview.length ? <div className="space-y-1 leading-relaxed">{n.overview.map((t, i) => <p key={i}>{t}</p>)}</div> : null}
      <Section title="Decisions" items={n.decisions} />
      <Section title="Next steps" items={n.actions} numbered />
      {n.topics.length ? (
        <div>
          <p className="mb-1 font-semibold">Topics discussed</p>
          <ul className="space-y-1.5 leading-relaxed">
            {n.topics.map((t, i) => (
              <li key={i}>
                {t.title ? <span className="font-medium">{t.title}: </span> : null}
                {t.points.join(' ')}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

/** What really happened on a Meet call: live/ended, real times, who joined, and the Gemini notes. */
export function MeetingCall({ m }: { m: MeetingCallView }): React.ReactElement | null {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [full, setFull] = useState(false)

  const recheck = (): void =>
    start(async () => {
      setMsg(null)
      const r = await recheckMeetingNotes(m.bookingId)
      if (!r.ok) return setMsg(r.error)
      setMsg(r.data.status === 'READY' ? 'Notes pulled in.' : 'Not there yet. We keep checking automatically.')
      router.refresh()
    })

  const tidy = (): void =>
    start(async () => {
      setMsg(null)
      const r = await tidyMeetingNotes(m.bookingId)
      setMsg(r.ok ? 'Notes tidied.' : r.error)
      if (r.ok) router.refresh()
    })

  if (m.status === 'SCHEDULED' && !m.notesStatus) return null
  return (
    <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3 text-xs">
      {m.status === 'LIVE' ? (
        <p className="flex items-center gap-2 font-medium text-success">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          Live now · started {m.started}
        </p>
      ) : m.status === 'ENDED' ? (
        <p>
          <span className="font-medium">Call held</span> · {m.started} – {m.ended}
          {m.minutes != null ? ` · ${m.minutes} min` : ''}
        </p>
      ) : m.status === 'NOT_HELD' ? (
        <p className="text-muted-foreground">Nobody joined this call.</p>
      ) : m.timesUnknown ? (
        <p className="text-muted-foreground">Real call times need the Meet permission (reconnect Google).</p>
      ) : null}
      {m.people.length ? <p className="text-muted-foreground">Joined: {m.people.join(', ')}</p> : null}

      {m.notesStatus ? (
        <div className="space-y-2 border-t pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">✨ Gemini notes</span>
            {m.docUrl ? (
              <a href={m.docUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                Open in Google Docs
              </a>
            ) : null}
          </div>
          {m.notesStatus === 'READY' ? (
            <>
              {m.notes ? <NotesSections n={m.notes} /> : m.summary ? <p className="whitespace-pre-wrap leading-relaxed">{m.summary}</p> : null}
              {!m.notes && m.nextSteps ? (
                <div>
                  <p className="font-medium">Next steps</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.nextSteps}</p>
                </div>
              ) : null}
              {!m.notes && !m.summary && !m.nextSteps && m.fullText ? <p className="whitespace-pre-wrap leading-relaxed">{m.fullText.slice(0, 600)}</p> : null}
              {m.canTidy && m.fullText ? (
                <button type="button" onClick={tidy} disabled={pending} className="mr-3 text-primary underline-offset-4 hover:underline disabled:opacity-60">
                  {pending ? 'Working…' : m.ai ? 'Re-tidy with AI' : '✨ Tidy up with AI'}
                </button>
              ) : null}
              {m.fullText ? (
                <button type="button" onClick={() => setFull((v) => !v)} className="text-primary underline-offset-4 hover:underline">
                  {full ? 'Hide full notes' : 'Show full notes'}
                </button>
              ) : null}
              {full && m.fullText ? <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded border bg-background p-2 font-sans leading-relaxed">{m.fullText}</pre> : null}
            </>
          ) : (
            <p className="text-muted-foreground">{NOTE_TEXT[m.notesStatus]}</p>
          )}
          {m.notesStatus !== 'READY' && m.notesStatus !== 'NOT_AVAILABLE' ? (
            <button type="button" onClick={recheck} disabled={pending} className="text-primary underline-offset-4 hover:underline disabled:opacity-60">
              {pending ? 'Checking…' : 'Check again'}
            </button>
          ) : null}
          {msg ? <p className="text-muted-foreground">{msg}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

/** Admin buttons on a team call: re-read its Gemini notes (and action items) now, or delete it so it can be imported again. */
export function TeamCallActions({ bookingId, canDelete }: { bookingId: string; canDelete: boolean }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const pull = (): void =>
    start(async () => {
      const r = await recheckMeetingNotes(bookingId)
      setMsg(r.ok ? (r.data.status !== 'READY' ? 'No Gemini notes yet. We keep checking.' : r.data.created ? `Added ${r.data.created} task${r.data.created === 1 ? '' : 's'} to teammates’ lists.` : 'Action items refreshed from the notes.') : r.error)
      if (r.ok) router.refresh()
    })
  const del = (): void => {
    if (!window.confirm('Delete this call? You can import it again from Google Calendar.')) return
    start(async () => {
      const r = await deleteTeamMeeting(bookingId)
      if (!r.ok) return setMsg(r.error)
      router.refresh()
    })
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <Button size="sm" variant="outline" onClick={pull} disabled={pending}>
        {pending ? 'Working…' : 'Pull action items'}
      </Button>
      {canDelete ? (
        <Button size="sm" variant="ghost" className="text-destructive" onClick={del} disabled={pending}>
          Delete
        </Button>
      ) : null}
      {msg ? <span className="text-muted-foreground">{msg}</span> : null}
    </div>
  )
}
