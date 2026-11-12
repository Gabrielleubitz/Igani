'use client'

import { ArrowUpRight, Check, ChevronDown, ChevronLeft, Delete, Grid3x3, History, ListChecks, Lock, MessageCircle, Mic, MicOff, Search, Users, Voicemail, X } from 'lucide-react'
import { smsUnread } from '@/app/actions/sms'
import { Messages } from './Messages'
import { usePathname, useRouter } from 'next/navigation'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { dialerCallLists, dialerProspects, type DialerList, type DialerProspect } from '@/app/actions/call-lists'
import { abandonCall, callProgress, clearStuckCalls, identifyCaller, lookupIncoming, recentCalls, simulateIncomingCall, type IncomingCaller, saveCallWrapUp, searchDialerContacts, startCall, type DialerContact, type RecentCall, type StartedCall } from '@/app/actions/calls'
import { markBusy } from '@/lib/stale-deploy'
import { cn } from '@/lib/utils'
import { CallActions } from './CallActions'
import { playDtmf } from './dtmf'
import { dialProblem, formatAsTyped, formatPhone, toE164 } from '@/lib/phone-numbers'
import type { CallerId } from '@/lib/caller-id'
import { useLiveHints } from './useLiveHints'
import type { LiveHint } from '@/lib/live-hints-core'
import { demoEngine, fetchVoiceToken, twilioEngine, voiceErrorText, type ActiveCall, type IncomingCall, type VoiceEngine } from './voice'

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
  /** who called whom */
  direction: 'out' | 'in'
  /** The business an unknown caller's number belongs to (call list or Google), offered in the wrap-up */
  company?: string | null
}

/** Wrap-up choices for every call. Each one becomes the lead's status. */
const OUTCOMES: { key: string; label: string }[] = [
  { key: 'interested', label: 'Interested' },
  { key: 'connected', label: 'Connected' },
  { key: 'callback', label: 'Call back' },
  { key: 'no_answer', label: 'No answer (NA)' },
  { key: 'voicemail', label: 'Voicemail' },
  { key: 'busy', label: 'Busy' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'wrong_number', label: 'Wrong number' },
]

type ProspectRef = { id: string; name: string }

/** Wrap-up choices for a business on a call list: "Interested" makes it a lead. */
const PROSPECT_OUTCOMES: { key: string; label: string }[] = [
  { key: 'interested', label: 'Interested → make lead' },
  { key: 'callback', label: 'Call back later' },
  { key: 'no_answer', label: 'No answer' },
  { key: 'voicemail', label: 'Left voicemail' },
  { key: 'busy', label: 'Busy' },
  { key: 'not_interested', label: 'Not interested' },
  { key: 'wrong_number', label: 'Wrong number' },
]

interface DialerApi {
  dial: (phone: string, lead?: { id: string; name: string } | null, prospect?: ProspectRef | null) => void
  /** open the phone, optionally on a tab (e.g. 'lists' for "Start calling") */
  open: (tab?: Tab) => void
  /** open the conversation with this number in the Messages tab */
  text: (phone: string) => void
}
type Tab = 'keypad' | 'contacts' | 'lists' | 'recent' | 'messages'
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

/** Who's calling: the contact, else whoever the number belongs to (a call-list business, a Google listing). */
const callerName = (c: IncomingCaller | null): string | null => c?.lead?.name ?? c?.id?.title ?? null
const callerLine = (c: IncomingCaller | null): string | null => c?.id?.subtitle ?? c?.lead?.company ?? null

/**
 * Unread texts on your line, checked every 20 s while the CRM is in front. A new one also shows a desktop alert when
 * the CRM is in the background and alerts are allowed.
 */
function useSmsUnread(enabled: boolean): { count: number; refresh: () => void } {
  const [count, setCount] = useState(0)
  const last = useRef<number | null>(null)
  const refresh = useCallback(() => {
    void smsUnread().then((r) => {
      if (!r.ok) return
      if (last.current !== null && r.data > last.current && document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('New text message', { body: 'Open the phone in the CRM to read it.', icon: '/android-chrome-192x192.png', tag: 'igani-sms' })
        } catch {
          /* not allowed here */
        }
      }
      last.current = r.data
      setCount(r.data)
    })
  }, [])
  useEffect(() => {
    if (!enabled) return
    const first = window.setTimeout(refresh, 0)
    const t = window.setInterval(refresh, 20_000)
    window.addEventListener('focus', refresh)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(t)
      window.removeEventListener('focus', refresh)
    }
  }, [enabled, refresh])
  return { count, refresh }
}

/* ───────────────────────── look ───────────────────────── */

/** A proper filled handset (not an outline icon), used for the button, call and hang-up. */
function Handset({ className }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2Z" />
    </svg>
  )
}

/** Solid surfaces with real edges: the panel sits clearly above the page. */
const KEY = 'transition-colors duration-150 hover:bg-foreground/[0.045] active:bg-foreground/[0.1]'
const FIELD = 'w-full rounded-xl border border-border bg-background text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-primary/25'
const LIST = 'divide-y divide-border overflow-hidden rounded-xl border border-border bg-background'

/* ───────────────────────── root ───────────────────────── */

const CRM_PATH = /^\/(sales|admin|marketing)(\/|$)/

/**
 * Mounted once in the root layout, so a live call survives moving between Sales, Admin and Marketing (each has its
 * own layout). Asks the server whether this person can call; always renders the same tree so pages never remount.
 */
export function DialerRoot({ children }: { children: React.ReactNode }): React.ReactElement {
  const pathname = usePathname() ?? ''
  const crm = CRM_PATH.test(pathname)
  const [cfg, setCfg] = useState<{ number: string | null; demo: boolean; admin: boolean } | null>(null)
  const checked = useRef<string | null>(null)
  useEffect(() => {
    // Check on entering the CRM, and again on later pages until calling is available (e.g. a line was just assigned)
    if (!crm || cfg || checked.current === pathname) return
    checked.current = pathname
    void fetch('/api/voice/status', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { enabled?: boolean; number?: string | null; demo?: boolean; admin?: boolean } | null) => setCfg(d?.enabled ? { number: d.number ?? null, demo: Boolean(d.demo), admin: Boolean(d.admin) } : null))
      .catch(() => undefined)
  }, [crm, cfg, pathname])
  // Signed out: forget, check again after the next sign-in (adjusting state during render, not in an effect)
  if (pathname === '/login' && cfg) {
    setCfg(null) // the next CRM page has a new path, so the check runs again
  }
  return (
    <DialerProvider enabled={Boolean(cfg)} visible={crm} number={cfg?.number ?? null} demo={cfg?.demo ?? false} admin={cfg?.admin ?? false}>
      {children}
    </DialerProvider>
  )
}

/* ───────────────────────── provider + floating UI ───────────────────────── */

/**
 * The CRM dialer: a floating phone button on every page for teammates with a line. Wraps the app so any "Call" link
 * can open it pre-filled (useDialer). One call at a time; every call ends in a short wrap-up saved on the lead.
 */
export function DialerProvider({ enabled, visible, number, demo, admin = false, children }: { enabled: boolean; visible: boolean; number: string | null; demo: boolean; admin?: boolean; children: React.ReactNode }): React.ReactElement {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<Tab>('keypad')
  /** the conversation open in the Messages tab ('' = writing a new one) */
  const [smsThread, setSmsThread] = useState<string | null>(null)
  const unread = useSmsUnread(enabled)
  /** the call list open in the Lists tab (kept while a call and its wrap-up run) */
  const [listId, setListId] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [session, setSession] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [showPad, setShowPad] = useState(false)
  /** admins: the next call is personal (not recorded, not on the CRM). Off again after each call. */
  const [privateNext, setPrivateNext] = useState(false)
  /** the rep can switch live hints off for themselves (kept in this browser) */
  const [hintsOn, setHintsOn] = useState(true)
  useEffect(() => {
    try {
      setHintsOn(localStorage.getItem('igani.liveHints') !== 'off')
    } catch {}
  }, [])
  const [incoming, setIncoming] = useState<{ call: IncomingCall; caller: IncomingCaller | null } | null>(null)
  const listening = useRef<VoiceEngine | null>(null)
  const sessionRef = useRef<Session | null>(null)
  useEffect(() => {
    sessionRef.current = session
  }, [session])
  /** bumped when the phone session is rebuilt, so the new one starts listening for calls again */
  const [engineGen, setEngineGen] = useState(0)
  const engine = useRef<VoiceEngine | null>(null)
  const active = useRef<ActiveCall | null>(null)
  const busy = useRef(false)
  /** Hung up while still connecting: drop the call the moment it connects */
  const canceled = useRef(false)

  const live = session && session.phase !== 'wrapup'
  const { hint: liveHintNow, active: hintsActive } = useLiveHints({ enabled: Boolean(session && session.phase === 'live' && session.direction === 'out' && session.call.hints && hintsOn), callId: session?.call.callId ?? '', answeredAt: session?.answeredAt ?? null, getStreams: () => active.current?.streams() ?? null })
  useEffect(() => {
    if (!live) return
    const t = window.setInterval(() => setNow(Date.now()), 500)
    // never reload this tab for a new version while on a call
    markBusy(true)
    return () => {
      window.clearInterval(t)
      markBusy(false)
    }
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
    setEngineGen((g) => g + 1)
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

  /** Someone is calling: ring here (Igani ringtone), alert the desktop if the tab isn't in front, show who it is. */
  const onIncoming = useCallback((call: IncomingCall) => {
    if (sessionRef.current && sessionRef.current.phase !== 'wrapup') {
      call.reject() // already on a call: they go to voicemail
      return
    }
    setIncoming({ call, caller: null })
    setOpen(true)
    let note: Notification | null = null
    const title = document.title
    const flash = window.setInterval(() => (document.title = document.title.startsWith('📞') ? title : '📞 Incoming call'), 1000)
    const stopAlerts = (): void => {
      window.clearInterval(flash)
      document.title = title
      note?.close()
    }
    call.onGone(() => {
      stopAlerts()
      setIncoming((cur) => {
        if (cur?.call === call) setNotice(`Missed call from ${cur.caller?.lead?.name ?? cur.caller?.display ?? 'a caller'}`)
        return cur?.call === call ? null : cur
      })
    })
    ;(call as IncomingCall & { stopAlerts?: () => void }).stopAlerts = stopAlerts
    void lookupIncoming(call.callId).then((r) => {
      const caller = r.ok ? r.data : null
      setIncoming((cur) => (cur?.call === call ? { call, caller } : cur))
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && (document.hidden || !document.hasFocus())) {
        note = new Notification('Incoming call', { body: callerName(caller) ? `${callerName(caller)}${callerLine(caller) ? ` · ${callerLine(caller)}` : ''}\n${caller!.display}` : (caller?.display ?? call.from), icon: '/android-chrome-192x192.png', tag: `call-${call.callId}`, requireInteraction: true })
        note.onclick = () => {
          window.focus()
          note?.close()
        }
      }
    })
  }, [])

  // Listen for incoming calls as soon as calling is available (every CRM tab rings)
  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    void getEngine()
      .then(async (eng) => {
        if (cancelled || listening.current === eng) return
        listening.current = eng
        await eng.listen(onIncoming)
      })
      .catch(() => undefined) // no line / signed out: outgoing calls show the reason when tried
    return () => {
      cancelled = true
    }
  }, [enabled, getEngine, onIncoming, engineGen])

  const stopIncomingAlerts = (call: IncomingCall): void => (call as IncomingCall & { stopAlerts?: () => void }).stopAlerts?.()

  const answer = (): void => {
    if (!incoming) return
    const { call, caller } = incoming
    stopIncomingAlerts(call)
    setIncoming(null)
    const c = call.accept()
    active.current = c
    const display = caller?.display ?? formatPhone(call.from)
    setSession({ call: { callId: call.callId, to: caller?.number ?? call.from, display, lead: caller?.lead ?? null, prospect: null, record: false, hints: false, demo, conference: false, private: false }, phase: 'live', answeredAt: Date.now(), endedAt: null, muted: false, ended: null, rang: true, direction: 'in', company: caller?.id?.prospect?.name ?? caller?.id?.label?.company ?? null })
    const finish = (): void => {
      active.current = null
      setSession((s) => (s && s.phase !== 'wrapup' ? { ...s, phase: 'wrapup', endedAt: Date.now(), ended: 'answered' } : s))
      setOpen(true)
    }
    c.on('disconnect', finish)
    c.on('cancel', finish)
    c.on('error', (e) => {
      setError(voiceErrorText(e))
      finish()
    })
  }
  const decline = (): void => {
    if (!incoming) return
    stopIncomingAlerts(incoming.call)
    incoming.call.reject()
    setIncoming(null)
  }

  const dial = useCallback(
    async (phone: string, lead?: { id: string; name: string } | null, prospect?: ProspectRef | null) => {
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
        const res = await startCall({ to: phone, leadId: lead?.id ?? null, prospectId: prospect?.id ?? null, private: admin && privateNext })
        setPrivateNext(false)
        if (!res.ok) {
          setError(res.error)
          return
        }
        const call = res.data
        setSession({ call, phase: 'connecting', answeredAt: null, endedAt: null, muted: false, ended: null, rang: false, direction: 'out' })
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
        // Listen-in calls run through a conference room: the app joins the room straight away, so "accepted" only
        // means ringing has started. Whether the client answered comes from the server (their leg's status).
        let watch: number | null = null
        const stopWatch = (): void => {
          if (watch != null) window.clearInterval(watch)
          watch = null
        }
        const finish = (ended: Session['ended']): void => {
          stopWatch()
          active.current = null
          setSession((s) => (s && s.phase !== 'wrapup' ? { ...s, phase: 'wrapup', endedAt: Date.now(), ended: s.answeredAt ? 'answered' : s.rang ? ended : 'failed' } : s))
          setOpen(true)
        }
        c.on('ringing', () => setSession((s) => (s && s.phase === 'connecting' ? { ...s, phase: 'ringing', rang: true } : s)))
        c.on('accept', () => {
          if (!call.conference) return setSession((s) => (s ? { ...s, phase: 'live', answeredAt: Date.now() } : s))
          setSession((s) => (s && s.phase === 'connecting' ? { ...s, phase: 'ringing', rang: true } : s))
          watch = window.setInterval(() => {
            void callProgress(call.callId).then((r) => {
              if (!r.ok || !r.data.answered) return
              stopWatch()
              setSession((s) => (s && s.phase !== 'wrapup' && !s.answeredAt ? { ...s, phase: 'live', answeredAt: Date.now() } : s))
            })
          }, 1000)
        })
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
    [getEngine, resetEngine, session, admin, privateNext],
  )

  const api = useMemo<DialerApi>(
    () => ({
      dial: (p, l, pr) => void dial(p, l, pr),
      open: (t) => {
        if (t) setTab(t)
        setOpen(true)
      },
      text: (p) => {
        setSmsThread(toE164(p) ?? p)
        setTab('messages')
        setOpen(true)
      },
    }),
    [dial],
  )

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

  // A private call has no wrap-up: nothing about it is saved on the CRM (adjusting state during render, not in an effect)
  if (session?.phase === 'wrapup' && session.call.private) {
    setSession(null)
    setTyped('')
    setNotice('Private call ended. It wasn’t recorded or saved to the CRM.')
  }

  const onWrapped = (leadName: string | null, madeLead = false): void => {
    setSession(null)
    setTyped('')
    setNotice(madeLead ? `${leadName ?? 'They'} ${leadName ? 'is' : 'are'} now a lead` : leadName ? `Saved on ${leadName}’s timeline` : 'Call saved')
    router.refresh()
  }

  return (
    <DialerContext.Provider value={enabled ? api : null}>
      {children}
      {enabled && (visible || live) ? (
        <>
      <FloatingButton session={session} now={now} open={open} unread={unread.count} incoming={incoming ? (callerName(incoming.caller) ?? incoming.caller?.display ?? formatPhone(incoming.call.from)) : null} onClick={() => setOpen((o) => !o)} />
      {open ? (
        <div
          role="dialog"
          aria-label="Phone"
          className="fixed inset-x-2 bottom-2 z-[60] flex h-[min(640px,calc(100dvh-1rem))] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-background text-foreground shadow-[0_30px_80px_-20px_rgba(0,0,0,0.45),0_0_0_1px_rgba(0,0,0,0.04)] sm:inset-x-auto sm:bottom-[84px] sm:right-5 sm:h-[min(620px,calc(100dvh-7rem))] sm:w-[372px]"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-1 pt-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold leading-tight tracking-tight">Phone</div>
                <div className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', demo ? 'bg-amber-400' : 'bg-emerald-400')} aria-hidden />
                  {demo ? 'Demo mode · no real calls' : number ? `Ready · ${formatPhone(number)}` : 'Ready'}
                  {demo && !session && !incoming ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const r = await simulateIncomingCall()
                        if (!r.ok) return setError(r.error)
                        window.setTimeout(() => window.dispatchEvent(new CustomEvent('igani:demo-incoming', { detail: r.data })), 600)
                      }}
                      className="ms-1 shrink-0 text-amber-300 underline underline-offset-2 hover:text-amber-200"
                    >
                      Test ring
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
            {admin && !session && !incoming ? (
              <button
                type="button"
                role="switch"
                aria-checked={privateNext}
                aria-label="Private call"
                onClick={() => setPrivateNext((v) => !v)}
                title={privateNext ? 'The next call is private: not recorded, no AI review, not saved to a contact, and only you can see it' : 'Make the next call private (personal use)'}
                className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11.5px] font-medium transition', privateNext ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground')}
              >
                {privateNext ? <Lock className="h-3 w-3" aria-hidden /> : <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />}
                {privateNext ? 'Private' : 'Recorded'}
              </button>
            ) : null}
            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground" aria-label="Close phone">
              <X className="h-4 w-4" />
            </button>
            </div>
          </header>

          {incoming ? (
            <IncomingView caller={incoming.caller} from={incoming.call.from} onAccept={answer} onDecline={decline} />
          ) : session && session.phase !== 'wrapup' ? (
            <InCall session={session} now={now} showPad={showPad} setShowPad={setShowPad} onMute={toggleMute} onHangup={hangup} onDigit={(d) => active.current?.sendDigits(d)} hint={liveHintNow} hintsActive={hintsActive} hintsOn={hintsOn} onToggleHints={() => setHintsOn((v) => { try { localStorage.setItem('igani.liveHints', v ? 'off' : 'on') } catch {} return !v })} />
          ) : session?.phase === 'wrapup' ? (
            <WrapUp session={session} onDone={onWrapped} />
          ) : (
            <>
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
              <AlertPrompt />
              <div className={cn('min-h-0 flex-1', tab === 'messages' ? 'flex flex-col' : 'overflow-y-auto')}>
                {tab === 'messages' ? <Messages thread={smsThread} setThread={setSmsThread} onCall={(p) => void dial(p)} onRead={unread.refresh} /> : null}
                {tab === 'keypad' ? <Keypad value={typed} onChange={setTyped} onCall={(p, lead, prospect) => void dial(p, lead, prospect)} onText={(p) => api.text(p)} /> : null}
                {tab === 'contacts' ? <Contacts onCall={(c) => void dial(c.phone, { id: c.id, name: c.name })} /> : null}
                {tab === 'lists' ? <Lists listId={listId} setListId={setListId} onCall={(p) => void dial(p.phone, null, { id: p.id, name: p.name })} /> : null}
                {tab === 'recent' ? <Recent onCall={(r) => void dial(r.to, r.lead)} /> : null}
              </div>
              <nav className="grid shrink-0 grid-cols-5 border-t border-border/60 px-2 pb-2.5 pt-1.5" aria-label="Phone views">
                {(
                  [
                    ['keypad', 'Keypad', Grid3x3],
                    ['contacts', 'Contacts', Users],
                    ['lists', 'Lists', ListChecks],
                    ['recent', 'Recent', History],
                    ['messages', 'Messages', MessageCircle],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => {
                      // tapping Messages again goes back to the list of conversations
                      if (k === 'messages' && tab === 'messages') setSmsThread(null)
                      setTab(k)
                    }}
                    aria-current={tab === k ? 'page' : undefined}
                    aria-label={k === 'messages' && unread.count ? `Messages, ${unread.count} unread` : undefined}
                    className={cn('relative flex flex-col items-center justify-center gap-1 py-1.5 text-[10.5px] transition', tab === k ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground hover:text-foreground')}
                  >
                    <Icon className="h-[18px] w-[18px]" strokeWidth={tab === k ? 2 : 1.6} aria-hidden /> {label}
                    {k === 'messages' && unread.count ? <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">{unread.count > 99 ? '99+' : unread.count}</span> : null}
                  </button>
                ))}
              </nav>
            </>
          )}
        </div>
      ) : null}
        </>
      ) : null}
    </DialerContext.Provider>
  )
}

function FloatingButton({ session, now, open, unread, incoming, onClick }: { session: Session | null; now: number; open: boolean; unread: number; incoming: string | null; onClick: () => void }): React.ReactElement {
  if (incoming && !open) {
    return (
      <button type="button" onClick={onClick} aria-label={`Incoming call from ${incoming}. Show the phone`} className="call-settle fixed bottom-5 right-5 z-[59] flex h-[52px] items-center gap-3 rounded-full border border-border/70 bg-background pl-2 pr-5 text-sm text-foreground shadow-[0_18px_40px_-16px_rgba(0,0,0,0.45)]">
        <span className="relative flex h-9 w-9 items-center justify-center">
          <span aria-hidden className="call-halo absolute inset-0 rounded-full border border-[#34c759]/60 motion-reduce:hidden" />
          <span className="call-breathe relative flex h-9 w-9 items-center justify-center rounded-full bg-[#34c759] text-white motion-reduce:animate-none">
            <Handset className="h-4 w-4" />
          </span>
        </span>
        <span className="flex max-w-[11rem] flex-col items-start leading-tight">
          <span className="text-[11px] text-muted-foreground">Incoming call</span>
          <span className="truncate font-medium">{incoming}</span>
        </span>
      </button>
    )
  }
  const live = session && session.phase !== 'wrapup'
  if (live) {
    const label = session.phase === 'live' && session.answeredAt ? fmt(now - session.answeredAt) : session.phase === 'ringing' ? 'Ringing…' : 'Calling…'
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`On a call with ${session.call.lead?.name ?? session.call.display}. ${open ? 'Hide' : 'Show'} the phone`}
        className="fixed bottom-5 right-5 z-[59] flex h-[52px] items-center gap-2.5 rounded-2xl border border-white/15 bg-[#16a34a] pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_12px_28px_-10px_rgba(0,0,0,0.8)] transition hover:bg-[#15913f]"
      >
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/60 motion-reduce:hidden" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
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
        'fixed bottom-5 right-5 z-[59] flex h-[52px] w-[52px] items-center justify-center rounded-2xl border text-white shadow-[0_12px_28px_-10px_rgba(0,0,0,0.8)] transition active:scale-95',
        open ? 'border-border bg-muted hover:bg-foreground/[0.07]' : 'border-white/15 bg-primary hover:bg-primary',
      )}
    >
      {open ? <ChevronDown className="h-5 w-5" /> : <Handset className="h-6 w-6" />}
      {session?.phase === 'wrapup' && !open ? (
        <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#020d1a] bg-amber-400" aria-label="Wrap-up waiting" />
      ) : unread && !open ? (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#020d1a] bg-rose-500 px-1 text-[10px] font-bold" aria-label={`${unread} unread texts`}>
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  )
}

/* ───────────────────────── incoming ───────────────────────── */

function IncomingView({ caller, from, onAccept, onDecline }: { caller: IncomingCaller | null; from: string; onAccept: () => void; onDecline: () => void }): React.ReactElement {
  const name = callerName(caller) ?? undefined
  const line = callerLine(caller)
  const display = caller?.display ?? formatPhone(from)
  const delay = (ms: number): React.CSSProperties => ({ animationDelay: `${ms}ms` })
  return (
    <div className="flex flex-1 flex-col items-center px-6 pb-8 pt-9" role="alertdialog" aria-label={`Incoming call from ${name ?? display}`}>
      <div className="call-settle text-[13px] text-muted-foreground" style={delay(0)}>
        Incoming call
      </div>
      <div className="call-settle relative mt-10 flex h-28 w-28 items-center justify-center" style={delay(60)}>
        {/* three soft rings, one after another: a calm, steady ring, never a flash */}
        {[0, 1066, 2133].map((d) => (
          <span key={d} aria-hidden className="call-halo absolute inset-0 rounded-full border border-foreground/25 motion-reduce:hidden" style={delay(d)} />
        ))}
        <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-b from-foreground/[0.07] to-foreground/[0.13] text-[34px] font-light tracking-wide text-foreground ring-1 ring-foreground/10">{initials(name, '#')}</span>
      </div>
      <div className="call-settle mt-8 text-center" style={delay(140)}>
        <div className="text-[28px] font-light leading-tight tracking-tight">{name ?? display}</div>
        {line ? <div className="mt-1 text-sm text-muted-foreground">{line}</div> : null}
        {name ? <div className="mt-1 text-sm tabular-nums text-muted-foreground">{display}</div> : <div className="mt-1 text-sm text-muted-foreground">{caller ? 'Not in the CRM yet' : 'Looking up…'}</div>}
      </div>
      <div className="flex-1" />
      <div className="call-settle flex w-full items-start justify-center gap-16" style={delay(240)}>
        <div className="flex flex-col items-center gap-2.5">
          <button type="button" onClick={onDecline} aria-label="Decline" className="flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#ff3b30] text-white transition hover:brightness-95 active:scale-95">
            <Handset className="h-7 w-7 rotate-[135deg]" />
          </button>
          <span className="text-xs text-muted-foreground">Decline</span>
        </div>
        <div className="flex flex-col items-center gap-2.5">
          <button type="button" onClick={onAccept} autoFocus aria-label="Accept" className="call-breathe flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#34c759] text-white transition hover:brightness-95 active:scale-95 motion-reduce:animate-none">
            <Handset className="h-7 w-7" />
          </button>
          <span className="text-xs text-muted-foreground">Accept</span>
        </div>
      </div>
      <p className="call-settle mt-7 text-center text-[11px] text-muted-foreground/80" style={delay(320)}>
        Declined or unanswered calls go to voicemail, with a “Call back” task for you.
      </p>
    </div>
  )
}

/** One-time prompt so incoming calls also show up as a desktop notification when the CRM tab isn't in front. */
function AlertPrompt(): React.ReactElement | null {
  const [state, setState] = useState<NotificationPermission | 'unsupported' | null>(null)
  useEffect(() => {
    // read on the client only (Notification doesn't exist on the server)
    const id = window.setTimeout(() => setState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission), 0)
    return () => window.clearTimeout(id)
  }, [])
  if (state !== 'default') return null
  return (
    <div className="mx-4 mt-2 flex shrink-0 items-center gap-2 rounded-xl bg-foreground/[0.04] py-1 pl-3 pr-1 text-[11px]">
      <span className="flex-1 truncate text-muted-foreground">Desktop alerts for incoming calls</span>
      <button type="button" onClick={() => void Notification.requestPermission().then(setState)} className="shrink-0 rounded-md bg-primary px-2 py-1 font-semibold text-white hover:bg-primary">
        Turn on
      </button>
    </div>
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

/** The 12 keys. `tones` plays each key's touch-tone (off during a call: the phone line plays its own). */
function KeyGrid({ onKey, onLong, tones = true }: { onKey: (k: string) => void; onLong?: (k: string) => void; tones?: boolean }): React.ReactElement {
  const timer = useRef<number | null>(null)
  const longFired = useRef(false)
  return (
    <div className="grid grid-cols-3 gap-x-8 gap-y-1 px-10">
      {KEYS.map(([k, sub]) => (
        <button
          key={k}
          type="button"
          onPointerDown={() => {
            if (tones) playDtmf(k)
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
          className={cn('mx-auto flex h-[60px] w-[60px] flex-col items-center justify-center rounded-full', KEY)}
        >
          <span className={cn('leading-none text-foreground', k === '*' ? 'text-[30px] font-extralight' : 'text-[30px] font-light')}>{k}</span>
          <span className="mt-1 h-3 text-[9.5px] font-medium tracking-[0.16em] text-muted-foreground">{k === '1' ? <Voicemail className="mx-auto h-3 w-3" strokeWidth={1.8} aria-hidden /> : sub}</span>
        </button>
      ))}
    </div>
  )
}

function Keypad({ value, onChange, onCall, onText }: { value: string; onChange: (v: string) => void; onCall: (phone: string, lead: { id: string; name: string } | null, prospect: ProspectRef | null) => void; onText: (phone: string) => void }): React.ReactElement {
  const input = useRef<HTMLInputElement>(null)
  // the answer for the number on screen (an answer for an earlier number is ignored)
  const [found, setFound] = useState<{ number: string; who: CallerId | null; looking: boolean } | null>(null)
  const e164 = toE164(value)
  const who = found && found.number === e164 ? found.who : null
  const looking = Boolean(found && found.number === e164 && found.looking)

  // Who is this number? A lead (yours, or whose it is), a business on your call lists, else its Google listing
  useEffect(() => {
    if (!e164) return
    let stale = false
    const t = window.setTimeout(async () => {
      const r = await identifyCaller(e164)
      if (stale || !r.ok) return
      // nobody in the CRM has a name for it: ask Google, but only for a complete, callable number
      const ask = Boolean(r.data && !r.data.title && !dialProblem(e164, ['IL', 'US']))
      setFound({ number: e164, who: r.data, looking: ask })
      if (!ask) return
      const g = await identifyCaller(e164, { lookup: true })
      if (!stale) setFound({ number: e164, who: g.ok ? g.data : r.data, looking: false })
    }, 300)
    return () => {
      stale = true
      window.clearTimeout(t)
    }
  }, [e164])
  const blocked = Boolean(who?.lead?.blocked)
  const call = useCallback((): void => {
    if (!e164 || blocked) return
    const lead = who?.lead?.id ? { id: who.lead.id, name: who.title ?? who.display } : null
    onCall(value, lead, !who?.lead && who?.prospect ? { id: who.prospect.id, name: who.prospect.name } : null)
  }, [e164, blocked, who, value, onCall])

  // Typing on the keyboard works anywhere in the panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.target instanceof HTMLElement && e.target !== input.current && /input|textarea|select/i.test(e.target.tagName)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (/^[0-9*#+]$/.test(e.key)) {
        playDtmf(e.key)
        if (document.activeElement !== input.current) {
          e.preventDefault()
          onChange(value + e.key)
        }
      } else if (e.key === 'Backspace' && document.activeElement !== input.current) onChange(value.slice(0, -1))
      else if (e.key === 'Enter') call()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [value, onChange, call])

  return (
    <div className="flex min-h-full flex-col gap-3 pb-4 pt-2">
      <div className="mt-auto px-6 text-center">
        <input
          ref={input}
          value={formatAsTyped(value)}
          onChange={(e) => onChange(e.target.value.replace(/[^\d+*#]/g, ''))}
          inputMode="tel"
          autoComplete="off"
          placeholder="Enter a number"
          aria-label="Phone number"
          className="w-full bg-transparent text-center text-[34px] font-light tabular-nums tracking-wide outline-none placeholder:text-[15px] placeholder:font-normal placeholder:text-muted-foreground/50"
        />
        <div className="mt-1.5 flex min-h-7 items-center justify-center text-xs text-muted-foreground" aria-live="polite">
          {who?.title ? (
            <span className={cn('inline-flex max-w-full items-center gap-2 rounded-2xl border py-1 pl-1 pr-3 text-left text-foreground', blocked ? 'border-rose-500/40 bg-rose-500/10' : 'border-border bg-muted')}>
              <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold', who.lead ? 'bg-muted text-primary' : 'bg-amber-500/15 text-amber-200')}>{initials(who.title, '#')}</span>
              <span className="min-w-0">
                <span className="block truncate font-medium">{who.title}</span>
                {who.subtitle || blocked ? <span className={cn('block truncate text-[11px]', blocked ? 'text-rose-200' : 'text-muted-foreground')}>{blocked ? `${who.lead?.owner ?? 'Another rep'}’s lead · you can’t call it` : who.subtitle}</span> : null}
              </span>
            </span>
          ) : looking ? (
            <span className="animate-pulse">Looking up {formatPhone(e164!)}…</span>
          ) : e164 ? (
            <span>
              {formatPhone(e164)}
              {who ? <span className="text-muted-foreground/70"> · not in the CRM</span> : null}
            </span>
          ) : value.length > 3 ? (
            'Keep typing…'
          ) : (
            ''
          )}
        </div>
      </div>
      <KeyGrid onKey={(k) => onChange(value + k)} onLong={(k) => onChange(value + k)} />
      <div className="mb-auto grid grid-cols-3 items-center px-10 pt-1">
        {e164 && !blocked ? (
          <button type="button" onClick={() => onText(e164)} aria-label="Text this number" title="Send a text" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.06] hover:text-foreground">
            <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.6} />
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          disabled={!e164 || blocked}
          onClick={call}
          aria-label={who?.title ? `Call ${who.title}` : 'Call'}
          className="mx-auto flex h-[66px] w-[66px] items-center justify-center rounded-full bg-[#34c759] text-white shadow-[0_8px_22px_-8px_rgba(52,199,89,0.65)] transition hover:bg-[#2fb551] active:scale-95 disabled:bg-[#34c759]/35 disabled:shadow-none"
        >
          <Handset className="h-7 w-7" />
        </button>
        {value ? (
          <button type="button" onClick={() => onChange(value.slice(0, -1))} onDoubleClick={() => onChange('')} aria-label="Delete digit" className="mx-auto flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition hover:bg-foreground/[0.07] hover:text-foreground">
            <Delete className="h-[22px] w-[22px]" strokeWidth={1.6} />
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
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, company or number" aria-label="Search contacts" className={cn('h-10 pl-9 pr-3', FIELD)} />
      </div>
      {rows === null ? (
        <p className="py-8 text-center text-xs text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{q ? 'No contacts with a phone number match.' : 'No contacts with a phone number yet.'}</p>
      ) : (
        <ul className={cn('min-h-0 overflow-y-auto', LIST)}>
          {rows.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => onCall(c)} className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-foreground/[0.07]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-primary">{initials(c.name, '#')}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{[c.company, c.display].filter(Boolean).join(' · ')}</span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/30 bg-[#16a34a]/15 text-[#4ade80] transition group-hover:bg-[#16a34a] group-hover:text-white">
                  <Handset className="h-4 w-4" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Lists({ listId, setListId, onCall }: { listId: string | null; setListId: (id: string | null) => void; onCall: (p: DialerProspect) => void }): React.ReactElement {
  const [lists, setLists] = useState<DialerList[] | null>(null)
  const [loaded, setLoaded] = useState<{ listId: string; name: string; prospects: DialerProspect[]; done: number } | null>(null)
  // only the open list's own data counts (no flash of the previous list)
  const open = loaded && loaded.listId === listId ? loaded : null
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (listId) return
    void dialerCallLists().then((r) => setLists(r.ok ? r.data : []))
  }, [listId])
  useEffect(() => {
    if (!listId) return
    void dialerProspects(listId).then((r) => {
      if (r.ok) setLoaded({ listId, ...r.data })
      else {
        setError(r.error)
        setListId(null)
      }
    })
  }, [listId, setListId])

  if (listId) {
    if (!open) return <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setListId(null)} aria-label="All call lists" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground transition hover:border-border hover:text-foreground">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1">
            <div dir="auto" className="truncate text-sm font-semibold">{open.name}</div>
            <div className="text-xs text-muted-foreground">
              {open.prospects.length} to call{open.done ? ` · ${open.done} done` : ''}
            </div>
          </div>
          <a href={`/sales/call-lists/${listId}`} className="shrink-0 text-xs text-primary hover:underline">
            Open list
          </a>
        </div>
        {open.prospects.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <Check className="h-6 w-6 text-emerald-400" aria-hidden />
            <p className="text-sm text-muted-foreground">Everyone on this list has been called.</p>
          </div>
        ) : (
          <ul className={cn('min-h-0 overflow-y-auto', LIST)}>
            {open.prospects.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onCall(p)} className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-foreground/[0.07]">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-primary">{initials(p.name, '#')}</span>
                  <span className="min-w-0 flex-1">
                    <span dir="auto" className="block truncate text-sm font-medium">{p.name}</span>
                    {p.askFor ? <span dir="auto" className="block truncate text-xs text-primary">Ask for {p.askFor}</span> : null}
                    <span className="block truncate text-xs text-muted-foreground">
                      {[p.status === 'CALLBACK' ? 'Call back' : null, p.attempts ? `Tried ${p.attempts}×` : null, p.category, p.display, p.otherPhones.length ? `+${p.otherPhones.length} more number${p.otherPhones.length === 1 ? '' : 's'}` : null].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/30 bg-[#16a34a]/15 text-[#4ade80] transition group-hover:bg-[#16a34a] group-hover:text-white">
                    <Handset className="h-4 w-4" />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  if (lists === null) return <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p>
  return (
    <div className="flex h-full flex-col gap-3 p-4">
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      {lists.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
          <ListChecks className="h-6 w-6 text-muted-foreground" aria-hidden />
          <p className="text-sm text-muted-foreground">No call lists yet.</p>
          <p className="text-xs text-muted-foreground">
            Leads → <span className="text-foreground">Find businesses</span> to make one.
          </p>
        </div>
      ) : (
        <ul className={cn('min-h-0 overflow-y-auto', LIST)}>
          {lists.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => setListId(l.id)} className="flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-foreground/[0.07]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary">
                  <ListChecks className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span dir="auto" className="block truncate text-sm font-medium">{l.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {l.toCall ? `${l.toCall} to call` : 'All called'} · {l.total} total{l.owner ? ` · ${l.owner}` : ''}
                  </span>
                </span>
                {l.toCall ? <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold tabular-nums text-white">{l.toCall}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const OUTCOME_LABEL = Object.fromEntries([...OUTCOMES, ...PROSPECT_OUTCOMES].map((o) => [o.key, o.label]))
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
  if (!rows.length)
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center">
        <History className="h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">Your calls will show up here.</p>
      </div>
    )
  return (
    <div className="h-full p-4">
    <ul className={cn('max-h-full overflow-y-auto', LIST)}>
      {rows.map((r) => {
        const missed = r.status !== 'COMPLETED' && !r.live
        return (
          <li key={r.id} className="group flex items-center gap-3 px-3 py-2.5 transition hover:bg-foreground/[0.07]">
            <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full border', missed ? 'border-rose-500/30 bg-rose-500/10 text-rose-400' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400')}>
              <ArrowUpRight className="h-4 w-4" aria-label="Outgoing" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                <a href={`/sales/calls/${r.id}`} className="hover:underline">
                  {r.lead?.name ?? r.display}
                </a>
                {r.private ? <Lock className="ms-1.5 inline h-3 w-3 align-[-1px] text-muted-foreground" aria-label="Private call" /> : null}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {r.outcome ? OUTCOME_LABEL[r.outcome] : r.live ? 'In progress' : r.status === 'COMPLETED' ? 'Connected' : r.status.replace('_', ' ').toLowerCase()}
                {r.durationSec ? ` · ${fmt(r.durationSec * 1000)}` : ''} · {timeAgo(r.startedAt)}
              </span>
            </span>
            <button type="button" onClick={() => onCall(r)} aria-label={`Call ${r.lead?.name ?? r.display} again`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/30 bg-[#16a34a]/15 text-[#4ade80] transition hover:bg-[#16a34a] hover:text-white">
              <Handset className="h-4 w-4" />
            </button>
          </li>
        )
      })}
    </ul>
    </div>
  )
}

/* ───────────────────────── in call ───────────────────────── */

function InCall({ session, now, showPad, setShowPad, onMute, onHangup, onDigit, hint, hintsActive, hintsOn, onToggleHints }: { session: Session; now: number; showPad: boolean; setShowPad: (v: boolean) => void; onMute: () => void; onHangup: () => void; onDigit: (d: string) => void; hint: LiveHint | null; hintsActive: boolean; hintsOn: boolean; onToggleHints: () => void }): React.ReactElement {
  const { call, phase } = session
  const name = call.lead?.name ?? call.prospect?.name
  const [tones, setTones] = useState('')
  const [acting, setActing] = useState(false)
  const actionsFor = phase === 'live' && call.lead && !call.private ? call.lead : null
  const compact = acting && !showPad
  const status = phase === 'connecting' ? 'Calling…' : phase === 'ringing' ? 'Ringing…' : session.answeredAt ? fmt(now - session.answeredAt) : ''
  return (
    <div className={cn('flex min-h-0 flex-1 flex-col items-center overflow-y-auto px-6 pb-7', compact ? 'gap-3 pt-4' : 'gap-6 pt-8')}>
      <div className={cn('relative items-center justify-center', compact ? 'hidden' : 'flex h-24 w-24')}>
        {phase !== 'live' ? (
          <>
            <span className="absolute -inset-3 animate-ping rounded-full border-2 border-primary/40 motion-reduce:hidden" />
            <span className="absolute -inset-3 rounded-full border border-border" />
          </>
        ) : null}
        <span className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-border bg-muted text-2xl font-semibold text-white">{initials(name, '#')}</span>
      </div>
      <div className="text-center">
        {session.direction === 'in' ? <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Incoming call</div> : null}
        <div className="text-xl font-semibold">{name ?? call.display}</div>
        {name ? <div className="text-sm text-muted-foreground">{call.display}</div> : null}
        {call.prospect?.askFor ? (
          <div dir="auto" className="mt-2 inline-flex rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs text-primary">
            Ask for {call.prospect.askFor}
          </div>
        ) : null}
        <div className={cn('mt-2 text-sm tabular-nums', phase === 'live' ? 'text-emerald-400' : 'text-muted-foreground')} aria-live="polite">
          {status}
        </div>
        {call.private ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-foreground/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            <Lock className="h-3 w-3" aria-hidden /> Private call · not recorded
          </div>
        ) : null}
        {call.record && phase === 'live' ? (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-rose-300">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Recording
          </div>
        ) : null}
        {call.demo ? <div className="mt-2 text-[11px] text-amber-300">Demo call: nobody is actually being called</div> : null}
      </div>

      {session.direction === 'out' && session.call.hints && phase === 'live' ? (
        <div className="w-full">
          <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>Call coach {hintsOn && hintsActive ? '· listening' : ''}</span>
            <button type="button" onClick={onToggleHints} className="rounded px-1.5 py-0.5 normal-case tracking-normal hover:bg-white/10" aria-pressed={hintsOn}>
              {hintsOn ? 'Turn off' : 'Turn on'}
            </button>
          </div>
          {hintsOn ? (
            <div aria-live="polite" className={cn('mt-1.5 min-h-[3.25rem] rounded-xl border px-3 py-2.5 text-sm', hint ? (hint.tone === 'warn' ? 'border-amber-400/50 bg-amber-500/15 text-amber-100' : hint.tone === 'good' ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-100' : 'border-primary bg-primary/20 text-white') : 'border-border bg-muted text-muted-foreground')}>
              {hint ? (
                <>
                  <span dir="auto" className="font-medium">{hint.text}</span>
                  {hint.step ? <span className="ml-2 text-[10px] uppercase tracking-wider opacity-70">{hint.step}</span> : null}
                </>
              ) : (
                'Hints appear here as you talk. Audio is analysed live and not stored.'
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {showPad ? (
        <div className="w-full">
          <div className="mb-3 h-6 text-center text-lg tabular-nums tracking-widest">{tones}</div>
          <KeyGrid
            tones={false}
            onKey={(k) => {
              setTones((t) => (t + k).slice(-16))
              onDigit(k)
            }}
          />
        </div>
      ) : (
        <div className="flex w-full flex-1 flex-col justify-end">{actionsFor ? <CallActions lead={actionsFor} onOpenChange={setActing} /> : null}</div>
      )}

      <div className="flex items-center justify-center gap-6">
        <RoundAction label={session.muted ? 'Unmute' : 'Mute'} active={session.muted} onClick={onMute} disabled={phase !== 'live'}>
          {session.muted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </RoundAction>
        <button type="button" onClick={onHangup} aria-label="Hang up" className="flex h-16 w-16 items-center justify-center rounded-full border border-[#f87171]/40 bg-[#dc2626] text-white shadow-[0_10px_24px_-10px_rgba(220,38,38,0.9)] transition hover:bg-[#c41f1f] active:scale-95">
          <Handset className="h-7 w-7 rotate-[135deg]" />
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
      <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} aria-label={label} className={cn('flex h-12 w-12 items-center justify-center rounded-full border transition disabled:opacity-40', active ? 'border-white bg-white text-background' : 'border-border bg-muted hover:border-border hover:bg-foreground/[0.07]')}>
        {children}
      </button>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  )
}

/* ───────────────────────── wrap-up ───────────────────────── */

function WrapUp({ session, onDone }: { session: Session; onDone: (leadName: string | null, madeLead?: boolean) => void }): React.ReactElement {
  const answered = session.ended === 'answered'
  const talked = answered && session.answeredAt && session.endedAt ? session.endedAt - session.answeredAt : 0
  const prospect = session.call.prospect
  const choices = OUTCOMES
  // A list call that was answered needs a real answer (did it go well?), so nothing is picked for you.
  const [outcome, setOutcome] = useState<string | null>(answered ? 'connected' : session.ended === 'busy' ? 'busy' : 'no_answer')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lead = session.call.lead
  // put a name to the number: who they actually spoke with (a business number reaches a person)
  const [firstName, setFirstName] = useState(lead?.firstName ?? '')
  const [lastName, setLastName] = useState(lead?.lastName ?? '')
  const [company, setCompany] = useState(lead?.company ?? session.company ?? '')
  const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ') || lead?.name || prospect?.name || null
  const save = async (): Promise<void> => {
    if (!outcome) return setError('Pick how it went.')
    setSaving(true)
    setError(null)
    const contact = answered ? { firstName: firstName.trim() || undefined, lastName: lastName.trim() || undefined, company: company.trim() || undefined } : undefined
    const r = await saveCallWrapUp({ callId: session.call.callId, outcome: outcome as never, notes: notes.trim() || undefined, contact })
    setSaving(false)
    if (!r.ok) return setError(r.error)
    onDone(name, r.data.madeLead || (prospect !== null && outcome === 'interested'))
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
          {choices.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setOutcome(o.key)}
              aria-pressed={outcome === o.key}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                outcome === o.key
                  ? o.key === 'interested'
                    ? 'border-emerald-400/60 bg-emerald-600 text-white'
                    : 'border-primary bg-primary text-white'
                  : o.key === 'interested'
                    ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/70'
                    : 'border-border bg-muted hover:border-border',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </fieldset>
      {answered ? (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            Who did you speak with?{' '}
            {!lead?.firstName && !lead?.lastName ? <span className="font-normal text-amber-200/90">Add their name</span> : null}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} maxLength={100} placeholder="First name" aria-label="First name" autoComplete="off" className={cn('px-3 py-2', FIELD)} />
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} maxLength={100} placeholder="Last name" aria-label="Last name" autoComplete="off" className={cn('px-3 py-2', FIELD)} />
            <input value={company} onChange={(e) => setCompany(e.target.value)} maxLength={200} placeholder="Company" aria-label="Company" autoComplete="off" className={cn('col-span-2 px-3 py-2', FIELD)} />
          </div>
          {!lead ? <p className="mt-1.5 text-[11px] text-muted-foreground">Add a name and they’re saved as your contact.</p> : null}
        </fieldset>
      ) : null}
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">
          Note{' '}
          <span className="font-normal text-muted-foreground">(goes on {name ?? 'the lead'}’s timeline)</span>
        </span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} maxLength={2000} placeholder="What did you agree? What’s next?" className={cn('resize-none px-3 py-2', FIELD)} />
      </label>
      <p className="text-xs text-muted-foreground">{name ? `${name} is a lead assigned to you. This result becomes their status.` : 'This result becomes the lead’s status.'}</p>
      {error ? <p className="text-xs text-rose-300">{error}</p> : null}
      <div className="mt-auto flex gap-2">
        <button type="button" onClick={() => void save()} disabled={saving} className="flex-1 rounded-xl border border-white/10 bg-primary py-3 text-sm font-semibold text-white transition hover:bg-primary disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

/* ───────────────────────── click-to-call ───────────────────────── */

/** A phone number that opens the CRM dialer (or the device's phone app when the dialer isn't available). */
export function CallLink({ phone, lead, prospect, className, children }: { phone: string; lead?: { id: string; name: string }; prospect?: ProspectRef; className?: string; children?: React.ReactNode }): React.ReactElement {
  const dialer = useDialer()
  return (
    <a
      href={`tel:${phone}`}
      className={className}
      onClick={(e) => {
        if (!dialer) return
        e.preventDefault()
        dialer.dial(phone, lead ?? null, prospect ?? null)
      }}
    >
      {children ?? phone}
    </a>
  )
}
