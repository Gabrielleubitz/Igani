'use client'

import { MessagesSquare, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { chatPulse, type ChatPulse as Pulse } from '@/app/actions/chat'
import { CHAT_UNREAD_EVENT } from '@/components/AppNav'

const SEEN_KEY = 'igani-chat-seen'
const linkFor = (l: NonNullable<Pulse['latest']>): string => `/sales/chat?c=${l.channelId}${l.threadId ? `&t=${l.threadId}` : ''}`

/**
 * On every CRM page: the tab title shows unread chat messages, and a direct message or @mention pops up a card (once
 * per message) that opens the conversation. Quiet while you're on the chat page itself.
 */
export function ChatPulse({ initialUnread }: { initialUnread: number }): React.ReactElement | null {
  const path = usePathname()
  const [card, setCard] = useState<Pulse['latest']>(null)
  const unread = useRef(initialUnread)
  const base = useRef<string | null>(null)
  const notified = useRef<string | null>(null)

  useEffect(() => {
    const title = (): void => {
      if (base.current === null) base.current = document.title.replace(/^\(\d+\) /, '')
      document.title = unread.current > 0 ? `(${unread.current}) ${base.current}` : base.current
    }
    let stop = false
    const tick = async (): Promise<void> => {
      // in the background, keep checking only when desktop alerts are on
      const alerts = typeof Notification !== 'undefined' && Notification.permission === 'granted'
      if (document.hidden && !alerts) return
      const r = await chatPulse()
      if (stop || !r.ok) return
      unread.current = r.data.unread
      window.dispatchEvent(new CustomEvent(CHAT_UNREAD_EVENT, { detail: r.data.unread }))
      base.current = null
      title()
      const l = r.data.latest
      let seen: string | null = null
      try {
        seen = window.localStorage.getItem(SEEN_KEY)
      } catch {
        /* storage blocked: show it anyway */
      }
      const onChat = window.location.pathname.startsWith('/sales/chat')
      if (l && l.id !== seen && document.hidden && alerts && l.id !== notified.current) {
        notified.current = l.id
        try {
          const n = new Notification(`${l.from} · ${l.where}`, { body: l.preview, tag: `igani-chat-${l.channelId}`, icon: l.photo ?? '/apple-touch-icon.png' })
          n.onclick = () => {
            window.focus()
            window.location.href = linkFor(l)
            n.close()
          }
        } catch {
          /* some browsers only allow notifications from a service worker */
        }
      }
      if (l && l.id !== seen && !onChat) setCard(l)
    }
    title()
    void tick()
    const t = window.setInterval(() => void tick(), 15000)
    return () => {
      stop = true
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
