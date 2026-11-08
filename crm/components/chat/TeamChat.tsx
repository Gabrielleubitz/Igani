'use client'

import { ArrowLeft, Archive, Check, Hash, Lock, LogOut, Pencil, Plus, Search, SendHorizontal, SmilePlus, Trash2, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  chatAddMembers,
  chatArchiveChannel,
  chatCreateChannel,
  chatDelete,
  chatEdit,
  chatJoin,
  chatLeave,
  chatMarkRead,
  chatMessages,
  chatOpenDm,
  chatOverview,
  chatReact,
  chatSend,
  chatUpdateChannel,
  type ChatChannelInfo,
  type ChatChannelRow,
  type ChatMessageRow,
  type ChatOverview,
} from '@/app/actions/chat'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Input, Label } from '@/components/ui/input'
import type { ChatPerson } from '@/lib/chat'
import { cn } from '@/lib/utils'

const EMOJI = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏'] as const
const POLL_MS = 2500
const LIST_MS = 8000

type Pending = ChatMessageRow & { pending?: boolean; failed?: boolean }

/* ---------- small pieces ---------- */

function Avatar({ name, photo, size = 36, className }: { name: string; photo: string | null; size?: number; className?: string }): React.ReactElement {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  return (
    <span aria-hidden className={cn('relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary/15 font-semibold text-primary ring-1 ring-border', className)} style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {initials || '?'}
      {/* eslint-disable-next-line @next/next/no-img-element -- our cached avatar */}
      {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
    </span>
  )
}

const dayLabel = (d: Date): string => {
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}
const timeLabel = (d: Date): string => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** Message text: mentions as chips, links clickable, line breaks kept. */
function Body({ text, people, meId }: { text: string; people: Map<string, ChatPerson>; meId: string }): React.ReactElement {
  const parts = text.split(/(<@[a-z0-9]{20,40}>|https?:\/\/[^\s<]+)/gi)
  return (
    <div className="whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground/95">
      {parts.map((p, i) => {
        const m = p.match(/^<@([a-z0-9]{20,40})>$/i)
        if (m) {
          const who = people.get(m[1]!)
          return (
            <span key={i} className={cn('rounded px-1 py-px font-medium', m[1] === meId ? 'bg-amber-400/20 text-amber-200' : 'bg-primary/15 text-primary')}>
              @{who?.name ?? 'someone'}
            </span>
          )
        }
        if (/^https?:\/\//i.test(p))
          return (
            <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
              {p}
            </a>
          )
        return <span key={i}>{p}</span>
      })}
    </div>
  )
}

/** Plain text for the composer from stored mentions, and back. */
const toDisplay = (body: string, people: Map<string, ChatPerson>): string => body.replace(/<@([a-z0-9]{20,40})>/gi, (_, id: string) => `@${people.get(id)?.name ?? 'someone'}`)
function toStored(text: string, people: ChatPerson[]): string {
  let out = text
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`@${esc}(?![\\p{L}\\p{N}])`, 'giu'), `<@${p.id}>`)
  }
  return out
}

/* ---------- sidebar ---------- */

function ChannelLink({ c, active, onOpen }: { c: ChatChannelRow; active: boolean; onOpen: () => void }): React.ReactElement {
  const bold = c.unread > 0
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-[14px] transition-colors',
        active ? 'bg-primary/15 text-foreground' : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
        bold && !active && 'font-semibold text-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {c.kind === 'DM' ? (
        <Avatar name={c.name} photo={c.dm?.photo ?? null} size={20} className="rounded-md" />
      ) : c.private ? (
        <Lock className="h-[15px] w-[15px] shrink-0 opacity-70" aria-hidden />
      ) : (
        <Hash className="h-[15px] w-[15px] shrink-0 opacity-70" aria-hidden />
      )}
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      {c.mentions > 0 ? (
        <span className="min-w-[20px] rounded-full bg-rose-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{c.mentions}</span>
      ) : c.unread > 0 ? (
        <span className="h-2 w-2 shrink-0 rounded-full bg-foreground/70" aria-label={`${c.unread} unread`} />
      ) : null}
    </button>
  )
}

/* ---------- main ---------- */

export function TeamChat({ initial, initialChannelId }: { initial: ChatOverview; initialChannelId: string | null }): React.ReactElement {
  const [overview, setOverview] = useState(initial)
  const [channelId, setChannelId] = useState<string | null>(initialChannelId)
  const openRef = useRef<string | null>(initialChannelId)
  useEffect(() => {
    openRef.current = channelId
  }, [channelId])
  const [info, setInfo] = useState<ChatChannelInfo | null>(null)
  const [messages, setMessages] = useState<Pending[]>([])
  const [more, setMore] = useState(false)
  const [readBy, setReadBy] = useState<{ userId: string; at: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState('')
  const [dialog, setDialog] = useState<null | 'channel' | 'dm' | 'add' | 'topic'>(null)
  const cursor = useRef<string | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const frame = useRef<HTMLDivElement>(null)
  const me = overview.me
  const peopleBy = useMemo(() => new Map(overview.people.map((p) => [p.id, p])), [overview.people])

  const refreshList = useCallback(async () => {
    const r = await chatOverview()
    if (r.ok) setOverview({ ...r.data, channels: r.data.channels.map((c) => (c.id === openRef.current ? { ...c, unread: 0, mentions: 0 } : c)) })
  }, [])

  // open a channel: first page, then poll for changes
  const open = useCallback(async (id: string) => {
    setChannelId(id)
    if (!window.matchMedia('(min-width: 640px)').matches) frame.current?.scrollIntoView({ block: 'start' })
    setLoading(true)
    setError(null)
    stick.current = true
    const url = new URL(window.location.href)
    url.searchParams.set('c', id)
    window.history.replaceState(null, '', url)
    const r = await chatMessages({ channelId: id })
    setLoading(false)
    if (!r.ok) {
      setError(r.error)
      setInfo(null)
      setMessages([])
      return
    }
    setInfo(r.data.channel)
    setMessages(r.data.messages)
    setReadBy(r.data.readBy)
    setMore(r.data.more)
    cursor.current = r.data.cursor
    void chatMarkRead(id).then(() => setOverview((o) => ({ ...o, channels: o.channels.map((c) => (c.id === id ? { ...c, unread: 0, mentions: 0 } : c)) })))
  }, [])

  useEffect(() => {
    const first = initialChannelId ?? initial.channels.find((c) => c.kind === 'CHANNEL' && c.name === 'general')?.id ?? initial.channels[0]?.id ?? null
    // on phones the list shows first unless a channel was linked
    if (first && (initialChannelId || window.matchMedia('(min-width: 768px)').matches)) void open(first)
  }, [initial.channels, initialChannelId, open])

  // poll the open channel
  useEffect(() => {
    if (!channelId) return
    let stop = false
    const tick = async (): Promise<void> => {
      if (stop || document.hidden || !cursor.current) return
      const r = await chatMessages({ channelId, since: cursor.current })
      if (stop || !r.ok) return
      cursor.current = r.data.cursor
      setInfo(r.data.channel)
      setReadBy(r.data.readBy)
      if (r.data.messages.length) {
        let fresh = false
        setMessages((list) => {
          const next = [...list]
          for (const m of r.data.messages) {
            const i = next.findIndex((x) => x.id === m.id)
            if (i >= 0) next[i] = m
            else {
              next.push(m)
              fresh = true
            }
          }
          return next.sort((a, b) => a.at.localeCompare(b.at))
        })
        if (fresh) {
          void chatMarkRead(channelId)
          setOverview((o) => ({ ...o, channels: o.channels.map((c) => (c.id === channelId ? { ...c, unread: 0, mentions: 0 } : c)) }))
        }
      }
    }
    const t = window.setInterval(() => void tick(), POLL_MS)
    const onVis = (): void => void (!document.hidden && tick())
    document.addEventListener('visibilitychange', onVis)
    return () => {
      stop = true
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [channelId])

  // unread counts for the other channels
  useEffect(() => {
    const t = window.setInterval(() => void (!document.hidden && refreshList()), LIST_MS)
    return () => window.clearInterval(t)
  }, [refreshList])

  // keep the view at the bottom while you're there
  useLayoutEffect(() => {
    const el = scroller.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [messages, channelId])

  const loadOlder = async (): Promise<void> => {
    if (!channelId || !messages[0]) return
    const el = scroller.current
    const before = el?.scrollHeight ?? 0
    const r = await chatMessages({ channelId, before: messages[0].at })
    if (!r.ok) return
    stick.current = false
    setMessages((list) => [...r.data.messages, ...list])
    setMore(r.data.more)
    requestAnimationFrame(() => {
      if (el) el.scrollTop = el.scrollHeight - before
    })
  }

  const send = async (text: string): Promise<boolean> => {
    if (!channelId) return false
    const body = toStored(text.trim(), overview.people)
    if (!body) return false
    const temp: Pending = { id: `tmp-${Date.now()}`, userId: me.id, name: me.name, photo: me.photo, body, at: new Date().toISOString(), edited: false, deleted: false, reactions: [], pending: true }
    stick.current = true
    setMessages((l) => [...l, temp])
    const r = await chatSend({ channelId, body })
    if (!r.ok) {
      setMessages((l) => l.map((m) => (m.id === temp.id ? { ...m, pending: false, failed: true } : m)))
      setError(r.error)
      return false
    }
    setMessages((l) => (l.some((m) => m.id === r.data.id) ? l.filter((m) => m.id !== temp.id) : l.map((m) => (m.id === temp.id ? { ...m, id: r.data.id, at: r.data.at, pending: false } : m))))
    if (info && !info.member) setInfo({ ...info, member: true })
    setOverview((o) => ({ ...o, channels: o.channels.map((c) => (c.id === channelId ? { ...c, member: true, lastMessageAt: r.data.at } : c)) }))
    return true
  }

  const react = async (m: ChatMessageRow, emoji: (typeof EMOJI)[number]): Promise<void> => {
    // optimistic toggle
    setMessages((l) =>
      l.map((x) => {
        if (x.id !== m.id) return x
        const had = x.reactions.find((r) => r.emoji === emoji)
        const reactions = had
          ? x.reactions
              .map((r) => (r.emoji === emoji ? { ...r, count: r.count + (r.mine ? -1 : 1), mine: !r.mine, names: r.mine ? r.names.filter((n) => n !== 'You') : [...r.names, 'You'] } : r))
              .filter((r) => r.count > 0)
          : [...x.reactions, { emoji, count: 1, mine: true, names: ['You'] }]
        return { ...x, reactions }
      }),
    )
    await chatReact({ messageId: m.id, emoji })
  }

  const channels = overview.channels.filter((c) => c.kind === 'CHANNEL' && (c.member || c.name === 'general'))
  const browse = overview.channels.filter((c) => c.kind === 'CHANNEL' && !c.member && c.name !== 'general')
  const dms = overview.channels.filter((c) => c.kind === 'DM')
  const needle = filter.trim().toLowerCase()
  const match = (c: ChatChannelRow): boolean => !needle || c.name.toLowerCase().includes(needle)

  const openDm = async (userId: string): Promise<void> => {
    const r = await chatOpenDm(userId)
    setDialog(null)
    if (!r.ok) return setError(r.error)
    await refreshList()
    await open(r.data.id)
  }

  return (
    <div ref={frame} className="flex h-[calc(100dvh-1.5rem)] min-h-[420px] scroll-mt-3 overflow-hidden rounded-2xl border bg-card/60 shadow-sm sm:h-[calc(100dvh-11rem)] sm:min-h-[480px] lg:h-[calc(100dvh-9.5rem)]">
      {/* sidebar */}
      <aside className={cn('w-full shrink-0 flex-col border-r bg-card/80 md:flex md:w-[260px]', channelId ? 'hidden md:flex' : 'flex')}>
        <div className="flex items-center gap-2 border-b px-3 py-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a conversation" aria-label="Find a conversation" className="h-9 pl-8 text-sm" />
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3" aria-label="Conversations">
          <section>
            <div className="mb-1 flex items-center justify-between px-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Channels</h2>
              <button type="button" onClick={() => setDialog('channel')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="New channel" title="New channel">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {channels.filter(match).map((c) => (
              <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => void open(c.id)} />
            ))}
            {browse.filter(match).length ? (
              <>
                <div className="mt-3 px-2.5 pb-1 text-[11px] text-muted-foreground">More channels to join</div>
                {browse.filter(match).map((c) => (
                  <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => void open(c.id)} />
                ))}
              </>
            ) : null}
          </section>
          <section>
            <div className="mb-1 flex items-center justify-between px-2.5">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Direct messages</h2>
              <button type="button" onClick={() => setDialog('dm')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Message someone" title="Message someone">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            {dms.filter(match).map((c) => (
              <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => void open(c.id)} />
            ))}
            {!dms.length ? (
              <button type="button" onClick={() => setDialog('dm')} className="w-full rounded-lg px-2.5 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                Message a teammate…
              </button>
            ) : null}
          </section>
        </nav>
      </aside>

      {/* conversation */}
      <section className={cn('min-w-0 flex-1 flex-col', channelId ? 'flex' : 'hidden md:flex')}>
        {info ? (
          <>
            <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-5">
              <button type="button" onClick={() => setChannelId(null)} className="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="All conversations">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.5 truncate text-[16px] font-semibold">
                  {info.kind === 'DM' ? null : info.private ? <Lock className="h-4 w-4 opacity-60" aria-hidden /> : <Hash className="h-4 w-4 opacity-60" aria-hidden />}
                  {info.name}
                </h1>
                {info.kind === 'CHANNEL' ? (
                  <button type="button" disabled={!info.canManage} onClick={() => setDialog('topic')} className={cn('block max-w-full truncate text-left text-xs text-muted-foreground', info.canManage && 'hover:text-foreground')}>
                    {info.topic || (info.canManage ? 'Add a topic' : `${info.members.length} ${info.members.length === 1 ? 'member' : 'members'}`)}
                  </button>
                ) : null}
              </div>
              {info.kind === 'CHANNEL' ? (
                <div className="flex items-center gap-1">
                  <div className="mr-1 hidden -space-x-1.5 sm:flex" title={info.members.map((m) => m.name).join(', ')}>
                    {info.members.slice(0, 4).map((m) => (
                      <Avatar key={m.id} name={m.name} photo={m.photo} size={24} className="rounded-full ring-2 ring-card" />
                    ))}
                    {info.members.length > 4 ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold ring-2 ring-card">+{info.members.length - 4}</span> : null}
                  </div>
                  <IconBtn label="Add people" onClick={() => setDialog('add')}>
                    <UserPlus className="h-[18px] w-[18px]" />
                  </IconBtn>
                  {info.member && info.name !== 'general' ? (
                    <IconBtn
                      label="Leave channel"
                      onClick={async () => {
                        await chatLeave(info.id)
                        await refreshList()
                        setChannelId(null)
                        setInfo(null)
                      }}
                    >
                      <LogOut className="h-[18px] w-[18px]" />
                    </IconBtn>
                  ) : null}
                  {info.canManage && info.name !== 'general' ? (
                    <IconBtn
                      label="Archive channel"
                      onClick={async () => {
                        if (!window.confirm(`Archive #${info.name} for everyone?`)) return
                        const r = await chatArchiveChannel(info.id)
                        if (!r.ok) return setError(r.error)
                        await refreshList()
                        setChannelId(null)
                        setInfo(null)
                      }}
                    >
                      <Archive className="h-[18px] w-[18px]" />
                    </IconBtn>
                  ) : null}
                </div>
              ) : null}
            </header>

            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
              }}
              className="flex-1 overflow-y-auto px-2 py-4 sm:px-4"
            >
              {more ? (
                <div className="mb-4 text-center">
                  <Button variant="outline" size="sm" onClick={() => void loadOlder()}>
                    Load earlier messages
                  </Button>
                </div>
              ) : (
                <Intro info={info} me={me} />
              )}
              <MessageList messages={messages} meId={me.id} isAdmin={overview.isAdmin} people={peopleBy} onReact={react} setMessages={setMessages} seenAt={info.kind === 'DM' ? (readBy[0]?.at ?? null) : null} />
            </div>

            {error ? (
              <div role="alert" className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
                {error}
                <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : null}
            {info.kind === 'CHANNEL' && !info.member ? (
              <div className="flex items-center justify-between gap-3 border-t px-5 py-3 text-sm">
                <span className="text-muted-foreground">
                  You’re looking at <b className="text-foreground">#{info.name}</b>. Join to get its new messages.
                </span>
                <Button
                  size="sm"
                  onClick={async () => {
                    await chatJoin(info.id)
                    setInfo({ ...info, member: true })
                    await refreshList()
                  }}
                >
                  Join channel
                </Button>
              </div>
            ) : null}
            <Composer key={info.id} placeholder={info.kind === 'DM' ? `Message ${info.name}` : `Message #${info.name}`} people={overview.people.filter((p) => p.id !== me.id)} onSend={send} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">{loading ? 'Loading…' : error ? error : 'Pick a channel or a teammate to start talking.'}</div>
        )}
      </section>

      <NewChannelDialog
        open={dialog === 'channel'}
        people={overview.people.filter((p) => p.id !== me.id)}
        onClose={() => setDialog(null)}
        onCreated={async (id) => {
          setDialog(null)
          await refreshList()
          await open(id)
        }}
      />
      <PeopleDialog open={dialog === 'dm'} title="Message someone" people={overview.people} meId={me.id} onClose={() => setDialog(null)} onPick={(ids) => void openDm(ids[0]!)} />
      {info ? (
        <>
          <PeopleDialog
            open={dialog === 'add'}
            title={`Add people to #${info.name}`}
            multi
            people={overview.people.filter((p) => !info.members.some((m) => m.id === p.id))}
            meId={me.id}
            onClose={() => setDialog(null)}
            onPick={async (ids) => {
              const r = await chatAddMembers({ channelId: info.id, userIds: ids })
              setDialog(null)
              if (!r.ok) setError(r.error)
              else void open(info.id)
            }}
          />
          <TopicDialog
            open={dialog === 'topic'}
            info={info}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null)
              await refreshList()
              await open(info.id)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
      {children}
    </button>
  )
}

function Intro({ info, me }: { info: ChatChannelInfo; me: ChatPerson }): React.ReactElement {
  return (
    <div className="mb-6 px-2 pt-6">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">{info.kind === 'DM' ? <Avatar name={info.name} photo={info.members.find((m) => m.id !== me.id)?.photo ?? null} size={48} className="rounded-xl" /> : info.private ? <Lock className="h-6 w-6" /> : <Hash className="h-6 w-6" />}</div>
      <h2 className="text-xl font-semibold">{info.kind === 'DM' ? info.name : `Welcome to #${info.name}`}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {info.kind === 'DM'
          ? `This is the start of your conversation with ${info.name}. Only the two of you can see it.`
          : info.private
            ? 'A private channel: only its members can see it.'
            : `The start of #${info.name}. Everyone on the team can read and join it.`}
      </p>
    </div>
  )
}

/* ---------- messages ---------- */

function MessageList({
  messages,
  meId,
  isAdmin,
  people,
  onReact,
  setMessages,
  seenAt,
}: {
  messages: Pending[]
  meId: string
  isAdmin: boolean
  people: Map<string, ChatPerson>
  onReact: (m: ChatMessageRow, e: (typeof EMOJI)[number]) => Promise<void>
  setMessages: React.Dispatch<React.SetStateAction<Pending[]>>
  /** direct messages: when the other person last read the conversation */
  seenAt: string | null
}): React.ReactElement {
  // "Seen" under your last message they've read (direct messages only)
  const last = messages.at(-1)
  const seen = Boolean(seenAt && last && last.userId === meId && !last.pending && last.at <= seenAt)
  return (
    <ol className="space-y-0.5">
      {messages.map((m, i) => {
        const d = new Date(m.at)
        const day = d.toDateString()
        const prev = messages[i - 1]
        const divider = !prev || new Date(prev.at).toDateString() !== day
        const grouped = !divider && prev && prev.userId === m.userId && !prev.deleted && d.getTime() - new Date(prev.at).getTime() < 5 * 60_000
        return (
          <li key={m.id}>
            {divider ? (
              <div className="relative my-4 flex items-center justify-center" role="separator">
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
                <span className="relative rounded-full border bg-card px-3 py-0.5 text-xs font-medium text-muted-foreground">{dayLabel(d)}</span>
              </div>
            ) : null}
            <Message m={m} grouped={Boolean(grouped)} meId={meId} canDelete={m.userId === meId || isAdmin} people={people} onReact={onReact} setMessages={setMessages} />
          </li>
        )
      })}
      {seen ? (
        <li className="pr-3 pt-1 text-right text-[11px] text-muted-foreground" aria-live="polite">
          <Check className="mr-0.5 inline h-3 w-3" /> Seen
        </li>
      ) : null}
    </ol>
  )
}

function Message({
  m,
  grouped,
  meId,
  canDelete,
  people,
  onReact,
  setMessages,
}: {
  m: Pending
  grouped: boolean
  meId: string
  canDelete: boolean
  people: Map<string, ChatPerson>
  onReact: (m: ChatMessageRow, e: (typeof EMOJI)[number]) => Promise<void>
  setMessages: React.Dispatch<React.SetStateAction<Pending[]>>
}): React.ReactElement {
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const d = new Date(m.at)
  const mine = m.userId === meId

  if (m.deleted)
    return (
      <div className={cn('flex gap-3 px-2 py-0.5', !grouped && 'mt-2')}>
        <span className="w-9 shrink-0" />
        <span className="text-sm italic text-muted-foreground">This message was deleted.</span>
      </div>
    )

  const saveEdit = async (): Promise<void> => {
    const body = draft.trim()
    if (!body) return
    const stored = toStored(body, [...people.values()])
    setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, body: stored, edited: true } : x)))
    setEditing(false)
    await chatEdit({ messageId: m.id, body: stored })
  }

  return (
    <div className={cn('group relative flex gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/40', !grouped && 'mt-2', m.pending && 'opacity-60', m.failed && 'bg-rose-500/10')}>
      {grouped ? (
        <span className="w-9 shrink-0 pt-1 text-right text-[10px] leading-5 text-muted-foreground opacity-0 group-hover:opacity-100">{timeLabel(d)}</span>
      ) : (
        <Avatar name={m.name} photo={m.photo} size={36} className="mt-0.5" />
      )}
      <div className="min-w-0 flex-1">
        {!grouped ? (
          <div className="flex items-baseline gap-2">
            <span className="text-[14.5px] font-semibold">{m.name}</span>
            <time dateTime={m.at} className="text-xs text-muted-foreground" title={d.toLocaleString()}>
              {timeLabel(d)}
            </time>
          </div>
        ) : null}
        {editing ? (
          <div className="mt-1">
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void saveEdit()
                }
                if (e.key === 'Escape') setEditing(false)
              }}
              rows={Math.min(8, draft.split('\n').length + 1)}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-[14.5px] outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
              <button type="button" className="font-medium text-primary" onClick={() => void saveEdit()}>
                Save
              </button>
              <button type="button" onClick={() => setEditing(false)}>
                Cancel
              </button>
              <span>Enter to save · Esc to cancel</span>
            </div>
          </div>
        ) : (
          <Body text={m.body} people={people} meId={meId} />
        )}
        {m.edited && !editing ? <span className="text-[11px] text-muted-foreground"> (edited)</span> : null}
        {m.failed ? <span className="text-xs text-rose-300">Not sent.</span> : null}
        {m.reactions.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => void onReact(m, r.emoji as (typeof EMOJI)[number])}
                title={r.names.join(', ')}
                className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors', r.mine ? 'border-primary/60 bg-primary/15 text-foreground' : 'border-border bg-muted/40 text-muted-foreground hover:border-foreground/30')}
              >
                <span className="text-[14px] leading-none">{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* hover actions */}
      {!m.pending && !editing ? (
        <div className={cn('absolute -top-3.5 right-3 flex items-center rounded-lg border bg-card shadow-md transition-opacity', picking ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100')}>
          {picking ? (
            <div className="flex items-center px-1">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="rounded-md p-1 text-[17px] leading-none transition-transform hover:scale-125"
                  onClick={() => {
                    setPicking(false)
                    void onReact(m, e)
                  }}
                  aria-label={`React ${e}`}
                >
                  {e}
                </button>
              ))}
              <button type="button" className="p-1 text-muted-foreground" onClick={() => setPicking(false)} aria-label="Close">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <>
              <HoverBtn label="Add reaction" onClick={() => setPicking(true)}>
                <SmilePlus className="h-4 w-4" />
              </HoverBtn>
              {mine ? (
                <HoverBtn
                  label="Edit"
                  onClick={() => {
                    setDraft(toDisplay(m.body, people))
                    setEditing(true)
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </HoverBtn>
              ) : null}
              {canDelete ? (
                <HoverBtn
                  label="Delete"
                  onClick={async () => {
                    if (!window.confirm('Delete this message?')) return
                    setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, deleted: true, body: '' } : x)))
                    await chatDelete(m.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </HoverBtn>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

function HoverBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="p-1.5 text-muted-foreground transition-colors first:rounded-l-lg last:rounded-r-lg hover:bg-muted hover:text-foreground">
      {children}
    </button>
  )
}

/* ---------- composer with @mentions ---------- */

function Composer({ placeholder, people, onSend }: { placeholder: string; people: ChatPerson[]; onSend: (text: string) => Promise<boolean> }): React.ReactElement {
  const [text, setText] = useState('')
  const [mention, setMention] = useState<{ q: string; start: number } | null>(null)
  const [pick, setPick] = useState(0)
  const ref = useRef<HTMLTextAreaElement>(null)
  const caret = useRef<number | null>(null)
  const options = mention ? people.filter((p) => p.name.toLowerCase().includes(mention.q.toLowerCase())).slice(0, 6) : []

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
    if (caret.current != null) {
      el.focus()
      el.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [text])

  const track = (value: string, caret: number): void => {
    const before = value.slice(0, caret)
    const m = before.match(/(^|\s)@([\p{L}\p{N} .'-]{0,30})$/u)
    if (m && !/\s{2}/.test(m[2]!)) {
      setMention({ q: m[2]!, start: caret - m[2]!.length - 1 })
      setPick(0)
    } else setMention(null)
  }

  const choose = (p: ChatPerson): void => {
    if (!mention) return
    const el = ref.current
    const at = el?.selectionStart ?? text.length
    const next = `${text.slice(0, mention.start)}@${p.name} ${text.slice(at)}`
    caret.current = mention.start + p.name.length + 2
    setText(next)
    setMention(null)
  }

  const submit = async (): Promise<void> => {
    const t = text
    if (!t.trim()) return
    setText('')
    setMention(null)
    const ok = await onSend(t)
    if (!ok) setText(t)
  }

  return (
    <div className="relative border-t px-3 pb-3 pt-2 sm:px-4">
      {options.length ? (
        <ul className="absolute bottom-full left-4 right-4 mb-1 overflow-hidden rounded-xl border bg-card shadow-xl sm:right-auto sm:w-72" role="listbox" aria-label="Mention a teammate">
          {options.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === pick}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault()
                  choose(p)
                }}
                className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm', i === pick ? 'bg-primary/15' : 'hover:bg-muted')}
              >
                <Avatar name={p.name} photo={p.photo} size={24} className="rounded-md" />
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="text-[11px] text-muted-foreground">{p.role === 'ADMIN' ? 'Admin' : p.role === 'SALES' ? 'Sales' : 'Marketing'}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mr-16 flex items-end gap-2 rounded-xl border bg-background px-3 py-2 shadow-sm focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          placeholder={placeholder}
          aria-label={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            track(e.target.value, e.target.selectionStart)
          }}
          onKeyDown={(e) => {
            if (options.length) {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setPick((p) => (p + 1) % options.length)
                return
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setPick((p) => (p - 1 + options.length) % options.length)
                return
              }
              if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                choose(options[pick]!)
                return
              }
              if (e.key === 'Escape') {
                setMention(null)
                return
              }
            }
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              void submit()
            }
          }}
          className="max-h-[200px] flex-1 resize-none bg-transparent py-1 text-[14.5px] outline-none placeholder:text-muted-foreground"
        />
        <button type="button" onClick={() => void submit()} disabled={!text.trim()} aria-label="Send" className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-30">
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
      <p className="mt-1 hidden px-1 text-[11px] text-muted-foreground sm:block">
        <b>Enter</b> to send · <b>Shift + Enter</b> for a new line · <b>@</b> to mention someone
      </p>
    </div>
  )
}

/* ---------- dialogs ---------- */

function NewChannelDialog({ open, people, onClose, onCreated }: { open: boolean; people: ChatPerson[]; onClose: () => void; onCreated: (id: string) => void }): React.ReactElement {
  const [name, setName] = useState('')
  const [topic, setTopic] = useState('')
  const [priv, setPriv] = useState(false)
  const [members, setMembers] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
  return (
    <Dialog open={open} onClose={onClose} title="New channel" description="Channels are where the team talks about a topic, a client or a project.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          const r = await chatCreateChannel({ name, topic: topic || null, private: priv, memberIds: members })
          setBusy(false)
          if (!r.ok) return setError(r.error)
          setName('')
          setTopic('')
          setMembers([])
          setPriv(false)
          setError(null)
          onCreated(r.data.id)
        }}
      >
        <div>
          <Label htmlFor="ch-name">Name</Label>
          <div className="relative mt-1">
            <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input id="ch-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. sales-floor" className="pl-8" maxLength={60} autoFocus required />
          </div>
          {slug && slug !== name ? <p className="mt-1 text-xs text-muted-foreground">Will be #{slug}</p> : null}
        </div>
        <div>
          <Label htmlFor="ch-topic">Topic (optional)</Label>
          <Input id="ch-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What it's for" className="mt-1" maxLength={200} />
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
          <input type="checkbox" checked={priv} onChange={(e) => setPriv(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]" />
          <span>
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Lock className="h-3.5 w-3.5" /> Private
            </span>
            <span className="text-xs text-muted-foreground">Only the people in it can see it. Otherwise everyone on the team can read and join.</span>
          </span>
        </label>
        <div>
          <Label>Add people {priv ? '' : '(optional)'}</Label>
          <PeoplePicker people={people} value={members} onChange={setMembers} />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || !slug}>
            Create channel
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function PeoplePicker({ people, value, onChange }: { people: ChatPerson[]; value: string[]; onChange: (v: string[]) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <div className="mt-1 rounded-lg border">
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the team" className="rounded-b-none border-0 border-b" aria-label="Search the team" />
      <ul className="max-h-56 overflow-y-auto p-1">
        {list.map((p) => {
          const on = value.includes(p.id)
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onChange(on ? value.filter((v) => v !== p.id) : [...value, p.id])} className={cn('flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm', on ? 'bg-primary/15' : 'hover:bg-muted')} aria-pressed={on}>
                <Avatar name={p.name} photo={p.photo} size={26} className="rounded-md" />
                <span className="flex-1 truncate">{p.name}</span>
                {on ? <Check className="h-4 w-4 text-primary" /> : null}
              </button>
            </li>
          )
        })}
        {!list.length ? <li className="px-2 py-3 text-center text-sm text-muted-foreground">No one matches.</li> : null}
      </ul>
    </div>
  )
}

function PeopleDialog({ open, title, people, meId, multi, onClose, onPick }: { open: boolean; title: string; people: ChatPerson[]; meId: string; multi?: boolean; onClose: () => void; onPick: (ids: string[]) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<string[]>([])
  const list = people.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      {multi ? (
        <>
          <PeoplePicker people={people} value={sel} onChange={setSel} />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              disabled={!sel.length}
              onClick={() => {
                onPick(sel)
                setSel([])
              }}
            >
              Add {sel.length || ''}
            </Button>
          </div>
        </>
      ) : (
        <>
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the team" autoFocus aria-label="Search the team" />
          <ul className="mt-2 max-h-80 overflow-y-auto">
            {list.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => onPick([p.id])} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-muted">
                  <Avatar name={p.name} photo={p.photo} size={32} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.name}
                      {p.id === meId ? ' (you)' : ''}
                    </span>
                    <span className="text-xs text-muted-foreground">{p.role === 'ADMIN' ? 'Admin' : p.role === 'SALES' ? 'Sales' : 'Marketing'}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </Dialog>
  )
}

function TopicDialog({ open, info, onClose, onSaved }: { open: boolean; info: ChatChannelInfo; onClose: () => void; onSaved: () => void }): React.ReactElement {
  const [name, setName] = useState(info.name)
  const [topic, setTopic] = useState(info.topic ?? '')
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setName(info.name)
    setTopic(info.topic ?? '')
  }, [info.name, info.topic, open])
  return (
    <Dialog open={open} onClose={onClose} title={`Edit #${info.name}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault()
          const r = await chatUpdateChannel({ channelId: info.id, ...(info.name === 'general' ? {} : { name }), topic: topic || null })
          if (!r.ok) return setError(r.error)
          onSaved()
        }}
      >
        {info.name !== 'general' ? (
          <div>
            <Label htmlFor="t-name">Name</Label>
            <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" maxLength={60} />
          </div>
        ) : null}
        <div>
          <Label htmlFor="t-topic">Topic</Label>
          <Input id="t-topic" value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1" maxLength={200} placeholder="What this channel is for" />
        </div>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Save</Button>
        </div>
      </form>
    </Dialog>
  )
}
