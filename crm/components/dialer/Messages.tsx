'use client'

import { ArrowUp, ChevronLeft, MessageSquarePlus, Paperclip, Search } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { sendText, smsConversation, smsThreads, type SmsBubble, type SmsConversation, type SmsThread } from '@/app/actions/sms'
import { formatAsTyped, formatPhone, toE164 } from '@/lib/phone-numbers'
import { SMS_MAX, SMS_STATUS_LABEL, smsSegments } from '@/lib/sms-core'
import { cn } from '@/lib/utils'

const initials = (name: string | null | undefined): string =>
  (name ?? '')
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]!.toUpperCase())
    .join('') || '#'

const clock = (iso: string): string => new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

/** "14:05" today, "Yesterday", weekday this week, else the date. */
function when(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((new Date(now.toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (days <= 0) return clock(iso)
  if (days === 1) return 'Yesterday'
  if (days < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { day: 'numeric', month: 'short' })
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const days = Math.floor((new Date(new Date().toDateString()).getTime() - new Date(d.toDateString()).getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return d.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })
}

/** Refresh while the tab is in front (paused in a background tab). */
function usePoll(fn: () => void, ms: number): void {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  useEffect(() => {
    const tick = (): void => {
      if (document.visibilityState === 'visible') ref.current()
    }
    const t = window.setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [ms])
}

/** The Messages tab: your conversations, or one conversation. */
export function Messages({ thread, setThread, onCall, onRead }: { thread: string | null; setThread: (n: string | null) => void; onCall: (phone: string) => void; onRead: () => void }): React.ReactElement {
  if (thread === '') return <NewMessage onOpen={setThread} onBack={() => setThread(null)} />
  if (thread) return <Conversation key={thread} number={thread} onBack={() => setThread(null)} onCall={onCall} onRead={onRead} />
  return <Threads onOpen={setThread} />
}

function Threads({ onOpen }: { onOpen: (n: string) => void }): React.ReactElement {
  const [rows, setRows] = useState<SmsThread[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const load = useCallback(async () => {
    const r = await smsThreads()
    if (r.ok) setRows(r.data)
    else setError(r.error)
  }, [])
  useEffect(() => {
    void load()
  }, [load])
  usePoll(() => void load(), 10_000)
  const needle = q.trim().toLowerCase()
  const digits = q.replace(/\D/g, '')
  const shown = (rows ?? []).filter((t) => !needle || t.name?.toLowerCase().includes(needle) || (digits.length >= 3 && t.number.replace(/\D/g, '').includes(digits)) || t.last.body.toLowerCase().includes(needle))
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 px-4 pb-2 pt-3">
        <label className="flex h-9 flex-1 items-center gap-2 rounded-xl border border-[#2b4060] bg-[#0b1728] px-3 text-sm focus-within:border-[#4a7bd0]">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search messages" aria-label="Search messages" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground/70" />
        </label>
        <button type="button" onClick={() => onOpen('')} aria-label="New message" title="New message" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#2b4263] bg-[#172b47] text-[#9cc0ff] transition hover:border-[#3a5884] hover:text-white">
          <MessageSquarePlus className="h-4 w-4" />
        </button>
      </div>
      {error ? <p className="px-5 py-3 text-xs text-rose-300">{error}</p> : null}
      {rows === null && !error ? (
        <div className="space-y-1 px-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-[#172b47]" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 animate-pulse rounded bg-[#172b47]" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-[#132540]" />
              </div>
            </div>
          ))}
        </div>
      ) : rows && rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-8 pb-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#2b4263] bg-[#132540] text-[#8fb5ff]">
            <MessageSquarePlus className="h-6 w-6" />
          </span>
          <p className="mt-4 font-medium">No texts yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Texts to your number show up here. Start one with the button above.</p>
        </div>
      ) : (
        <ul className="px-2 pb-3">
          {shown.map((t) => (
            <li key={t.number}>
              <button type="button" onClick={() => onOpen(t.number)} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[#132540]">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold', t.leadId ? 'bg-[#1d3354] text-[#9cc0ff]' : 'bg-[#1a2a40] text-[#8ea3c0]')}>{initials(t.name)}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={cn('min-w-0 flex-1 truncate text-sm', t.unread ? 'font-semibold text-white' : 'font-medium')}>{t.name ?? t.display}</span>
                    <span className={cn('shrink-0 text-[11px]', t.unread ? 'font-semibold text-[#8fb5ff]' : 'text-muted-foreground')}>{when(t.last.at)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={cn('min-w-0 flex-1 truncate text-xs', t.unread ? 'text-foreground' : 'text-muted-foreground')}>
                      {t.last.direction === 'OUTBOUND' ? <span className="text-muted-foreground">You: </span> : null}
                      {t.last.body || (t.last.media ? 'Picture or file' : '')}
                      {t.last.direction === 'OUTBOUND' && t.last.status === 'failed' ? <span className="text-rose-300"> · Not sent</span> : null}
                    </span>
                    {t.unread ? <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#3b78db] px-1.5 text-[10px] font-bold text-white">{t.unread}</span> : null}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {rows && rows.length > 0 && shown.length === 0 ? <li className="px-4 py-6 text-center text-xs text-muted-foreground">Nothing matches “{q}”.</li> : null}
        </ul>
      )}
    </div>
  )
}

function NewMessage({ onOpen, onBack }: { onOpen: (n: string) => void; onBack: () => void }): React.ReactElement {
  const [value, setValue] = useState('')
  const e164 = toE164(value)
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-[#22344f] px-3 py-2.5">
        <button type="button" onClick={onBack} aria-label="Back to messages" className="flex h-8 w-8 items-center justify-center rounded-lg text-[#8fb5ff] hover:bg-[#172b47]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="font-semibold">New message</span>
      </div>
      <form
        className="px-4 py-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (e164) onOpen(e164)
        }}
      >
        <label className="flex items-center gap-2 rounded-xl border border-[#2b4060] bg-[#0b1728] px-3 py-2.5 text-sm focus-within:border-[#4a7bd0]">
          <span className="text-muted-foreground">To:</span>
          <input value={formatAsTyped(value)} onChange={(e) => setValue(e.target.value.replace(/[^\d+]/g, ''))} inputMode="tel" autoFocus autoComplete="off" placeholder="Phone number" aria-label="Phone number" className="min-w-0 flex-1 bg-transparent tabular-nums outline-none placeholder:text-muted-foreground/70" />
        </label>
        <button type="submit" disabled={!e164} className="mt-3 w-full rounded-xl border border-white/10 bg-[#3b78db] py-2.5 text-sm font-semibold text-white transition hover:bg-[#4685e6] disabled:border-[#2b4263] disabled:bg-[#172b47] disabled:text-[#5d7392]">
          {e164 ? `Text ${formatPhone(e164)}` : 'Enter a number'}
        </button>
      </form>
    </div>
  )
}

function Conversation({ number, onBack, onCall, onRead }: { number: string; onBack: () => void; onCall: (phone: string) => void; onRead: () => void }): React.ReactElement {
  const [conv, setConv] = useState<SmsConversation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [pending, setPending] = useState<SmsBubble[]>([])
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)
  const stick = useRef(true)

  const load = useCallback(async () => {
    const r = await smsConversation(number)
    if (!r.ok) return setError(r.error)
    setConv(r.data)
    onRead()
  }, [number, onRead])
  useEffect(() => {
    void load()
  }, [load])
  usePoll(() => void load(), 4000)

  const messages = [...(conv?.messages ?? []), ...pending]
  // stay at the bottom as messages arrive, unless the reader scrolled up
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages.length])
  // the box grows with the message (up to a few lines)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [draft])

  const send = async (): Promise<void> => {
    const body = draft.trim()
    if (!body || sending || conv?.blocked) return
    setSending(true)
    setError(null)
    const temp: SmsBubble = { id: `tmp-${Date.now()}`, direction: 'OUTBOUND', body, media: 0, status: 'sending', error: null, at: new Date().toISOString() }
    setPending((p) => [...p, temp])
    setDraft('')
    stick.current = true
    const r = await sendText({ to: number, body })
    setSending(false)
    if (!r.ok) {
      setPending((p) => p.filter((m) => m.id !== temp.id))
      setDraft(body)
      return setError(r.error)
    }
    await load()
    setPending((p) => p.filter((m) => m.id !== temp.id))
    box.current?.focus()
  }

  const seg = smsSegments(draft)
  const lastOut = [...messages].reverse().find((m) => m.direction === 'OUTBOUND')
  const name = conv?.name ?? null
  const display = conv?.display ?? formatPhone(number)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-[#22344f] px-3 py-2">
        <button type="button" onClick={onBack} aria-label="Back to messages" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[#8fb5ff] hover:bg-[#172b47]">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1d3354] text-xs font-semibold text-[#9cc0ff]">{initials(name)}</span>
        <div className="min-w-0 flex-1">
          {conv?.leadId ? (
            <Link href={`/sales/leads/${conv.leadId}`} className="block truncate text-sm font-semibold hover:underline">
              {name ?? display}
            </Link>
          ) : (
            <div className="truncate text-sm font-semibold">{name ?? display}</div>
          )}
          <div className="truncate text-[11px] text-muted-foreground">{name ? [display, conv?.subtitle].filter(Boolean).join(' · ') : (conv?.subtitle ?? 'Not in the CRM')}</div>
        </div>
        <button type="button" onClick={() => onCall(number)} disabled={Boolean(conv?.blocked)} aria-label={`Call ${name ?? display}`} title="Call" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#22c55e]/40 bg-[#16a34a]/15 text-[#4ade80] transition hover:bg-[#16a34a]/30 disabled:opacity-40">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" />
          </svg>
        </button>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60
        }}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        aria-live="polite"
      >
        {conv === null && !error ? <p className="py-10 text-center text-xs text-muted-foreground">Loading…</p> : null}
        {conv && messages.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">No messages yet. Say hello.</p> : null}
        {messages.map((m, i) => {
          const prev = messages[i - 1]
          const next = messages[i + 1]
          const newDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString()
          const gap = (a?: SmsBubble, b?: SmsBubble): boolean => !a || !b || a.direction !== b.direction || new Date(b.at).getTime() - new Date(a.at).getTime() > 5 * 60_000
          const first = newDay || gap(prev, m)
          const last = gap(m, next) || (next && new Date(next.at).toDateString() !== new Date(m.at).toDateString())
          const out = m.direction === 'OUTBOUND'
          const failed = m.status === 'failed' || m.status === 'undelivered'
          return (
            <div key={m.id}>
              {newDay ? <div className="my-3 text-center text-[11px] font-medium text-muted-foreground">{dayLabel(m.at)}</div> : null}
              <div className={cn('flex', out ? 'justify-end' : 'justify-start', first ? 'mt-2' : 'mt-0.5')}>
                <div
                  className={cn(
                    'max-w-[78%] whitespace-pre-wrap break-words px-3.5 py-2 text-[14px] leading-snug',
                    out ? 'rounded-[18px] bg-[#3b78db] text-white' : 'rounded-[18px] bg-[#1d3354] text-[#e6eefc]',
                    out && !last && 'rounded-br-[6px]',
                    out && !first && 'rounded-tr-[6px]',
                    !out && !last && 'rounded-bl-[6px]',
                    !out && !first && 'rounded-tl-[6px]',
                    out && last && 'rounded-br-[6px]',
                    !out && last && 'rounded-bl-[6px]',
                    failed && 'bg-rose-600/80 ring-1 ring-rose-400/60',
                    m.status === 'sending' && 'opacity-70',
                  )}
                  dir="auto"
                >
                  {m.body}
                  {m.media ? (
                    <span className={cn('mt-1 flex items-center gap-1 text-xs', m.body ? 'opacity-80' : '')}>
                      <Paperclip className="h-3 w-3" aria-hidden /> {m.media === 1 ? 'Picture or file' : `${m.media} pictures or files`} (open in Twilio)
                    </span>
                  ) : null}
                </div>
              </div>
              {last ? (
                <div className={cn('mt-1 px-1 text-[10px]', out ? 'text-right' : 'text-left', failed ? 'text-rose-300' : 'text-muted-foreground')}>
                  {clock(m.at)}
                  {out && (failed || m === lastOut) ? ` · ${SMS_STATUS_LABEL[m.status] ?? m.status}` : ''}
                  {failed && m.error ? <span className="block">{m.error}</span> : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {error ? <p className="mx-3 mb-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs text-rose-200 ring-1 ring-rose-500/25">{error}</p> : null}
      {conv?.blocked ? (
        <p className="shrink-0 border-t border-[#22344f] px-4 py-3 text-center text-xs text-muted-foreground">This number is {conv.blocked}’s lead, so you can’t text it.</p>
      ) : (
        <form
          className="shrink-0 border-t border-[#22344f] bg-[#0b1728] px-3 py-2.5"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={box}
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, SMS_MAX))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  void send()
                }
              }}
              rows={1}
              dir="auto"
              placeholder="Text message"
              aria-label="Text message"
              className="max-h-[120px] min-h-[38px] flex-1 resize-none rounded-[19px] border border-[#2b4060] bg-[#0f1d31] px-4 py-2 text-[14px] leading-snug outline-none transition placeholder:text-muted-foreground/70 focus:border-[#4a7bd0]"
            />
            <button type="submit" disabled={!draft.trim() || sending} aria-label="Send" className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#3b78db] text-white transition hover:bg-[#4685e6] disabled:bg-[#172b47] disabled:text-[#5d7392]">
              <ArrowUp className="h-[18px] w-[18px]" strokeWidth={2.5} />
            </button>
          </div>
          {seg.segments > 1 || draft.length > 120 ? (
            <div className="mt-1 px-2 text-right text-[10px] text-muted-foreground">
              {seg.segments} SMS{seg.unicode ? ' · Hebrew/emoji: 70 per SMS' : ''}
            </div>
          ) : null}
        </form>
      )}
    </div>
  )
}
