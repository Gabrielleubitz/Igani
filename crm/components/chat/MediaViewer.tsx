'use client'

import { ChevronLeft, ChevronRight, Download, FileText, Forward, Hash, Lock, MessageSquareReply, Search, SmilePlus, X, ZoomIn, ZoomOut } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { chatForward, type ChatChannelRow, type ChatFileRow, type ChatMessageRow } from '@/app/actions/chat'
import { Avatar, Body, EMOJI, type Emoji } from '@/components/chat/ChatParts'
import type { ChatPerson } from '@/lib/chat'
import { cn } from '@/lib/utils'

export interface MediaItem {
  m: ChatMessageRow
  index: number
  file: ChatFileRow
}

/** Every file in these messages, in order (what the viewer pages through). */
export const mediaIn = (messages: ChatMessageRow[]): MediaItem[] => messages.flatMap((m) => (m.deleted ? [] : m.files.map((file, index) => ({ m, index, file }))))

const sizeLabel = (n: number): string => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)
const when = (iso: string): string => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  const y = new Date(Date.now() - 86_400_000).toDateString() === d.toDateString()
  const t = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return today ? `Today at ${t}` : y ? `Yesterday at ${t}` : `${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' })} at ${t}`
}

/**
 * The full-screen viewer for photos and files shared in chat, like WhatsApp's: who sent it and when, the caption,
 * zoom, arrows / swipe / keys between everything in the conversation, and Reply, React, Forward and Download.
 */
export function MediaViewer({
  items,
  start,
  people,
  meId,
  conversations,
  onClose,
  onReply,
  onReact,
}: {
  items: MediaItem[]
  start: number
  people: Map<string, ChatPerson>
  meId: string
  /** where Forward can send it */
  conversations: ChatChannelRow[]
  onClose: () => void
  /** open the thread under this message (absent inside a thread) */
  onReply?: (m: ChatMessageRow) => void
  onReact: (m: ChatMessageRow, e: Emoji) => void
}): React.ReactElement | null {
  const [at, setAt] = useState(Math.min(Math.max(start, 0), Math.max(items.length - 1, 0)))
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [loaded, setLoaded] = useState<Record<string, boolean>>({})
  const [panel, setPanel] = useState<null | 'react' | 'forward'>(null)
  const [toast, setToast] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const strip = useRef<HTMLDivElement>(null)
  const item = items[at]

  const go = useCallback(
    (d: number) => {
      setAt((i) => Math.min(Math.max(i + d, 0), items.length - 1))
      setZoom(1)
      setPan({ x: 0, y: 0 })
      setPanel(null)
    },
    [items.length],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') return void (panel ? setPanel(null) : onClose())
      if (panel) return
      if (e.key === 'ArrowRight') go(1)
      if (e.key === 'ArrowLeft') go(-1)
      if (e.key === '+' || e.key === '=') setZoom((z) => Math.min(z * 1.5, 5))
      if (e.key === '-') setZoom((z) => (z / 1.5 <= 1.05 ? (setPan({ x: 0, y: 0 }), 1) : z / 1.5))
    }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [go, onClose, panel])

  // keep the current thumbnail in view
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${at}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [at])

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(t)
  }, [toast])

  if (!item || typeof document === 'undefined') return null
  const { m, file } = item
  const key = `${m.id}-${item.index}`
  const isImage = file.view === 'image'

  const zoomAt = (clientX: number, clientY: number, el: HTMLElement): void => {
    if (zoom > 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    const r = el.getBoundingClientRect()
    const z = 2.5
    setZoom(z)
    setPan({ x: (r.left + r.width / 2 - clientX) * (z - 1), y: (r.top + r.height / 2 - clientY) * (z - 1) })
  }

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${file.name}, from ${m.name}`} className="fixed inset-0 z-[80] flex flex-col bg-[#0b0f17]/95 text-white backdrop-blur-sm animate-in fade-in duration-150">
      {/* top bar: who and when, then the actions */}
      <header className="flex items-center gap-3 px-3 py-2.5 sm:px-5">
        <Avatar name={m.name} photo={m.photo} size={38} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[15px] font-semibold">{m.userId === meId ? 'You' : m.name}</div>
          <div className="truncate text-xs text-white/60">
            {when(m.at)}
            {items.length > 1 ? ` · ${at + 1} of ${items.length}` : ''}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {isImage ? (
            <Tool label={zoom > 1 ? 'Zoom out' : 'Zoom in'} onClick={() => (zoom > 1 ? (setZoom(1), setPan({ x: 0, y: 0 })) : setZoom(2))} className="hidden sm:flex">
              {zoom > 1 ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </Tool>
          ) : null}
          {onReply ? (
            <Tool label="Reply" onClick={() => (onReply(m), onClose())}>
              <MessageSquareReply className="h-5 w-5" />
            </Tool>
          ) : null}
          <Tool label="React" active={panel === 'react'} onClick={() => setPanel((p) => (p === 'react' ? null : 'react'))}>
            <SmilePlus className="h-5 w-5" />
          </Tool>
          <Tool label="Forward" active={panel === 'forward'} onClick={() => setPanel((p) => (p === 'forward' ? null : 'forward'))}>
            <Forward className="h-5 w-5" />
          </Tool>
          <a href={file.download} download={file.name} aria-label="Download" title="Download" className="flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white">
            <Download className="h-5 w-5" />
          </a>
          <span className="mx-1 h-6 w-px bg-white/15" aria-hidden />
          <Tool label="Close" onClick={onClose}>
            <X className="h-6 w-6" />
          </Tool>
        </div>
      </header>

      {/* the picture (or video / PDF / file) */}
      <div
        className="relative flex min-h-0 flex-1 select-none items-center justify-center overflow-hidden px-2 sm:px-16"
        onClick={(e) => e.target === e.currentTarget && !panel && onClose()}
        onWheel={(e) => {
          if (!isImage) return
          setZoom((z) => {
            const n = Math.min(Math.max(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1), 5)
            if (n === 1) setPan({ x: 0, y: 0 })
            return n
          })
        }}
        onTouchStart={(e) => (swipe.current = zoom === 1 && e.touches.length === 1 ? { x: e.touches[0]!.clientX, y: e.touches[0]!.clientY } : null)}
        onTouchEnd={(e) => {
          const s = swipe.current
          swipe.current = null
          if (!s) return
          const dx = e.changedTouches[0]!.clientX - s.x
          const dy = e.changedTouches[0]!.clientY - s.y
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1)
          else if (dy > 90 && Math.abs(dy) > Math.abs(dx)) onClose()
        }}
      >
        {isImage ? (
          <>
            {!loaded[key] ? <span className="absolute h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" aria-hidden /> : null}
            {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed file */}
            <img
              key={key}
              src={file.viewUrl}
              alt={file.name}
              draggable={false}
              onLoad={() => setLoaded((l) => ({ ...l, [key]: true }))}
              onPointerDown={(e) => {
                if (zoom === 1) return
                ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
                drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }
              }}
              onPointerMove={(e) => {
                const d = drag.current
                if (!d) return
                if (Math.abs(e.clientX - d.x) + Math.abs(e.clientY - d.y) > 4) d.moved = true
                setPan({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y })
              }}
              onPointerUp={() => setTimeout(() => (drag.current = null), 0)}
              onClick={(e) => {
                if (drag.current?.moved) return
                zoomAt(e.clientX, e.clientY, e.currentTarget)
              }}
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: drag.current ? 'none' : 'transform 180ms ease-out' }}
              className={cn('max-h-full max-w-full rounded-sm object-contain shadow-2xl transition-opacity', loaded[key] ? 'opacity-100' : 'opacity-0', zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
            />
          </>
        ) : file.view === 'video' ? (
          <video key={key} src={file.viewUrl} controls autoPlay playsInline className="max-h-full max-w-full rounded-sm bg-black shadow-2xl" />
        ) : file.view === 'pdf' ? (
          <iframe key={key} src={file.viewUrl} title={file.name} className="h-full w-full max-w-4xl rounded-sm bg-white shadow-2xl" />
        ) : (
          <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-10 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <FileText className="h-8 w-8" />
            </span>
            <div className="min-w-0">
              <div className="break-words text-base font-semibold">{file.name}</div>
              <div className="mt-1 text-sm text-white/60">{sizeLabel(file.bytes)} · no preview for this kind of file</div>
            </div>
            <a href={file.download} download={file.name} className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#0b0f17] transition-transform hover:-translate-y-px">
              <Download className="h-4 w-4" /> Download
            </a>
          </div>
        )}

        {at > 0 ? (
          <NavBtn side="left" onClick={() => go(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </NavBtn>
        ) : null}
        {at < items.length - 1 ? (
          <NavBtn side="right" onClick={() => go(1)}>
            <ChevronRight className="h-6 w-6" />
          </NavBtn>
        ) : null}

        {panel === 'react' ? (
          <div className="absolute right-3 top-2 z-10 flex items-center gap-0.5 rounded-full border border-white/10 bg-[#1b2230] px-2 py-1.5 shadow-2xl sm:right-24">
            {EMOJI.map((e) => {
              const mine = m.reactions.some((r) => r.emoji === e && r.mine)
              return (
                <button key={e} type="button" aria-label={`React ${e}`} onClick={() => (onReact(m, e), setPanel(null), setToast(mine ? 'Reaction removed' : `Reacted ${e}`))} className={cn('rounded-full p-1.5 text-[22px] leading-none transition-transform hover:scale-125', mine && 'bg-white/15')}>
                  {e}
                </button>
              )
            })}
          </div>
        ) : null}
        {panel === 'forward' ? <ForwardPanel item={item} conversations={conversations} onClose={() => setPanel(null)} onDone={(where) => (setPanel(null), setToast(`Forwarded to ${where}`))} /> : null}
        {toast ? (
          <div role="status" className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#0b0f17] shadow-xl animate-in fade-in slide-in-from-bottom-2">
            {toast}
          </div>
        ) : null}
      </div>

      {/* caption, then every file in the conversation */}
      <footer className="space-y-2 px-3 pb-3 pt-2 sm:px-5">
        {m.body ? (
          <div className="mx-auto max-h-24 max-w-3xl overflow-y-auto text-center [&_*]:!text-white/90">
            <Body text={m.body} people={people} meId={meId} />
          </div>
        ) : (
          <p className="truncate text-center text-xs text-white/50">
            {file.forwarded ? 'Forwarded · ' : ''}
            {file.name} · {sizeLabel(file.bytes)}
          </p>
        )}
        {m.reactions.length ? (
          <div className="flex justify-center gap-1">
            {m.reactions.map((r) => (
              <span key={r.emoji} title={r.names.join(', ')} className={cn('rounded-full border px-2 py-0.5 text-xs', r.mine ? 'border-white/40 bg-white/15' : 'border-white/15 bg-white/5')}>
                {r.emoji} <b className="tabular-nums">{r.count}</b>
              </span>
            ))}
          </div>
        ) : null}
        {items.length > 1 ? (
          <div ref={strip} className="mx-auto flex max-w-full justify-start gap-1.5 overflow-x-auto pb-1 sm:justify-center [scrollbar-width:none]">
            {items.map((it, i) => (
              <button
                key={`${it.m.id}-${it.index}`}
                data-i={i}
                type="button"
                onClick={() => go(i - at)}
                aria-label={`${it.file.name}, ${i + 1} of ${items.length}`}
                aria-current={i === at}
                className={cn('relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-all', i === at ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-90')}
              >
                {it.file.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a private, signed preview
                  <img src={it.file.thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-white/10 text-[10px] font-bold uppercase">{it.file.view === 'video' ? '▶' : (it.file.name.split('.').pop() ?? 'file').slice(0, 4)}</span>
                )}
              </button>
            ))}
          </div>
        ) : null}
      </footer>
      {/* the neighbours load ahead, so arrows feel instant */}
      <div className="hidden" aria-hidden>
        {[items[at - 1], items[at + 1]].map((n) =>
          n?.file.view === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element -- preload
            <img key={`${n.m.id}-${n.index}`} src={n.file.viewUrl} alt="" />
          ) : null,
        )}
      </div>
    </div>,
    document.body,
  )
}

function Tool({ label, onClick, active, className, children }: { label: string; onClick: () => void; active?: boolean; className?: string; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn('flex h-10 w-10 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white', active && 'bg-white/15 text-white', className)}>
      {children}
    </button>
  )
}

function NavBtn({ side, onClick, children }: { side: 'left' | 'right'; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} aria-label={side === 'left' ? 'Previous' : 'Next'} className={cn('absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition-colors hover:bg-white/20 sm:flex', side === 'left' ? 'left-3' : 'right-3')}>
      {children}
    </button>
  )
}

/** Pick a conversation and send the file there. */
function ForwardPanel({ item, conversations, onClose, onDone }: { item: MediaItem; conversations: ChatChannelRow[]; onClose: () => void; onDone: (where: string) => void }): React.ReactElement {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    return conversations.filter((c) => (c.kind === 'DM' || c.member) && (!n || c.name.toLowerCase().includes(n)))
  }, [conversations, q])
  const send = async (c: ChatChannelRow): Promise<void> => {
    setBusy(c.id)
    setError(null)
    const r = await chatForward({ messageId: item.m.id, index: item.index, toChannelId: c.id })
    setBusy(null)
    if (!r.ok) return setError(r.error)
    onDone(c.kind === 'DM' ? c.name : `#${c.name}`)
  }
  return (
    <div className="absolute right-3 top-2 z-10 flex max-h-[min(460px,calc(100%-1rem))] w-[min(340px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1b2230] text-white shadow-2xl sm:right-24">
      <div className="flex items-center justify-between px-4 pb-2 pt-3">
        <span className="text-sm font-semibold">Forward to…</span>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-full p-1 text-white/70 hover:bg-white/10 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="relative px-3 pb-2">
        <Search className="pointer-events-none absolute left-[22px] top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/30" />
      </div>
      {error ? <p className="px-4 pb-2 text-xs text-rose-300">{error}</p> : null}
      <ul className="min-h-0 flex-1 overflow-y-auto pb-2">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" disabled={Boolean(busy)} onClick={() => void send(c)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm transition-colors hover:bg-white/5 disabled:opacity-60">
              {c.kind === 'DM' ? (
                <Avatar name={c.name} photo={c.dm?.photo ?? null} size={30} />
              ) : (
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-lg bg-white/10">{c.private ? <Lock className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}</span>
              )}
              <span className="min-w-0 flex-1 truncate">{c.kind === 'DM' ? c.name : `#${c.name}`}</span>
              {busy === c.id ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" /> : <Forward className="h-4 w-4 text-white/40" />}
            </button>
          </li>
        ))}
        {!list.length ? <li className="px-4 py-3 text-sm text-white/50">No conversations match.</li> : null}
      </ul>
    </div>
  )
}
