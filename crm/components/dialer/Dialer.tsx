'use client'

import { ArrowUpRight, Check, Delete, Grid3x3, History, Mic, MicOff, Phone, PhoneOff, Search, Users, X } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { abandonCall, clearStuckCalls, recentCalls, saveCallWrapUp, searchDialerContacts, startCall, type DialerContact, type RecentCall, type StartedCall } from '@/app/actions/calls'
import { cn } from '@/lib/utils'
import { formatAsTyped, formatPhone, toE164 } from '@/lib/phone-numbers'
import { demoEngine, fetchVoiceToken, twilioEngine, voiceErrorText, type ActiveCall, type VoiceEngine } from './voice'

/* ───────────────────────── state ───────────────────────── */

type Phase = 'idle' | 'connecting' | 'ringing' | 'live' | 'wrapup'
interface Session {
  call: StartedCall
  phase: Phase
  answeredAt: number | null
  endedAt: number | null
  muted: boolean
  /** How it ended, for the wrap-up's suggestion */
  ended: 'answered' | 'no_answer' | 'busy' | 'canceled' | 'failed' | null
  /** The other phone rang (so "didn't pick up" rather than "didn't go through") */
  rang: boolean
}

const OUTCOMES: { key: string; label: string }[] = [
  { key: 'connected', label: 'Connected' },
  { key: 'voicemail', label: 'Left voicemail' },
  { key: 'no_answer', label: 'No answer' },
  { key: 'busy', label: 'Busy' },
  { key: 'callback', label: 'Call back later' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'wrong_number', label: 'Wrong number' },
]

interface DialerApi {
  dial: (phone: string, lead?: { id: string; name: string } | null) => void
  open: () => void
}
const DialerContext = createContext<DialerApi | null>(null)
/** null outside the dialer (no line, marketing users): callers fall back to a plain tel: link. */
export const useDialer = (): DialerApi | null => useContext(DialerContext)

const fmt = (ms: number): string => {
  const s = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(s % 60).padStart(2, '0')}`
}
const initials = (name: string | undefined, fallback: string): string =>
  (name ?? '')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join('') || fallback

/* ───────────────────────── root ───────────────────────── */

const CRM_PATH = /^\/(sales|admin|marketing)(\/|$)/

/**
 * Mounted once in the root layout, so a live call survives moving between Sales, Admin and Marketing (each has its
 * own layout). Asks the server whether this person can call; always renders the same tree so pages never remount.
 */
export function DialerRoot({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname() ?? ''
  const crm = CRM_PATH.test(pathname)
  const [cfg, setCfg] = useState<{ number: string | null; demo: boolean } | null>(null)
  const checked = useRef<string | null>(null)
  useEffect(() => {
    // Check on entering the CRM, and again on later pages until calling is available (e.g. a line was just assigned)
    if (!crm || cfg || checked.current === pathname) return
    checked.current = pathname
    void fetch('/api/voice/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; number?: string | null; demo?: boolean } | null) => setCfg(d?.enabled ? { number: d.number ?? null, demo: Boolean(d.demo) } : null))
      .catch(() => undefined)
  }, [crm, cfg, pathname])
  // Signed out: forget, check again after the next sign-in (adjusting state during render, not in an effect)
  if (pathname === '/login' && cfg) {
    setCfg(null) // the next CRM page has a new path, so the check runs again
  }
  return (
    <DialerProvider enabled={Boolean(cfg)} visible={crm} number={cfg?.number ?? null} demo={cfg?.demo ?? false}>
      {children}
    </DialerProvider>
  )
}

/* ───────────────────────── provider + floating UI ───────────────────────── */

/**
 * The CRM dialer: a floating phone button on every page for teammates with a line. Wraps the app so any "Call" link
 * can open it pre-filled (useDialer). One call at a time; every call ends in a short wrap-up saved on the lead.
 */
export function DialerProvider({ enabled, visible, number, demo, children }: { enabled: boolean; visible: boolean; number: string | null; demo: boolean; children: React.ReactNode }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'keypad' | 'contacts' | 'recent'>('keypad')
  const [typed, setTyped] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [showPad, setShowPad] = useState(false)
  const engine = useRef<VoiceEngine | null>(null)
  const active = useRef<ActiveCall | null>(null)
  const busy = useRef(false)
  /** Hung up while still connecting: drop the call the moment it connects */
  const canceled = useRef(false)

  const live = session && session.phase !== 'wrapup'
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(t)
  }, [live])
  useEffect(() => () => engine.current?.destroy(), [])
  useEffect(() => {
    if (!notice) return
    const t = window.setTimeout(() => setNotice(null), 3500)
    return () => window.clearTimeout(t)
  }, [notice])

  /** Throw the phone session away (bad or expired token, dropped connection); the next call builds a fresh one. */
  const resetEngine = useCallback(() => {
    try {
      engine.current?.destroy()
    } catch {
      /* already gone */
    }
    engine.current = null
  }, [])

  const getEngine = useCallback(async (): Promise<VoiceEngine> => {
    if (engine.current?.healthy()) return engine.current
    if (engine.current) resetEngine()
    const t = await fetchVoiceToken()
    if ('demo' in t) engine.current = demoEngine()
    else if ('token' in t) engine.current = await twilioEngine(t.token)
    else throw new Error(t.error)
    return engine.current
  }, [resetEngine])

  const dial = useCallback(
    async (phone: string, lead?: { id: string; name: string } | null) => {
      if (busy.current || (session && session.phase !== 'wrapup')) {
        setOpen(true)
        return
      }
      if (session?.phase === 'wrapup') {
        // never lose an unsaved wrap-up
        setOpen(true)
        setError('Save the last call first, then dial again.')
        return
      }
      busy.current = true
      canceled.current = false
      setError(null)
      setOpen(true)
      setShowPad(false)
      try {
        const res = await startCall({ to: phone, leadId: lead?.id ?? null })
        if (!res.ok) {
          setError(res.error)
          return
        }
        const call = res.data
        setSession({ call, phase: 'connecting', answeredAt: null, endedAt: null, muted: false, ended: null, rang: false })
        let eng: VoiceEngine
        try {
          eng = await getEngine()
        } catch (e) {
          await abandonCall(call.callId, 'failed')
          setSession(null)
          setError(e instanceof Error ? e.message : 'Calling is not available right now.')
          return
        }
        let c: ActiveCall
        try {
          c = await eng.connect(call.callId, call.to)
        } catch (e) {
          resetEngine()
          await abandonCall(call.callId, 'failed')
          setSession(null)
          setError(voiceErrorText(e as { message?: string; code?: number }))
          return
        }
        if (canceled.current) {
          // hung up while it was still connecting
          c.hangup()
          return
        }
        active.current = c
        const finish = (ended: Session['ended']): void => {
          active.current = null
          setSession((s) => (s && s.phase !== 'wrapup' ? { ...s, phase: 'wrapup', endedAt: Date.now(), ended: s.answeredAt ? 'answered' : s.rang ? ended : 'failed' } : s))
          setOpen(true)
        }
        c.on('ringing', () => setSession((s) => (s && s.phase === 'connecting' ? { ...s, phase: 'ringing', rang: true } : s)))
        c.on('accept', () => setSession((s) => (s ? { ...s, phase: 'live', answeredAt: Date.now() } : s)))
        c.on('disconnect', () => finish('no_answer'))
        c.on('cancel', () => finish('canceled'))
        c.on('error', (e) => {
          setError(voiceErrorText(e))
          resetEngine()
          finish('failed')
        })
      } finally {
        busy.current = false
      }
    },
    [getEngine, resetEngine, session],
  )

  const api = useMemo<DialerApi>(() => ({ dial: (p, l) => void dial(p, l), open: () => setOpen(true) }), [dial])

  const hangup = (): void => {
    if (active.current) active.current.hangup()
    else if (session && session.phase !== 'wrapup') {
      canceled.current = true
      void abandonCall(session.call.callId, 'canceled')
      setSession((s) => (s ? { ...s, phase: 'wrapup', endedAt: Date.now(), ended: 'canceled' } : s))
    }
  }
  const toggleMute = (): void => {
    if (!session || !active.current) return
    active.current.mute(!session.muted)
    setSession({ ...session, muted: !session.muted })
  }

  const onWrapped = (leadName: string | null): void => {
    setSession(null)
    setTyped('')
    setNotice(leadName ? `Saved on ${leadName}’s timeline` : 'Call saved')
    router.refresh()
  }

  return (
    <DialerContext.Provider value={enabled ? api : null}>
      {children}
      {enabled && (visible || live) ? (
        <>
      <FloatingButton session={session} now={now} open={open} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <div
          role="dialog"
          aria-label="Phone"
          className="fixed inset-x-2 bottom-2 z-[60] flex max-h-[calc(100dvh-1rem)] flex-col overflow-hidden rounded-3xl border border-white/10 bg-[hsl(var(--card))] shadow-2xl shadow-black/50 sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[380px] sm:max-h-[min(680px,calc(100dvh-8rem))] animate-in fade-in slide-in-from-bottom-4"
        >
          <header className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
            <div className="min-w-0">
              <div className="text-sm font-semibold">Phone</div>
              <div className="truncate text-xs text-muted-foreground">
                {demo ? 'Demo mode · no real calls' : number ? `Calling from ${formatPhone(number)}` : ''}
              </div>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close phone">
              <X className="h-4 w-4" />
            </button>
          </header>

          {session && session.phase !== 'wrapup' ? (
            <InCall session={session} now={now} showPad={showPad} setShowPad={setShowPad} onMute={toggleMute} onHangup={hangup} onDigit={(d) => active.current?.sendDigits(d)} />
          ) : session?.phase === 'wrapup' ? (
            <WrapUp session={session} onDone={onWrapped} />
          ) : (
            <>
              <nav className="grid grid-cols-3 gap-1 px-4 pt-3" aria-label="Phone views">
                {(
                  [
                    ['keypad', 'Keypad', Grid3x3],
                    ['contacts', 'Contacts', Users],
                    ['recent', 'Recent', History],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    aria-current={tab === k ? 'page' : undefined}
                    className={cn('flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors', tab === k ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground')}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
                  </button>
                ))}
              </nav>
              {error ? (
                <div role="alert" className="mx-4 mt-3 flex items-start gap-2 rounded-xl bg-rose-500/10 px-3 py-2 text-xs text-rose-200 ring-1 ring-rose-500/25">
                  <span className="flex-1">
                    {error}
                    {/already on a call/i.test(error) ? (
                      <button
                        type="button"
                        className="ms-1 underline underline-offset-2"
                        onClick={async () => {
                          const r = await clearStuckCalls()
                          setError(r.ok ? (r.data.stillLive ? 'Twilio says that call is still connected. Hang it up first.' : null) : r.error)
                          if (r.ok && !r.data.stillLive) setNotice('All clear. You can call now.')
                        }}
                      >
                        Check again
                      </button>
                    ) : null}
                  </span>
                  <button type="button" onClick={() => setError(null)} aria-label="Dismiss" className="text-rose-300 hover:text-rose-100">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : null}
              {notice ? (
                <div role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 ring-1 ring-emerald-500/25">
                  <Check className="h-3.5 w-3.5" aria-hidden /> {notice}
                </div>
              ) : null}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {tab === 'keypad' ? <Keypad value={typed} onChange={setTyped} onCall={(p, lead) => void dial(p, lead)} /> : null}
                {tab === 'contacts' ? <Contacts onCall={(c) => void dial(c.phone, { id: c.id, name: c.name })} /> : null}
                {tab === 'recent' ? <Recent onCall={(r) => void dial(r.to, r.lead)} /> : null}
              </div>
            </>
          )}
        </div>
      ) : null}
        </>
      ) : null}
    </DialerContext.Provider>
  )
}

function FloatingButton({ session, now, open, onClick }: { session: Session | null; now: number; open: boolean; onClick: () => void }): React.ReactElement {
  const live = session && session.phase !== 'wrapup'
  if (live) {
    const label = session.phase === 'live' && session.answeredAt ? fmt(now - session.answeredAt) : session.phase === 'ringing' ? 'Ringing…' : 'Calling…'
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`On a call with ${session.call.lead?.name ?? session.call.display}. ${open ? 'Hide' : 'Show'} the phone`}
        className="fixed bottom-5 right-5 z-[59] flex items-center gap-2.5 rounded-full bg-emerald-500 py-2.5 pl-3 pr-4 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-950/50 motion-reduce:hidden" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-950" />
        </span>
        <span className="max-w-[9rem] truncate">{session.call.lead?.name ?? session.call.display}</span>
        <span className="tabular-nums opacity-80">{label}</span>
      </button>
    )
  }
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={open ? 'Close phone' : 'Open phone'}
      aria-expanded={open}
      className={cn(
        'fixed bottom-5 right-5 z-[59] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-primary/30 ring-1 ring-white/15 transition-transform hover:scale-105 active:scale-95',
        session?.phase === 'wrapup' ? 'bg-amber-500' : 'bg-gradient-to-br from-[#4f8df0] to-[#2f66bd]',
        open && 'sm:rotate-0',
      )}
    >
      {open ? <X className="h-6 w-6" /> : <Phone className="h-6 w-6" />}
      {session?.phase === 'wrapup' && !open ? <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full bg-rose-500 ring-2 ring-background" aria-label="Wrap-up waiting" /> : null}
    </button>
  )
}

/* ───────────────────────── keypad ───────────────────────── */

const KEYS: [string, string][] = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', '+'],
  ['#', ''],
]

function KeyGrid({ onKey, onLong }: { onKey: (k: string) => void; onLong?: (k: string) => void }): React.ReactElement {
  const timer = useRef<number | null>(null)
  const longFired = useRef(false)
  return (
    <div className="grid grid-cols-3 gap-x-5 gap-y-3 px-8">
      {KEYS.map(([k, sub]) => (
        <button
          key={k}
          type="button"
          onPointerDown={() => {
            longFired.current = false
            if (k === '0' && onLong)
              timer.current = window.setTimeout(() => {
                longFired.current = true
                onLong('+')
              }, 450)
          }}
          onPointerUp={() => timer.current && window.clearTimeout(timer.current)}
          onPointerLeave={() => timer.current && window.clearTimeout(timer.current)}
          onClick={() => !longFired.current && onKey(k)}
          aria-label={k === '0' ? '0 (hold for +)' : k}
          className="mx-auto flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full bg-muted/50 transition-colors hover:bg-muted active:bg-primary/25"
        >
          <span className="text-2xl font-light leading-none">{k}</span>
          <span className="mt-0.5 h-3 text-[9px] font-semibold tracking-[0.18em] text-muted-foreground">{sub}</span>
        </button>
      ))}
    </div>
  )
}

function Keypad({ value, onChange, onCall }: { value: string; onChange: (v: string) => void; onCall: (phone: string, lead: { id: string; name: string } | null) => void }): React.ReactElement {
  const input = useRef<HTMLInputElement>(null)
  const [match, setMatch] = useState<DialerContact | null>(null)
  const e164 = toE164(value)

  // Who is this number? (a contact you can see with the same number)
  useEffect(() => {
    setMatch(null)
    if (!e164) return
    const t = window.setTimeout(async () => {
      const r = await searchDialerContacts(e164.slice(-7))
      if (r.ok) setMatch(r.data.find((c) => c.phone === e164) ?? null)
    }, 250)
    return () => window.clearTimeout(t)
  }, [e164])

  // Typing on the keyboard works anywhere in the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLElement && e.target !== input.current && /input|textarea|select/i.test(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9*#+]$/.test(e.key)) {
        if (document.activeElement !== input.current) {
          e.preventDefault()
          onChange(value + e.key)
        }
      } else if (e.key === 'Backspace' && document.activeElement !== input.current) onChange(value.slice(0, -1))
      else if (e.key === 'Enter' && e164) onCall(value, match ? { id: match.id, name: match.name } : null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange, onCall, e164, match])

  return (
    <div className="flex flex-col gap-5 pb-6 pt-5">
      <div className="px-6 text-center">
        <input
          ref={input}
          value={formatAsTyped(value)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d+*#]/g, ''))}
          inputMode="tel"
          autoComplete="off"
          placeholder="Enter a number"
          aria-label="Phone number"
          className="w-full bg-transparent text-center text-3xl font-light tabular-nums tracking-wide outline-none placeholder:text-base placeholder:text-muted-foreground/60"
        />
        <div className="mt-1 h-5 truncate text-xs text-muted-foreground" aria-live="polite">
          {match ? (
            <span className="text-foreground">
              {match.name}
              {match.company ? <span className="text-muted-foreground"> · {match.company}</span> : null}
            </span>
          ) : e164 ? (
            formatPhone(e164)
          ) : value.length > 3 ? (
            'Keep typing…'
          ) : (
            ''
          )}
        </div>
      </div>
      <KeyGrid onKey={(k) => onChange(value + k)} onLong={(k) => onChange(value + k)} />
      <div className="grid grid-cols-3 items-center px-8">
        <span />
        <button
          type="button"
          disabled={!e164}
          onClick={() => e164 && onCall(value, match ? { id: match.id, name: match.name } : null)}
          aria-label={match ? `Call ${match.name}` : 'Call'}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-95 disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none"
        >
          <Phone className="h-7 w-7" />
        </button>
        {value ? (
          <button type="button" onClick={() => onChange(value.slice(0, -1))} onDoubleClick={() => onChange('')} aria-label="Delete digit" className="mx-auto rounded-full p-3 text-muted-foreground hover:bg-muted hover:text-foreground">
            <Delete className="h-6 w-6" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  )
}

/* ───────────────────────── contacts & recent ───────────────────────── */

function Contacts({ onCall }: { onCall: (c: DialerContact) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState<DialerContact[] | null>(null)
  useEffect(() => {
    const t = window.setTimeout(async () => {
      const r = await searchDialerContacts(q)
      setRows(r.ok ? r.data : [])
    }, q ? 220 : 0)
    return () => window.clearTimeout(t)
  }, [q])
  return (
    <div className="space-y-2 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or number" aria-label="Search contacts" className="h-10 w-full rounded-xl border border-white/10 bg-background/60 pl-9 pr-3 text-sm outline-none focus:border-primary/60" />
      </div>
      {rows === null ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{q ? 'No contacts with a phone number match.' : 'No contacts with a phone number yet.'}</p>
      ) : (
        <ul className="space-y-1">
          {rows.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onCall(c)} className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-muted/60">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">{initials(c.name, '#')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[c.company, c.display].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                  <Phone className="h-4 w-4" aria-hidden />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.key, o.label]))
const timeAgo = (iso: string): string => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h}h ago` : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(iso))
}

function Recent({ onCall }: { onCall: (r: RecentCall) => void }): React.ReactElement {
  const [rows, setRows] = useState<RecentCall[] | null>(null)
  useEffect(() => {
    void recentCalls().then((r) => setRows(r.ok ? r.data : []))
  }, [])
  if (rows === null) return <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
  if (!rows.length) return <p className="px-6 py-10 text-center text-xs text-muted-foreground">Your calls will show up here.</p>
  return (
    <ul className="space-y-1 p-3">
      {rows.map((r) => {
        const missed = r.status !== 'COMPLETED' && !r.live
        return (
          <li key={r.id} className="group flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-muted/60">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', missed ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400')}>
              <ArrowUpRight className="h-4 w-4" aria-label="Outgoing" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {r.lead ? (
                  <a href={`/sales/leads/${r.lead.id}`} className="hover:underline">
                    {r.lead.name}
                  </a>
                ) : (
                  r.display
                )}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.outcome ? OUTCOME_LABEL[r.outcome] : r.live ? 'In progress' : r.status === 'COMPLETED' ? 'Connected' : r.status.replace('_', ' ').toLowerCase()}
                {r.durationSec ? ` · ${fmt(r.durationSec * 1000)}` : ''} · {timeAgo(r.startedAt)}
              </span>
            </span>
            <button type="button" onClick={() => onCall(r)} aria-label={`Call ${r.lead?.name ?? r.display} again`} className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 opacity-70 transition hover:opacity-100">
              <Phone className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/* ───────────────────────── in call ───────────────────────── */

function InCall({ session, now, showPad, setShowPad, onMute, onHangup, onDigit }: { session: Session; now: number; showPad: boolean; setShowPad: (v: boolean) => void; onMute: () => void; onHangup: () => void; onDigit: (d: string) => void }): React.ReactElement {
  const { call, phase } = session
  const name = call.lead?.name
  const [tones, setTones] = useState('')
  const status = phase === 'connecting' ? 'Calling…' : phase === 'ringing' ? 'Ringing…' : session.answeredAt ? fmt(now - session.answeredAt) : ''
  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-6 pb-7 pt-8">
      <div className="relative flex h-24 w-24 items-center justify-center">
        {phase !== 'live' ? (
          <>
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 motion-reduce:hidden" />
            <span className="absolute -inset-2 rounded-full bg-primary/10" />
          </>
        ) : null}
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#4f8df0] to-[#2f66bd] text-2xl font-semibold text-white">{initials(name, '#')}</span>
      </div>
      <div className="text-center">
        <div className="text-xl font-semibold">{name ?? call.display}</div>
        {name ? <div className="text-sm text-muted-foreground">{call.display}</div> : null}
        <div className={cn('mt-2 text-sm tabular-nums', phase === 'live' ? 'text-emerald-400' : 'text-muted-foreground')} aria-live="polite">
          {status}
        </div>
        {call.record && phase === 'live' ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Recording
          </div>
        ) : null}
        {call.demo ? <div className="mt-2 text-[11px] text-amber-300">Demo call: nobody is actually being called</div> : null}
      </div>

      {showPad ? (
        <div className="w-full">
          <div className="mb-3 h-6 text-center text-lg tabular-nums tracking-widest">{tones}</div>
          <KeyGrid
            onKey={(k) => {
              setTones((t) => (t + k).slice(-16))
              onDigit(k)
            }}
          />
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center justify-center gap-6">
        <RoundAction label={session.muted ? 'Unmute' : 'Mute'} active={session.muted} onClick={onMute} disabled={phase !== 'live'}>
          {session.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </RoundAction>
        <button type="button" onClick={onHangup} aria-label="Hang up" className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg shadow-rose-500/30 transition hover:bg-rose-400 active:scale-95">
          <PhoneOff className="h-7 w-7" />
        </button>
        <RoundAction label={showPad ? 'Hide keypad' : 'Keypad'} active={showPad} onClick={() => setShowPad(!showPad)} disabled={phase !== 'live'}>
          <Grid3x3 className="h-5 w-5" />
        </RoundAction>
      </div>
    </div>
  )
}

function RoundAction({ label, active, onClick, disabled, children }: { label: string; active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label} className={cn('flex h-12 w-12 items-center justify-center rounded-full transition-colors disabled:opacity-40', active ? 'bg-foreground text-background' : 'bg-muted/70 hover:bg-muted')}>
        {children}
      </button>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

/* ───────────────────────── wrap-up ───────────────────────── */

function WrapUp({ session, onDone }: { session: Session; onDone: (leadName: string | null) => void }): React.ReactElement {
  const answered = session.ended === 'answered'
  const talked = answered && session.answeredAt && session.endedAt ? session.endedAt - session.answeredAt : 0
  const [outcome, setOutcome] = useState<string>(answered ? 'connected' : session.ended === 'busy' ? 'busy' : 'no_answer')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const name = session.call.lead?.name ?? null
  const save = async (): Promise<void> => {
    setSaving(true)
    setError(null)
    const r = await saveCallWrapUp({ callId: session.call.callId, outcome: outcome as never, notes: notes.trim() || undefined })
    setSaving(false)
    if (!r.ok) return setError(r.error)
    onDone(name)
  }
  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Call ended</div>
        <div className="mt-1 text-lg font-semibold">{name ?? session.call.display}</div>
        <div className="text-sm text-muted-foreground">{answered ? `Talked for ${fmt(talked)}` : session.ended === 'failed' ? 'The call didn’t go through' : session.ended === 'canceled' ? 'Hung up before they answered' : session.ended === 'busy' ? 'The line was busy' : 'They didn’t pick up'}</div>
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-medium">How did it go?</legend>
        <div className="flex flex-wrap gap-2">
          {OUTCOMES.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOutcome(o.key)}
              aria-pressed={outcome === o.key}
              className={cn('rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-colors', outcome === o.key ? 'bg-primary text-primary-foreground ring-primary' : 'ring-white/15 hover:bg-muted')}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Note {name ? <span className="font-normal text-muted-foreground">(goes on {name}’s timeline)</span> : null}</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder="What did you agree? What’s next?" className="w-full resize-none rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60" />
      </label>
      {!session.call.lead ? <p className="text-xs text-muted-foreground">This number isn’t on a contact, so the call is saved in your call history only.</p> : null}
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── click-to-call ───────────────────────── */

/** A phone number that opens the CRM dialer (or the device's phone app when the dialer isn't available). */
export function CallLink({ phone, lead, className, children }: { phone: string; lead?: { id: string; name: string }; className?: string; children?: React.ReactNode }): React.ReactElement {
  const dialer = useDialer()
  return (
    <a
      href={`tel:${phone}`}
      className={className}
      onClick={(e) => {
        if (!dialer) return
        e.preventDefault()
        dialer.dial(phone, lead ?? null)
      }}
    >
      {children ?? phone}
    </a>
  )
}
