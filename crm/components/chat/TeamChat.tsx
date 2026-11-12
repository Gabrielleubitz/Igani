'use client'

import { ArrowDown, ArrowLeft, Archive, Bell, BellOff, Hash, Lock, LogOut, MessageSquareReply, Play, Plus, Search, UserPlus, Volume2, VolumeX, X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { chatAddMembers, chatArchiveChannel, chatDelete, chatJoin, chatLeave, chatMarkRead, chatMessages, chatMute, chatOpenDm, chatOverview, chatReact, chatSearch, chatSend, type ChatChannelInfo, type ChatChannelRow, type ChatMessageRow, type ChatOverview, type ChatSearchHit } from '@/app/actions/chat'
import { CHAT_UNREAD_EVENT } from '@/components/AppNav'
import { MediaViewer, mediaIn } from '@/components/chat/MediaViewer'
import { NewChannelDialog, PeopleDialog, TopicDialog } from '@/components/chat/ChatDialogs'
import { Avatar, Composer, Message, dayLabel, toStored, type Emoji, type Pending, type UploadedFile } from '@/components/chat/ChatParts'
import { chatSoundEnabled, playChatSound, setChatSoundEnabled } from '@/components/chat/chat-sound'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { ChatPerson } from '@/lib/chat'
import { cn } from '@/lib/utils'

const POLL_MS = 2500
const LIST_MS = 8000

/* ---------- one conversation (a channel, or a thread in it): load, poll, merge ---------- */

function useConversation(channelId: string | null, threadId: string | null, onNew?: () => void) {
  const [info, setInfo] = useState<ChatChannelInfo | null>(null)
  const [messages, setMessages] = useState<Pending[]>([])
  const [parent, setParent] = useState<ChatMessageRow | null>(null)
  const [more, setMore] = useState(false)
  const [readBy, setReadBy] = useState<{ userId: string; at: string }[]>([])
  const [myLastReadAt, setMyLastReadAt] = useState<string | null>(null)
  /** when the page loaded: "New" marks what was unread then, not what arrives while you watch */
  const [openedAt, setOpenedAt] = useState<string | null>(null)
  const [typing, setTyping] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const cursor = useRef<string | null>(null)
  const shown = useRef<Pending[]>([])
  useEffect(() => {
    shown.current = messages
  }, [messages])
  const newRef = useRef(onNew)
  useEffect(() => {
    newRef.current = onNew
  }, [onNew])

  useEffect(() => {
    if (!channelId) return
    let stop = false
    cursor.current = null
    setLoading(true)
    setError(null)
    setMessages([])
    setParent(null)
    if (!threadId) setInfo(null)
    void chatMessages({ channelId, threadId }).then((r) => {
      if (stop) return
      setLoading(false)
      if (!r.ok) return setError(r.error)
      if (r.data.channel) setInfo(r.data.channel)
      setMessages(r.data.messages)
      setParent(r.data.parent)
      setMore(r.data.more)
      setReadBy(r.data.readBy)
      setMyLastReadAt(r.data.myLastReadAt)
      setOpenedAt(r.data.cursor)
      setTyping(r.data.typing)
      cursor.current = r.data.cursor
      if (!threadId) void chatMarkRead(channelId)
    })
    const tick = async (): Promise<void> => {
      if (stop || document.hidden || !cursor.current) return
      const r = await chatMessages({
        channelId,
        threadId,
        since: cursor.current,
      })
      if (stop || !r.ok) return
      cursor.current = r.data.cursor
      setReadBy(r.data.readBy)
      setTyping(r.data.typing)
      if (r.data.parent) setParent(r.data.parent)
      if (!r.data.messages.length) return
      // decide "new" against what's on screen now (a state updater runs later, so it can't tell us)
      const fresh = r.data.messages.some((m) => !shown.current.some((x) => x.id === m.id))
      setMessages((list) => {
        const next = [...list]
        for (const m of r.data.messages) {
          const i = next.findIndex((x) => x.id === m.id)
          if (i >= 0) next[i] = m
          else next.push(m)
        }
        return next.sort((a, b) => a.at.localeCompare(b.at))
      })
      if (fresh) {
        if (!threadId) void chatMarkRead(channelId)
        newRef.current?.()
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
  }, [channelId, threadId])

  const loadOlder = useCallback(async (): Promise<void> => {
    if (!channelId || !messages[0]) return
    const r = await chatMessages({ channelId, before: messages[0].at })
    if (!r.ok) return
    setMessages((list) => [...r.data.messages.filter((m) => !list.some((x) => x.id === m.id)), ...list])
    setMore(r.data.more)
  }, [channelId, messages])

  return {
    info,
    setInfo,
    messages,
    setMessages,
    parent,
    setParent,
    more,
    readBy,
    myLastReadAt,
    openedAt,
    typing,
    error,
    setError,
    loading,
    loadOlder,
  }
}

/* ---------- sidebar row ---------- */

function ChannelLink({ c, active, onOpen }: { c: ChatChannelRow; active: boolean; onOpen: () => void }): React.ReactElement {
  const bold = c.unread > 0 && !c.muted
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex w-full items-center gap-2 rounded-sm px-2.5 py-1.5 text-left text-[14px] transition-colors',
        active ? 'bg-primary/10 font-semibold text-primary' : 'text-foreground/75 hover:bg-muted hover:text-foreground',
        bold && !active && 'font-semibold text-foreground',
        c.muted && !active && 'opacity-60',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {c.kind === 'DM' ? <Avatar name={c.name} photo={c.dm?.photo ?? null} size={20} online={c.dm?.online} /> : c.private ? <Lock className="h-[15px] w-[15px] shrink-0 opacity-70" aria-hidden /> : <Hash className="h-[15px] w-[15px] shrink-0 opacity-70" aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{c.name}</span>
      {c.muted ? <BellOff className="h-3.5 w-3.5 shrink-0 opacity-60" aria-label="Muted" /> : null}
      {c.mentions > 0 ? <span className="min-w-[20px] rounded-full bg-rose-500 px-1.5 text-center text-[11px] font-bold leading-5 text-white">{c.mentions}</span> : c.unread > 0 && !c.muted ? <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label={`${c.unread} unread`} /> : null}
    </button>
  )
}

/* ---------- the list of messages, with day dividers and "New messages" ---------- */

function MessageList({
  messages,
  meId,
  isAdmin,
  people,
  newSince,
  newUntil = null,
  highlight,
  editReq,
  onReact,
  onReply,
  onDelete,
  onEdited,
  onOpenFile,
}: {
  messages: Pending[]
  meId: string
  isAdmin: boolean
  people: Map<string, ChatPerson>
  /** messages from others after this are new… */
  newSince: string | null
  /** …up to when the page opened */
  newUntil?: string | null
  highlight: string | null
  editReq: { id: string; n: number } | null
  onReact: (m: ChatMessageRow, e: Emoji) => void
  onReply?: (m: ChatMessageRow) => void
  onDelete: (m: ChatMessageRow) => void
  onEdited: (id: string, body: string) => void
  onOpenFile?: (m: ChatMessageRow, index: number) => void
}): React.ReactElement {
  const firstNew = newSince ? messages.findIndex((m) => m.at > newSince && (!newUntil || m.at <= newUntil) && m.userId !== meId && !m.pending) : -1
  return (
    <ol className="space-y-0.5">
      {messages.map((m, i) => {
        const d = new Date(m.at)
        const prev = messages[i - 1]
        const divider = !prev || new Date(prev.at).toDateString() !== d.toDateString()
        const isNew = i === firstNew
        const grouped = !divider && !isNew && prev && prev.userId === m.userId && !prev.deleted && prev.replyCount === 0 && d.getTime() - new Date(prev.at).getTime() < 5 * 60_000
        return (
          <li key={m.id}>
            {divider ? (
              <div className="relative my-4 flex items-center justify-center" role="separator">
                <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
                <span className="eyebrow relative rounded-full border bg-card px-3 py-1">{dayLabel(d)}</span>
              </div>
            ) : null}
            {isNew ? (
              <div className="relative my-3 flex items-center" role="separator" aria-label="New messages">
                <span className="h-px flex-1 bg-rose-500/60" aria-hidden />
                <span className="ml-2 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">New</span>
              </div>
            ) : null}
            <Message m={m} grouped={Boolean(grouped)} meId={meId} canDelete={m.userId === meId || isAdmin} people={people} onReact={onReact} onReply={onReply} onDelete={onDelete} onEdited={onEdited} highlight={highlight === m.id} editRequest={editReq?.id === m.id ? editReq.n : undefined} onOpenFile={onOpenFile} />
          </li>
        )
      })}
    </ol>
  )
}

function Typing({ names }: { names: string[] }): React.ReactElement {
  return (
    <div className="h-5 px-5 text-xs text-muted-foreground" aria-live="polite">
      {names.length ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="flex gap-0.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/70" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          {names.length === 1 ? `${names[0]} is typing…` : names.length === 2 ? `${names[0]} and ${names[1]} are typing…` : 'Several people are typing…'}
        </span>
      ) : null}
    </div>
  )
}

/* ---------- the page ---------- */

export function TeamChat({ initial, initialChannelId, initialThreadId = null }: { initial: ChatOverview; initialChannelId: string | null; initialThreadId?: string | null }): React.ReactElement {
  // a conversation opened from a link is read as it opens
  const [overview, setOverview] = useState(() => ({ ...initial, channels: initial.channels.map((c) => (c.id === initialChannelId ? { ...c, unread: 0, mentions: 0 } : c)) }))
  const [channelId, setChannelId] = useState<string | null>(initialChannelId)
  const [threadId, setThreadId] = useState<string | null>(initialThreadId)
  const [filter, setFilter] = useState('')
  const [hits, setHits] = useState<ChatSearchHit[] | null>(null)
  const [dialog, setDialog] = useState<null | 'channel' | 'dm' | 'add' | 'topic'>(null)
  const [highlight, setHighlight] = useState<string | null>(null)
  const [unseen, setUnseen] = useState(0)
  const [editReq, setEditReq] = useState<{ id: string; n: number } | null>(null)
  /** the photo / file viewer: which list it pages through, and where it starts */
  const [viewing, setViewing] = useState<{ scope: 'main' | 'thread'; messageId: string; index: number } | null>(null)
  const [threadEditReq, setThreadEditReq] = useState<{
    id: string
    n: number
  } | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const threadScroller = useRef<HTMLDivElement>(null)
  const stick = useRef(true)
  const frame = useRef<HTMLDivElement>(null)
  const openRef = useRef<string | null>(initialChannelId)
  const me = overview.me
  const peopleBy = useMemo(() => new Map<string, ChatPerson>(overview.people.map((p) => [p.id, p])), [overview.people])
  const onlineBy = useMemo(() => new Map(overview.people.map((p) => [p.id, p.online])), [overview.people])

  // a message in the conversation on screen is silent, unless this window isn't the one you're looking at
  const chimeIfAway = (): void => void (!document.hasFocus() && playChatSound('chime'))
  const convo = useConversation(channelId, null, () => {
    if (!stick.current) setUnseen((n) => n + 1)
    chimeIfAway()
  })
  const thread = useConversation(threadId ? channelId : null, threadId, chimeIfAway)
  const { info } = convo
  const replies = thread.messages.filter((m) => !m.deleted).length

  useEffect(() => {
    openRef.current = channelId
  }, [channelId])
  // the sidebar badge follows what you've read here, without waiting for the next background check
  const totalUnread = overview.channels.reduce((n, c) => n + (c.member && (!c.muted || c.kind === 'DM') ? c.unread : 0), 0)
  useEffect(() => {
    window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT, { detail: totalUnread }))
  }, [totalUnread])

  const refreshList = useCallback(async () => {
    const r = await chatOverview()
    if (r.ok)
      setOverview({
        ...r.data,
        channels: r.data.channels.map((c) => (c.id === openRef.current ? { ...c, unread: 0, mentions: 0 } : c)),
      })
  }, [])
  useEffect(() => {
    const t = window.setInterval(() => void (!document.hidden && refreshList()), LIST_MS)
    return () => window.clearInterval(t)
  }, [refreshList])

  const open = useCallback((id: string, opts: { thread?: string | null; highlight?: string | null } = {}) => {
    setChannelId(id)
    setThreadId(opts.thread ?? null)
    setHighlight(opts.highlight ?? null)
    setUnseen(0)
    stick.current = !opts.highlight
    if (!window.matchMedia('(min-width: 640px)').matches) frame.current?.scrollIntoView({ block: 'start' })
    const url = new URL(window.location.href)
    url.searchParams.set('c', id)
    if (opts.thread) url.searchParams.set('t', opts.thread)
    else url.searchParams.delete('t')
    window.history.replaceState(null, '', url)
    setOverview((o) => ({
      ...o,
      channels: o.channels.map((c) => (c.id === id ? { ...c, unread: 0, mentions: 0 } : c)),
    }))
  }, [])

  useEffect(() => {
    const first = initialChannelId ?? initial.channels.find((c) => c.kind === 'CHANNEL' && c.name === 'general')?.id ?? initial.channels[0]?.id ?? null
    if (first && !initialChannelId && window.matchMedia('(min-width: 768px)').matches) open(first)
    // a link straight to a conversation on a phone: bring the chat (and its message box) into view
    if (initialChannelId && !window.matchMedia('(min-width: 640px)').matches) frame.current?.scrollIntoView({ block: 'start' })
  }, [initial.channels, initialChannelId, open])

  // stay at the bottom while you're there; land on a highlighted message from search (once), keep your place when older ones load
  const landed = useRef<string | null>(null)
  const olderFrom = useRef<number | null>(null)
  useLayoutEffect(() => {
    const el = scroller.current
    if (!el) return
    if (olderFrom.current != null) {
      el.scrollTop += el.scrollHeight - olderFrom.current
      olderFrom.current = null
      return
    }
    if (highlight && landed.current !== highlight && !threadId) {
      const target = document.getElementById(`msg-${highlight}`)
      if (target) {
        landed.current = highlight
        target.scrollIntoView({ block: 'center' })
        window.setTimeout(() => setHighlight((h) => (h === highlight ? null : h)), 2500)
        return
      }
    }
    if (stick.current) el.scrollTop = el.scrollHeight
  }, [convo.messages, channelId, highlight, threadId])
  useLayoutEffect(() => {
    const el = threadScroller.current
    if (!el) return
    const target = highlight ? el.querySelector(`#msg-${highlight}`) : null
    if (target && landed.current !== highlight) {
      landed.current = highlight
      target.scrollIntoView({ block: 'center' })
      window.setTimeout(() => setHighlight((h) => (h === highlight ? null : h)), 2500)
    } else if (!target) el.scrollTop = el.scrollHeight
  }, [thread.messages, threadId, highlight])

  // message search (server side, two letters or more)
  useEffect(() => {
    const q = filter.trim()
    if (q.length < 2) {
      setHits(null)
      return
    }
    const t = window.setTimeout(() => void chatSearch(q).then((r) => setHits(r.ok ? r.data : [])), 300)
    return () => window.clearTimeout(t)
  }, [filter])

  const send = async (text: string, files: UploadedFile[], parentId: string | null): Promise<boolean> => {
    if (!channelId) return false
    const body = toStored(text.trim(), overview.people)
    if (!body && !files.length) return false
    const target = parentId ? thread : convo
    const temp: Pending = {
      id: `tmp-${Date.now()}`,
      userId: me.id,
      name: me.name,
      photo: me.photo,
      body,
      at: new Date().toISOString(),
      edited: false,
      deleted: false,
      reactions: [],
      pending: true,
      parentId,
      replyCount: 0,
      lastReplyAt: null,
      repliers: [],
      files: [],
      leads: [],
    }
    if (!parentId) stick.current = true
    target.setMessages((l) => [...l, temp])
    const r = await chatSend({ channelId, body, parentId, files })
    if (!r.ok) {
      target.setMessages((l) => l.filter((m) => m.id !== temp.id))
      target.setError(`Not sent: ${r.error}`)
      return false
    }
    target.setMessages((l) => (l.some((m) => m.id === r.data.id) ? l.filter((m) => m.id !== temp.id) : l.map((m) => (m.id === temp.id ? { ...m, id: r.data.id, at: r.data.at, pending: false } : m))))
    if (parentId) convo.setMessages((l) => l.map((m) => (m.id === parentId ? { ...m, replyCount: m.replyCount + 1, lastReplyAt: r.data.at } : m)))
    if (info && !info.member) convo.setInfo({ ...info, member: true })
    setOverview((o) => ({
      ...o,
      channels: o.channels.map((c) => (c.id === channelId ? { ...c, member: true, lastMessageAt: r.data.at } : c)),
    }))
    return true
  }

  type Convo = typeof convo
  const react = (target: Convo) => async (m: ChatMessageRow, emoji: Emoji) => {
    target.setMessages((l) =>
      l.map((x) => {
        if (x.id !== m.id) return x
        const had = x.reactions.find((r) => r.emoji === emoji)
        const reactions = had
          ? x.reactions
              .map((r) =>
                r.emoji === emoji
                  ? {
                      ...r,
                      count: r.count + (r.mine ? -1 : 1),
                      mine: !r.mine,
                      names: r.mine ? r.names.filter((n) => n !== 'You') : [...r.names, 'You'],
                    }
                  : r,
              )
              .filter((r) => r.count > 0)
          : [...x.reactions, { emoji, count: 1, mine: true, names: ['You'] }]
        return { ...x, reactions }
      }),
    )
    await chatReact({ messageId: m.id, emoji })
  }
  const remove = (target: Convo) => async (m: ChatMessageRow) => {
    target.setMessages((l) => l.map((x) => (x.id === m.id ? { ...x, deleted: true, body: '', files: [] } : x)))
    await chatDelete(m.id)
  }
  const edited = (target: Convo) => (id: string, body: string) => target.setMessages((l) => l.map((x) => (x.id === id ? { ...x, body, edited: true } : x)))
  const editLast = (target: Convo, setter: (v: { id: string; n: number }) => void) => () => {
    const last = [...target.messages].reverse().find((m) => m.userId === me.id && !m.deleted && !m.pending && m.body)
    if (last) setter({ id: last.id, n: Date.now() })
  }

  const channels = overview.channels.filter((c) => c.kind === 'CHANNEL' && (c.member || c.name === 'general'))
  const browse = overview.channels.filter((c) => c.kind === 'CHANNEL' && !c.member && c.name !== 'general')
  const dms = overview.channels.filter((c) => c.kind === 'DM')
  const needle = filter.trim().toLowerCase()
  const match = (c: ChatChannelRow): boolean => !needle || c.name.toLowerCase().includes(needle)
  const otherId = info?.kind === 'DM' ? info.members.find((m) => m.id !== me.id)?.id : undefined
  const seenAt = info?.kind === 'DM' ? (convo.readBy.find((r) => r.userId === otherId)?.at ?? null) : null
  const lastMine = convo.messages.at(-1)
  const seen = Boolean(seenAt && lastMine && lastMine.userId === me.id && !lastMine.pending && lastMine.at <= seenAt)

  const openDm = async (userId: string): Promise<void> => {
    const r = await chatOpenDm(userId)
    setDialog(null)
    if (!r.ok) return convo.setError(r.error)
    await refreshList()
    open(r.data.id)
  }

  return (
    <div ref={frame} className="flex h-[calc(100dvh-1.5rem)] min-h-[420px] scroll-mt-3 overflow-hidden rounded-lg border bg-card shadow-sm sm:h-[calc(100dvh-11rem)] sm:min-h-[480px] lg:h-[calc(100dvh-9.5rem)]">
      {/* sidebar */}
      <aside className={cn('w-full shrink-0 flex-col border-r bg-muted/30 md:flex md:w-[264px]', channelId ? 'hidden md:flex' : 'flex')}>
        <div className="border-b px-3 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a conversation or message" aria-label="Find a conversation or message" className="h-9 pl-8 pr-7 text-sm" />
            {filter ? (
              <button type="button" onClick={() => setFilter('')} aria-label="Clear" className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-2 py-3" aria-label="Conversations">
          {hits ? (
            <section>
              <div className="eyebrow mb-1 px-2.5">Messages</div>
              {hits.length ? (
                hits.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() =>
                      h.threadId
                        ? open(h.channelId, {
                            thread: h.threadId,
                            highlight: h.id,
                          })
                        : open(h.channelId, { highlight: h.id })
                    }
                    className="block w-full rounded-sm px-2.5 py-2 text-left hover:bg-muted"
                  >
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
                      <span className="truncate font-semibold text-foreground">{h.name}</span>
                      <span className="shrink-0">{h.where}</span>
                    </div>
                    <div className="line-clamp-2 text-[13px] text-foreground/80">{h.body.replace(/<@([a-z0-9]{20,40})>/gi, (_, i: string) => `@${peopleBy.get(i)?.name ?? 'someone'}`)}</div>
                  </button>
                ))
              ) : (
                <p className="px-2.5 text-xs text-muted-foreground">No messages match “{filter.trim()}”.</p>
              )}
            </section>
          ) : null}
          {!needle || channels.some(match) || browse.some(match) ? (
            <section>
              <div className="mb-1 flex items-center justify-between px-2.5">
                <h2 className="eyebrow">Channels</h2>
                <button type="button" onClick={() => setDialog('channel')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="New channel" title="New channel">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {channels.filter(match).map((c) => (
                <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => open(c.id)} />
              ))}
              {browse.filter(match).length ? (
                <>
                  <div className="mt-3 px-2.5 pb-1 text-[11px] text-muted-foreground">More channels to join</div>
                  {browse.filter(match).map((c) => (
                    <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => open(c.id)} />
                  ))}
                </>
              ) : null}
            </section>
          ) : null}
          {!needle || dms.some(match) ? (
            <section>
              <div className="mb-1 flex items-center justify-between px-2.5">
                <h2 className="eyebrow">Direct messages</h2>
                <button type="button" onClick={() => setDialog('dm')} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Message someone" title="Message someone">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {dms.filter(match).map((c) => (
                <ChannelLink key={c.id} c={c} active={c.id === channelId} onOpen={() => open(c.id)} />
              ))}
              {!dms.length ? (
                <button type="button" onClick={() => setDialog('dm')} className="w-full rounded-sm px-2.5 py-1.5 text-left text-[13px] text-muted-foreground hover:bg-muted/60 hover:text-foreground">
                  Message a teammate…
                </button>
              ) : null}
            </section>
          ) : null}
        </nav>
        <NotifySettings />
      </aside>

      {/* conversation */}
      <section className={cn('min-w-0 flex-1 flex-col', channelId && !threadId ? 'flex' : channelId && threadId ? 'hidden lg:flex' : 'hidden md:flex')}>
        {info && channelId ? (
          <>
            <header className="flex items-center gap-3 border-b px-3 py-2.5 sm:px-5">
              <button type="button" onClick={() => setChannelId(null)} className="-ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted md:hidden" aria-label="All conversations">
                <ArrowLeft className="h-5 w-5" />
              </button>
              {info.kind === 'DM' ? <Avatar name={info.name} photo={info.members.find((m) => m.id !== me.id)?.photo ?? null} size={30} online={otherId ? onlineBy.get(otherId) : true} /> : null}
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-1.5 truncate text-[16px] font-semibold tracking-[-0.01em]">
                  {info.kind === 'DM' ? null : info.private ? <Lock className="h-4 w-4 opacity-60" aria-hidden /> : <Hash className="h-4 w-4 opacity-60" aria-hidden />}
                  {info.name}
                </h1>
                {info.kind === 'CHANNEL' ? (
                  <button type="button" disabled={!info.canManage} onClick={() => setDialog('topic')} className={cn('block max-w-full truncate text-left text-xs text-muted-foreground', info.canManage && 'hover:text-foreground')}>
                    {info.topic || (info.canManage ? 'Add a topic' : `${info.members.length} ${info.members.length === 1 ? 'member' : 'members'}`)}
                  </button>
                ) : (
                  <p className="text-xs text-muted-foreground">{otherId && onlineBy.get(otherId) ? 'Online' : 'Away'}</p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {info.kind === 'CHANNEL' ? (
                  <div className="mr-1 hidden -space-x-1.5 sm:flex" title={info.members.map((m) => m.name).join(', ')}>
                    {info.members.slice(0, 4).map((m) => (
                      <Avatar key={m.id} name={m.name} photo={m.photo} size={24} className="[&>span:first-child]:rounded-full [&>span:first-child]:ring-2 [&>span:first-child]:ring-card" />
                    ))}
                    {info.members.length > 4 ? <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-1 text-[10px] font-semibold ring-2 ring-card">+{info.members.length - 4}</span> : null}
                  </div>
                ) : null}
                {info.member ? (
                  <IconBtn
                    label={info.muted ? 'Unmute' : 'Mute (no unread counts or alerts unless you’re @mentioned)'}
                    onClick={async () => {
                      const muted = !info.muted
                      convo.setInfo({ ...info, muted })
                      await chatMute(info.id, muted)
                      await refreshList()
                    }}
                  >
                    {info.muted ? <BellOff className="h-[18px] w-[18px]" /> : <Bell className="h-[18px] w-[18px]" />}
                  </IconBtn>
                ) : null}
                {info.kind === 'CHANNEL' ? (
                  <IconBtn label="Add people" onClick={() => setDialog('add')}>
                    <UserPlus className="h-[18px] w-[18px]" />
                  </IconBtn>
                ) : null}
                {info.kind === 'CHANNEL' && info.member && info.name !== 'general' ? (
                  <IconBtn
                    label="Leave channel"
                    onClick={async () => {
                      await chatLeave(info.id)
                      await refreshList()
                      setChannelId(null)
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
                      if (!r.ok) return convo.setError(r.error)
                      await refreshList()
                      setChannelId(null)
                    }}
                  >
                    <Archive className="h-[18px] w-[18px]" />
                  </IconBtn>
                ) : null}
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <div
                ref={scroller}
                onScroll={(e) => {
                  const el = e.currentTarget
                  stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
                  if (stick.current) setUnseen(0)
                }}
                className="h-full overflow-y-auto px-2 py-4 sm:px-4"
              >
                {convo.more ? (
                  <div className="mb-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        olderFrom.current = scroller.current?.scrollHeight ?? null
                        void convo.loadOlder()
                      }}
                    >
                      Load earlier messages
                    </Button>
                  </div>
                ) : (
                  <Intro info={info} me={me} />
                )}
                <MessageList
                  messages={convo.messages}
                  meId={me.id}
                  isAdmin={overview.isAdmin}
                  people={peopleBy}
                  newSince={convo.myLastReadAt}
                  newUntil={convo.openedAt}
                  highlight={highlight}
                  editReq={editReq}
                  onReact={react(convo)}
                  onReply={(m) => open(channelId, { thread: m.id })}
                  onDelete={remove(convo)}
                  onEdited={edited(convo)}
                  onOpenFile={(m, index) => setViewing({ scope: 'main', messageId: m.id, index })}
                />
                {seen ? <p className="pr-3 pt-1 text-right text-[11px] text-muted-foreground">✓ Seen</p> : null}
              </div>
              {unseen > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    stick.current = true
                    setUnseen(0)
                    scroller.current?.scrollTo({
                      top: scroller.current.scrollHeight,
                      behavior: 'smooth',
                    })
                  }}
                  className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground shadow-lg transition-transform hover:-translate-y-px"
                >
                  <ArrowDown className="h-3.5 w-3.5" /> {unseen} new {unseen === 1 ? 'message' : 'messages'}
                </button>
              ) : null}
            </div>

            <Typing names={convo.typing} />
            {convo.error ? (
              <div role="alert" className="mx-4 mb-2 flex items-center justify-between rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {convo.error}
                <button type="button" onClick={() => convo.setError(null)} aria-label="Dismiss">
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
                    convo.setInfo({ ...info, member: true })
                    await refreshList()
                  }}
                >
                  Join channel
                </Button>
              </div>
            ) : null}
            <Composer key={info.id} channelId={info.id} placeholder={info.kind === 'DM' ? `Message ${info.name}` : `Message #${info.name}`} people={overview.people.filter((p) => p.id !== me.id)} filesEnabled={overview.files} onSend={(t, f) => send(t, f, null)} onEditLast={editLast(convo, setEditReq)} />
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
              <Hash className="h-6 w-6" />
            </span>
            <p className="text-sm text-muted-foreground">{convo.loading ? 'Loading…' : convo.error ? convo.error : 'Pick a channel or a teammate to start talking.'}</p>
          </div>
        )}
      </section>

      {/* thread */}
      {channelId && threadId ? (
        <section className="flex w-full min-w-0 flex-col border-l bg-card lg:w-[380px] lg:shrink-0" aria-label="Thread">
          <header className="flex items-center gap-2 border-b px-4 py-3">
            <MessageSquareReply className="h-4 w-4 text-primary" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[15px] font-semibold">Thread</h2>
              {info ? <p className="truncate text-xs text-muted-foreground">{info.kind === 'DM' ? info.name : `#${info.name}`}</p> : null}
            </div>
            <IconBtn label="Close thread" onClick={() => open(channelId)}>
              <X className="h-[18px] w-[18px]" />
            </IconBtn>
          </header>
          <div ref={threadScroller} className="flex-1 overflow-y-auto px-2 py-3">
            {thread.parent ? (
              <div className="border-b pb-3">
                <Message m={thread.parent} grouped={false} meId={me.id} canDelete={thread.parent.userId === me.id || overview.isAdmin} people={peopleBy} onReact={react(thread)} onDelete={remove(thread)} onEdited={edited(thread)} onOpenFile={(m, index) => setViewing({ scope: 'thread', messageId: m.id, index })} />
                <p className="mt-2 px-2 text-xs text-muted-foreground">
                  {replies} {replies === 1 ? 'reply' : 'replies'}
                </p>
              </div>
            ) : thread.loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : null}
            <MessageList messages={thread.messages} meId={me.id} isAdmin={overview.isAdmin} people={peopleBy} newSince={null} highlight={highlight} editReq={threadEditReq} onReact={react(thread)} onDelete={remove(thread)} onEdited={edited(thread)} onOpenFile={(m, index) => setViewing({ scope: 'thread', messageId: m.id, index })} />
          </div>
          <Typing names={thread.typing} />
          {thread.error ? (
            <div role="alert" className="mx-3 mb-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {thread.error}
            </div>
          ) : null}
          <Composer key={threadId} channelId={channelId} threadId={threadId} placeholder="Reply in thread…" people={overview.people.filter((p) => p.id !== me.id)} filesEnabled={overview.files} onSend={(t, f) => send(t, f, threadId)} onEditLast={editLast(thread, setThreadEditReq)} autoFocus />
        </section>
      ) : null}

      {viewing && channelId
        ? (() => {
            const items = mediaIn(viewing.scope === 'thread' ? [...(thread.parent ? [thread.parent] : []), ...thread.messages] : convo.messages)
            const start = items.findIndex((it) => it.m.id === viewing.messageId && it.index === viewing.index)
            return (
              <MediaViewer
                key={`${viewing.scope}-${viewing.messageId}-${viewing.index}`}
                items={items}
                start={Math.max(start, 0)}
                people={peopleBy}
                meId={me.id}
                conversations={overview.channels}
                onClose={() => setViewing(null)}
                onReply={viewing.scope === 'main' ? (m) => open(channelId, { thread: m.id }) : undefined}
                onReact={(m, e) => void react(viewing.scope === 'thread' ? thread : convo)(m, e)}
              />
            )
          })()
        : null}
      <NewChannelDialog open={dialog === 'channel'} people={overview.people.filter((p) => p.id !== me.id)} onClose={() => setDialog(null)} onCreated={async (id) => (setDialog(null), await refreshList(), open(id))} />
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
              const r = await chatAddMembers({
                channelId: info.id,
                userIds: ids,
              })
              setDialog(null)
              if (!r.ok) convo.setError(r.error)
              else open(info.id)
            }}
          />
          <TopicDialog open={dialog === 'topic'} info={info} onClose={() => setDialog(null)} onSaved={async () => (setDialog(null), await refreshList(), open(info.id))} />
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
      <div className="mb-3">
        {info.kind === 'DM' ? (
          <Avatar name={info.name} photo={info.members.find((m) => m.id !== me.id)?.photo ?? null} size={52} />
        ) : (
          <span className="flex h-[52px] w-[52px] items-center justify-center rounded-[14px] bg-primary/10 text-primary">{info.private ? <Lock className="h-6 w-6" /> : <Hash className="h-6 w-6" />}</span>
        )}
      </div>
      <h2 className="text-[22px] font-semibold tracking-[-0.025em]">{info.kind === 'DM' ? info.name : `Welcome to #${info.name}`}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{info.kind === 'DM' ? `This is the start of your conversation with ${info.name}. Only the two of you can see it.` : info.private ? 'A private channel: only its members can see it.' : `The start of #${info.name}. Everyone on the team can read and join it.`}</p>
    </div>
  )
}

/**
 * How this browser tells you about new messages (ChatPulse does the telling): desktop alerts while the tab is in the
 * background, and the chime on or off. Both are this browser's own choice.
 */
function NotifySettings(): React.ReactElement {
  const [state, setState] = useState<NotificationPermission | 'unsupported'>('default')
  const [sound, setSound] = useState(true)
  useEffect(() => {
    setState(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
    setSound(chatSoundEnabled())
  }, [])
  const toggleSound = (): void => {
    const on = !sound
    setChatSoundEnabled(on)
    setSound(on)
    if (on) void playChatSound('soft', { force: true })
  }
  return (
    <div className="space-y-2 border-t p-3">
      {state === 'denied' ? (
        <p className="text-[11px] text-muted-foreground">Desktop alerts are blocked for this site in your browser settings.</p>
      ) : state === 'default' ? (
        <button
          type="button"
          onClick={() => void Notification.requestPermission().then(setState)}
          title="Get a desktop alert for new messages while this tab is in the background"
          className="flex w-full items-center gap-2.5 rounded-sm border bg-card px-3 py-2 text-left text-xs font-medium shadow-sm transition-colors hover:border-primary/40"
        >
          <Bell className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0">
            Turn on desktop alerts
            <span className="block truncate font-normal text-muted-foreground">For messages while you’re elsewhere</span>
          </span>
        </button>
      ) : null}
      <div className="flex items-center gap-1 px-1">
        <button
          type="button"
          role="switch"
          aria-checked={sound}
          onClick={toggleSound}
          title={sound ? 'Turn the message sound off' : 'Turn the message sound on'}
          className="flex min-w-0 flex-1 items-center gap-2 rounded-sm py-1 text-left text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {sound ? <Volume2 className="h-4 w-4 shrink-0 text-primary" /> : <VolumeX className="h-4 w-4 shrink-0" />}
          <span className="truncate">{sound ? 'Sound on for new messages' : 'Sound off'}</span>
        </button>
        <button type="button" onClick={() => void playChatSound('chime', { force: true })} aria-label="Hear the message sound" title="Hear it" className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Play className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
