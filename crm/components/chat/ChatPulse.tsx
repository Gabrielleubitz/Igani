'use client'

import { MessagesSquare, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { chatPulse, type ChatPulseItem } from '@/app/actions/chat'
import { CHAT_UNREAD_EVENT } from '@/components/AppNav'
import { chatSoundReady, playChatSound, unlockChatSound } from '@/components/chat/chat-sound'

const SEEN_KEY = 'igani-chat-seen'
const TICK_MS = 8000
/** a message saved a moment before the last check answered still counts as new (the clock and the write race) */
const GRACE_MS = 3000
/** a card for a channel or thread message fades on its own; one for a direct message or @mention stays until you act */
const FADE_MS = 10000
const linkFor = (l: ChatPulseItem): string => `/sales/chat?c=${l.channelId}${l.threadId ? `&t=${l.threadId}` : ''}`

/** The conversation open on the chat page (its address keeps up with what's open). */
function openConversation(): { channelId: string; threadId: string | null } | null {
  if (!window.location.pathname.startsWith('/sales/chat')) return null
  const q = new URLSearchParams(window.location.search)
  const c = q.get('c')
  return c ? { channelId: c, threadId: q.get('t') } : null
}

const viewing = (m: ChatPulseItem): boolean => {
  const open = openConversation()
  return Boolean(open && open.channelId === m.channelId && (!m.threadId || open.threadId === m.threadId))
}

const alertsOn = (): boolean => typeof Notification !== 'undefined' && Notification.permission === 'granted'

function showNotification(m: ChatPulseItem): void {
  try {
    // our chime plays when it can; the browser's own sound only when it can't (nothing clicked yet this visit)
    const n = new Notification(`${m.from} · ${m.where}`, { body: m.preview, tag: `igani-chat-${m.channelId}`, icon: m.photo ?? '/apple-touch-icon.png', silent: chatSoundReady() })
    n.onclick = () => {
      window.focus()
      window.location.href = linkFor(m)
      n.close()
    }
  } catch {
    /* some browsers only allow notifications from a service worker */
  }
}

// kept across pages: what's been announced, and when the last check was answered
let cursor: number | null = null
const announced = new Set<string>()

/**
 * On every CRM page: the tab title shows unread chat messages, and each new message that's for you (a direct message,
 * an @mention, a reply in your thread, a channel you haven't muted) is announced once. Away from the tab: a desktop
 * notification and the chime. On another page: a card and a softer note. On the chat page: the note, for
 * conversations other than the one on screen.
 */
export function ChatPulse({ initialUnread }: { initialUnread: number }): React.ReactElement | null {
  const path = usePathname()
  const [card, setCard] = useState<ChatPulseItem | null>(null)
  const unread = useRef(initialUnread)
  const base = useRef<string | null>(null)

  useEffect(() => unlockChatSound(), [])

  useEffect(() => {
    const title = (): void => {
      if (base.current === null) base.current = document.title.replace(/^\(\d+\) /, '')
      document.title = unread.current > 0 ? `(${unread.current}) ${base.current}` : base.current
    }
    let stop = false
    let busy = false
    let skipped = 0
    const tick = async (): Promise<void> => {
      // a hidden tab checks half as often (and the browser slows it further on its own)
      if (document.hidden && skipped++ % 2) return
      if (busy) return
      busy = true
      const r = await chatPulse()
        .catch(() => null)
        .finally(() => (busy = false))
      if (stop || !r?.ok) return
      const onChat = window.location.pathname.startsWith('/sales/chat')
      // on the chat page, the page itself keeps the count (it knows what you've just read)
      if (!onChat) {
        unread.current = r.data.unread
        window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT, { detail: r.data.unread }))
      }
      base.current = null
      title()

      const since = cursor
      cursor = Date.parse(r.data.now) - GRACE_MS
      // the first check after a load only sets the clock: what was already unread isn't news
      const fresh = since === null ? [] : r.data.latest.filter((m) => Date.parse(m.at) > since && !announced.has(m.id)).reverse()
      for (const m of fresh) announced.add(m.id)
      if (announced.size > 300) for (const id of [...announced].slice(0, 150)) announced.delete(id)
      const away = document.hidden || !document.hasFocus()
      const news = fresh.filter((m) => away || !viewing(m))
      if (news.length) {
        if (away) {
          if (alertsOn()) for (const m of news) showNotification(m)
          void playChatSound('chime')
        } else void playChatSound('soft')
      }

      // the card: the newest unread message for you, until it's read (here, on the phone, in another tab) or dismissed
      const l = r.data.latest[0] ?? null
      let seen: string | null = null
      try {
        seen = window.localStorage.getItem(SEEN_KEY)
      } catch {
        /* storage blocked: show it anyway */
      }
      setCard(l && l.id !== seen && !onChat ? l : null)
    }
    // the chat page reports what you've read right away
    const onCount = (e: Event): void => {
      unread.current = (e as CustomEvent<number>).detail
      base.current = null
      title()
    }
    const onVisible = (): void => void (!document.hidden && tick())
    window.addEventListener(CHAT_UNREAD_EVENT, onCount)
    document.addEventListener('visibilitychange', onVisible)
    title()
    void tick()
    const t = window.setInterval(() => void tick(), TICK_MS)
    return () => {
      stop = true
      window.removeEventListener(CHAT_UNREAD_EVENT, onCount)
      document.removeEventListener('visibilitychange', onVisible)
      window.clearInterval(t)
    }
  }, [path])

  const dismiss = (): void => {
    if (card)
      try {
        window.localStorage.setItem(SEEN_KEY, card.id)
      } catch {
        /* ignore */
      }
    setCard(null)
  }

  // channel and thread cards fade by themselves (a direct message or @mention waits for you)
  const sticky = card?.reason === 'dm' || card?.reason === 'mention'
  const cardId = card?.id
  useEffect(() => {
    if (!cardId || sticky) return
    const t = window.setTimeout(dismiss, FADE_MS)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- a new card restarts its own timer
  }, [cardId, sticky])

  if (!card || path.startsWith('/sales/chat')) return null
  return (
    <div role="status" className="fixed bottom-5 left-5 z-[55] w-[min(360px,calc(100vw-2.5rem))] animate-in fade-in slide-in-from-bottom-3 rounded-2xl border bg-card/95 p-3 shadow-2xl backdrop-blur">
      <div className="flex items-start gap-3">
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
          <MessagesSquare className="h-[18px] w-[18px]" />
          {/* eslint-disable-next-line @next/next/no-img-element -- our cached avatar */}
          {card.photo ? <img src={card.photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
        </span>
        <Link href={linkFor(card)} onClick={dismiss} className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">
            {card.from} <span className="font-normal text-muted-foreground">· {card.where}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{card.preview}</p>
          <span className="mt-1 inline-block text-xs font-medium text-primary">Reply</span>
        </Link>
        <button type="button" onClick={dismiss} aria-label="Dismiss" className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
