'use client'

import { Download, Eye, FileText, Forward, Loader2, MessageSquareReply, Paperclip, Pencil, PlayCircle, SendHorizontal, SmilePlus, Trash2, UserRound, X } from 'lucide-react'
import Link from 'next/link'
import { useLayoutEffect, useRef, useState } from 'react'
import { chatEdit, chatTyping, chatUploadTicket, type ChatMessageRow } from '@/app/actions/chat'
import type { ChatPerson } from '@/lib/chat'
import { cn } from '@/lib/utils'

export const EMOJI = ['👍', '❤️', '😂', '🎉', '🔥', '👀', '✅', '🙏'] as const
export type Emoji = (typeof EMOJI)[number]
export type Pending = ChatMessageRow & { pending?: boolean; failed?: boolean }

/* ---------- people ---------- */

export function Avatar({ name, photo, size = 36, online, className }: { name: string; photo: string | null; size?: number; online?: boolean; className?: string }): React.ReactElement {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')
  return (
    <span className={cn('relative inline-flex shrink-0', className)} style={{ width: size, height: size }}>
      <span aria-hidden className="relative inline-flex h-full w-full items-center justify-center overflow-hidden rounded-[30%] bg-primary/15 font-semibold text-primary ring-1 ring-border" style={{ fontSize: size * 0.36 }}>
        {initials || '?'}
        {/* eslint-disable-next-line @next/next/no-img-element -- our cached avatar */}
        {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" referrerPolicy="no-referrer" /> : null}
      </span>
      {online !== undefined ? (
        <span className={cn('absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-card', online ? 'bg-emerald-500' : 'bg-muted-foreground/40')} style={{ width: Math.max(8, size * 0.28), height: Math.max(8, size * 0.28) }} aria-label={online ? 'Online' : 'Away'} />
      ) : null}
    </span>
  )
}

/* ---------- text ---------- */

export const dayLabel = (d: Date): string => {
  const today = new Date()
  const y = new Date(today)
  y.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === y.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', ...(d.getFullYear() !== today.getFullYear() ? { year: 'numeric' } : {}) })
}
export const timeLabel = (d: Date): string => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
export const ago = (iso: string): string => {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const bytesLabel = (n: number): string => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

/** One line of message text: mentions as chips, links, `code`, *bold*, _italic_, ~strike~. */
function Inline({ text, people, meId }: { text: string; people: Map<string, ChatPerson>; meId: string }): React.ReactElement {
  const parts = text.split(/(<@[a-z0-9]{20,40}>|https?:\/\/[^\s<]+|`[^`\n]+`|(?<![\w*])\*[^*\n]+\*(?![\w*])|(?<![\w_])_[^_\n]+_(?![\w_])|~[^~\n]+~)/gi)
  return (
    <>
      {parts.map((p, i) => {
        if (!p) return null
        const m = p.match(/^<@([a-z0-9]{20,40})>$/i)
        if (m) {
          const who = people.get(m[1]!)
          return (
            <span key={i} className={cn('rounded px-1 py-px font-medium', m[1] === meId ? 'bg-amber-400/20 text-amber-700 dark:text-amber-200' : 'bg-primary/10 text-primary')}>
              @{who?.name ?? 'someone'}
            </span>
          )
        }
        if (/^https?:\/\//i.test(p)) {
          const [, href = p, tail = ''] = p.match(/^(.*?)([.,;:!?)\]'"]*)$/) ?? []
          return (
            <span key={i}>
              <a href={href} target="_blank" rel="noopener noreferrer" className="break-words text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary">
                {href}
              </a>
              {tail}
            </span>
          )
        }
        if (/^`.+`$/.test(p))
          return (
            <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.86em]">
              {p.slice(1, -1)}
            </code>
          )
        if (/^\*.+\*$/.test(p)) return <strong key={i}>{p.slice(1, -1)}</strong>
        if (/^_.+_$/.test(p)) return <em key={i}>{p.slice(1, -1)}</em>
        if (/^~.+~$/.test(p)) return <s key={i}>{p.slice(1, -1)}</s>
        return <span key={i}>{p}</span>
      })}
    </>
  )
}

/** Message text: ```code blocks``` and > quotes, then inline formatting. */
export function Body({ text, people, meId }: { text: string; people: Map<string, ChatPerson>; meId: string }): React.ReactElement {
  const blocks = text.split(/(```[\s\S]*?```)/g)
  return (
    <div className="space-y-1 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground/95">
      {blocks.map((b, i) =>
        /^```[\s\S]*```$/.test(b) ? (
          <pre key={i} className="overflow-x-auto rounded-sm border bg-muted/60 px-3 py-2 font-mono text-[13px] leading-snug">
            {b.slice(3, -3).replace(/^\n/, '')}
          </pre>
        ) : (
          <div key={i}>
            {b.split('\n').map((line, j, all) =>
              line.startsWith('> ') ? (
                <div key={j} className="border-l-2 border-primary/40 pl-2 text-muted-foreground">
                  <Inline text={line.slice(2)} people={people} meId={meId} />
                </div>
              ) : (
                <span key={j}>
                  <Inline text={line} people={people} meId={meId} />
                  {j < all.length - 1 ? '\n' : null}
                </span>
              ),
            )}
          </div>
        ),
      )}
    </div>
  )
}

/** Plain text for the composer from stored mentions, and back. */
export const toDisplay = (body: string, people: Map<string, ChatPerson>): string => body.replace(/<@([a-z0-9]{20,40})>/gi, (_, id: string) => `@${people.get(id)?.name ?? 'someone'}`)
export function toStored(text: string, people: ChatPerson[]): string {
  let out = text
  for (const p of [...people].sort((a, b) => b.name.length - a.name.length)) {
    const esc = p.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`@${esc}(?![\\p{L}\\p{N}])`, 'giu'), `<@${p.id}>`)
  }
  return out
}

/* ---------- files and leads ---------- */

function Files({ files, onOpen }: { files: ChatMessageRow['files']; onOpen?: (index: number) => void }): React.ReactElement | null {
  if (!files.length) return null
  const indexed = files.map((f, i) => ({ f, i }))
  const images = indexed.filter(({ f }) => f.kind === 'image')
  const docs = indexed.filter(({ f }) => f.kind !== 'image')
  // opens the viewer when the page gives one; a plain link otherwise
  const Open = ({ i, f, className, title, children }: { i: number; f: ChatMessageRow['files'][number]; className: string; title?: string; children: React.ReactNode }): React.ReactElement =>
    onOpen ? (
      <button type="button" onClick={() => onOpen(i)} className={cn('text-left', className)} title={title} aria-label={`Open ${f.name}`}>
        {children}
      </button>
    ) : (
      <a href={f.url} target="_blank" rel="noopener noreferrer" className={className} title={title}>
        {children}
      </a>
    )
  return (
    <div className="mt-1.5 space-y-1.5">
      {files.some((f) => f.forwarded) ? (
        <span className="flex items-center gap-1 text-[11px] italic text-muted-foreground">
          <Forward className="h-3 w-3" /> Forwarded
        </span>
      ) : null}
      {images.length === 1 ? (
        <Open i={images[0]!.i} f={images[0]!.f} title={images[0]!.f.name} className="group/img block w-full max-w-md overflow-hidden rounded-lg border bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary">
          {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed file */}
          <img src={images[0]!.f.thumb ?? images[0]!.f.url} alt={images[0]!.f.name} loading="lazy" className="block max-h-72 w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover/img:scale-[1.02]" style={images[0]!.f.width && images[0]!.f.height ? { aspectRatio: `${images[0]!.f.width} / ${images[0]!.f.height}` } : undefined} />
        </Open>
      ) : images.length ? (
        // several photos: even square tiles, the 4th says how many more (like WhatsApp)
        <div className="grid max-w-[22rem] grid-cols-2 gap-1">
          {images.slice(0, 4).map(({ f, i }, n) => (
            <Open key={f.url} i={i} f={f} title={f.name} className="group/img relative block aspect-square w-full overflow-hidden rounded-lg border bg-muted/40 focus-visible:ring-2 focus-visible:ring-primary">
              {/* eslint-disable-next-line @next/next/no-img-element -- a private, signed file */}
              <img src={f.thumb ?? f.url} alt={f.name} loading="lazy" className="absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover/img:scale-[1.03]" />
              {n === 3 && images.length > 4 ? <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-2xl font-semibold text-white">+{images.length - 4}</span> : null}
            </Open>
          ))}
        </div>
      ) : null}
      {docs.map(({ f, i }) => (
        <Open key={f.url} i={i} f={f} className="flex w-full max-w-sm items-center gap-3 rounded-lg border bg-card px-3 py-2 shadow-sm transition-colors hover:border-primary/40">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">{f.view === 'video' ? <PlayCircle className="h-[18px] w-[18px]" /> : <FileText className="h-[18px] w-[18px]" />}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{f.name}</span>
            <span className="text-xs text-muted-foreground">
              {bytesLabel(f.bytes)}
              {f.view === 'pdf' ? ' · PDF' : f.view === 'video' ? ' · Video' : ''}
            </span>
          </span>
          {f.view ? <Eye className="h-4 w-4 shrink-0 text-muted-foreground" /> : <Download className="h-4 w-4 shrink-0 text-muted-foreground" />}
        </Open>
      ))}
    </div>
  )
}

function LeadCards({ leads }: { leads: ChatMessageRow['leads'] }): React.ReactElement | null {
  if (!leads.length) return null
  return (
    <div className="mt-1.5 flex flex-wrap gap-2">
      {leads.map((l) => (
        <Link key={l.id} href={`/sales/leads/${l.id}`} className="flex min-w-[220px] max-w-sm items-center gap-3 rounded-lg border border-l-[3px] border-l-primary bg-card px-3 py-2 shadow-sm transition-colors hover:border-primary/40">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserRound className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">{l.name}</span>
            <span className="block truncate text-xs text-muted-foreground">{[l.company, l.status.replace(/_/g, ' ').toLowerCase(), l.owner ? `owner ${l.owner}` : 'unassigned'].filter(Boolean).join(' · ')}</span>
          </span>
        </Link>
      ))}
    </div>
  )
}

/* ---------- one message ---------- */

export function Message({
  m,
  grouped,
  meId,
  canDelete,
  people,
  onReact,
  onReply,
  onDelete,
  onEdited,
  highlight,
  editRequest,
  onOpenFile,
}: {
  m: Pending
  grouped: boolean
  meId: string
  canDelete: boolean
  people: Map<string, ChatPerson>
  onReact: (m: ChatMessageRow, e: Emoji) => void
  /** open this message's thread (not shown inside a thread) */
  onReply?: (m: ChatMessageRow) => void
  onDelete: (m: ChatMessageRow) => void
  onEdited: (id: string, body: string) => void
  highlight?: boolean
  /** a number that changes when the composer asks to edit this (Up arrow) */
  editRequest?: number
  /** open a shared file in the viewer */
  onOpenFile?: (m: ChatMessageRow, index: number) => void
}): React.ReactElement {
  const [picking, setPicking] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const lastReq = useRef(editRequest)
  const d = new Date(m.at)
  const mine = m.userId === meId
  if (editRequest !== undefined && editRequest !== lastReq.current) {
    lastReq.current = editRequest
    if (!editing) {
      setDraft(toDisplay(m.body, people))
      setEditing(true)
    }
  }

  if (m.deleted)
    return (
      <div id={`msg-${m.id}`} className={cn('flex gap-3 px-2 py-0.5', !grouped && 'mt-2')}>
        <span className="w-9 shrink-0" />
        <span className="min-w-0">
          <span className="text-sm italic text-muted-foreground">This message was deleted.</span>
          {onReply && m.replyCount > 0 ? (
            <button type="button" onClick={() => onReply(m)} className="ml-2 text-xs font-semibold text-primary hover:underline">
              {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'}
            </button>
          ) : null}
        </span>
      </div>
    )

  const saveEdit = async (): Promise<void> => {
    const body = draft.trim()
    if (!body) return
    const stored = toStored(body, [...people.values()])
    onEdited(m.id, stored)
    setEditing(false)
    await chatEdit({ messageId: m.id, body: stored })
  }

  return (
    <div id={`msg-${m.id}`} className={cn('group relative flex gap-3 rounded-lg px-2 py-1 transition-colors hover:bg-muted/50', !grouped && 'mt-2.5', m.pending && 'opacity-60', m.failed && 'bg-destructive/10', highlight && 'bg-amber-400/15 ring-1 ring-amber-400/40')}>
      {grouped ? <span className="w-9 shrink-0 pt-1 text-right text-[10px] leading-5 text-muted-foreground opacity-0 group-hover:opacity-100">{timeLabel(d)}</span> : <Avatar name={m.name} photo={m.photo} size={36} className="mt-0.5" />}
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
              className="w-full resize-none rounded-sm border bg-card px-3 py-2 text-[14.5px] outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
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
        ) : m.body ? (
          <Body text={m.body} people={people} meId={meId} />
        ) : null}
        {m.edited && !editing ? <span className="text-[11px] text-muted-foreground"> (edited)</span> : null}
        {m.failed ? <span className="text-xs text-destructive">Not sent.</span> : null}
        <Files files={m.files} onOpen={onOpenFile && !m.pending ? (i) => onOpenFile(m, i) : undefined} />
        <LeadCards leads={m.leads} />
        {m.reactions.length ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {m.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={() => onReact(m, r.emoji as Emoji)}
                title={r.names.join(', ')}
                className={cn('flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors', r.mine ? 'border-primary/50 bg-primary/10 text-foreground' : 'border-border bg-muted/50 text-muted-foreground hover:border-foreground/30')}
              >
                <span className="text-[14px] leading-none">{r.emoji}</span>
                <span className="font-semibold tabular-nums">{r.count}</span>
              </button>
            ))}
          </div>
        ) : null}
        {onReply && m.replyCount > 0 ? (
          <button type="button" onClick={() => onReply(m)} className="group/t mt-1 flex items-center gap-2 rounded-md border border-transparent py-1 pl-0.5 pr-2 text-left text-xs transition-colors hover:border-border hover:bg-card">
            <span className="flex -space-x-1.5">
              {m.repliers.map((r, i) => (
                <Avatar key={i} name={r.name} photo={r.photo} size={20} className="ring-2 ring-card [&>span]:rounded-md" />
              ))}
            </span>
            <span className="font-semibold text-primary">
              {m.replyCount} {m.replyCount === 1 ? 'reply' : 'replies'}
            </span>
            {m.lastReplyAt ? <span className="text-muted-foreground group-hover/t:hidden">Last reply {ago(m.lastReplyAt)}</span> : null}
            <span className="hidden text-muted-foreground group-hover/t:inline">View thread</span>
          </button>
        ) : null}
      </div>

      {!m.pending && !editing ? (
        <div className={cn('absolute -top-3.5 right-3 flex items-center rounded-lg border bg-card shadow-md transition-opacity', picking ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100')}>
          {picking ? (
            <div className="flex items-center px-1">
              {EMOJI.map((e) => (
                <button key={e} type="button" className="rounded-md p-1 text-[17px] leading-none transition-transform hover:scale-125" onClick={() => (setPicking(false), onReact(m, e))} aria-label={`React ${e}`}>
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
              {onReply ? (
                <HoverBtn label="Reply in thread" onClick={() => onReply(m)}>
                  <MessageSquareReply className="h-4 w-4" />
                </HoverBtn>
              ) : null}
              {mine && m.body ? (
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
                <HoverBtn label="Delete" onClick={() => window.confirm('Delete this message?') && onDelete(m)}>
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

/* ---------- composer: @mentions, files, typing ---------- */

export interface UploadedFile {
  publicId: string
  kind: 'image' | 'file'
  resourceType: 'image' | 'raw' | 'video'
  format: string | null
  name: string
  bytes: number
  mime: string
  width: number | null
  height: number | null
}
type Upload = { key: string; name: string; preview: string | null; progress: number; done: UploadedFile | null; error: string | null }

/** Straight to Cloudinary with a ticket from the CRM (private, this channel's folder). */
function upload(channelId: string, file: File, onProgress: (p: number) => void): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    void chatUploadTicket(channelId).then((t) => {
      if (!t.ok) return reject(new Error(t.error))
      if (file.size > t.data.maxBytes) return reject(new Error(`${file.name} is over ${Math.round(t.data.maxBytes / 1024 / 1024)} MB.`))
      const fd = new FormData()
      for (const [k, v] of Object.entries(t.data.fields)) fd.append(k, v)
      fd.append('file', file)
      const xhr = new XMLHttpRequest()
      xhr.open('POST', t.data.url)
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total)
      xhr.onerror = () => reject(new Error('The upload failed. Check your connection.'))
      xhr.onload = () => {
        try {
          const r = JSON.parse(xhr.responseText) as { public_id?: string; resource_type?: 'image' | 'raw' | 'video'; format?: string; bytes?: number; width?: number; height?: number; error?: { message: string } }
          if (xhr.status >= 300 || !r.public_id) return reject(new Error(r.error?.message ?? 'The upload failed.'))
          const image = file.type.startsWith('image/') && r.resource_type === 'image' && r.format !== 'pdf'
          resolve({ publicId: r.public_id, kind: image ? 'image' : 'file', resourceType: r.resource_type ?? 'raw', format: r.format ?? null, name: file.name, bytes: r.bytes ?? file.size, mime: file.type || 'application/octet-stream', width: r.width ?? null, height: r.height ?? null })
        } catch {
          reject(new Error('The upload failed.'))
        }
      }
      xhr.send(fd)
    })
  })
}

export function Composer({
  channelId,
  threadId = null,
  placeholder,
  people,
  filesEnabled,
  onSend,
  onEditLast,
  autoFocus,
}: {
  channelId: string
  threadId?: string | null
  placeholder: string
  people: ChatPerson[]
  filesEnabled: boolean
  onSend: (text: string, files: UploadedFile[]) => Promise<boolean>
  /** Up arrow in an empty box: edit your last message */
  onEditLast?: () => void
  autoFocus?: boolean
}): React.ReactElement {
  const [text, setText] = useState('')
  const [mention, setMention] = useState<{ q: string; start: number } | null>(null)
  const [pick, setPick] = useState(0)
  const [uploads, setUploads] = useState<Upload[]>([])
  const [drag, setDrag] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const caret = useRef<number | null>(null)
  const lastTyping = useRef(0)
  const options = mention ? people.filter((p) => p.name.toLowerCase().includes(mention.q.toLowerCase())).slice(0, 6) : []
  const busy = uploads.some((u) => !u.done && !u.error)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`
    if (caret.current != null) {
      el.focus()
      el.setSelectionRange(caret.current, caret.current)
      caret.current = null
    }
  }, [text])

  const typing = (): void => {
    if (Date.now() - lastTyping.current < 3000) return
    lastTyping.current = Date.now()
    void chatTyping(channelId, threadId)
  }
  const track = (value: string, at: number): void => {
    const m = value.slice(0, at).match(/(^|\s)@([\p{L}\p{N} .'-]{0,30})$/u)
    if (m && !/\s{2}/.test(m[2]!)) {
      setMention({ q: m[2]!, start: at - m[2]!.length - 1 })
      setPick(0)
    } else setMention(null)
  }
  const choose = (p: ChatPerson): void => {
    if (!mention) return
    const at = ref.current?.selectionStart ?? text.length
    caret.current = mention.start + p.name.length + 2
    setText(`${text.slice(0, mention.start)}@${p.name} ${text.slice(at)}`)
    setMention(null)
  }
  const addFiles = (list: FileList | File[]): void => {
    if (!filesEnabled) return
    for (const file of Array.from(list).slice(0, 10)) {
      const key = `${file.name}-${file.size}-${Math.random()}`
      const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      setUploads((u) => [...u, { key, name: file.name, preview, progress: 0, done: null, error: null }])
      upload(channelId, file, (p) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, progress: p } : x))))
        .then((done) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, done, progress: 1 } : x))))
        .catch((e: unknown) => setUploads((u) => u.map((x) => (x.key === key ? { ...x, error: e instanceof Error ? e.message : 'Upload failed' } : x))))
    }
  }
  const submit = async (): Promise<void> => {
    const t = text
    const ready = uploads.filter((u) => u.done).map((u) => u.done!)
    if ((!t.trim() && !ready.length) || busy) return
    setText('')
    setMention(null)
    const before = uploads
    setUploads([])
    const ok = await onSend(t, ready)
    if (!ok) {
      setText(t)
      setUploads(before)
    } else before.forEach((u) => u.preview && URL.revokeObjectURL(u.preview))
  }

  return (
    <div
      className="relative px-3 pb-3 pt-2 sm:px-4"
      onDragOver={(e) => {
        if (!filesEnabled || !e.dataTransfer.types.includes('Files')) return
        e.preventDefault()
        setDrag(true)
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        if (!filesEnabled) return
        e.preventDefault()
        setDrag(false)
        addFiles(e.dataTransfer.files)
      }}
    >
      {options.length ? (
        <ul className="absolute bottom-full left-4 right-4 z-10 mb-1 overflow-hidden rounded-xl border bg-popover shadow-xl sm:right-auto sm:w-72" role="listbox" aria-label="Mention a teammate">
          {options.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === pick}>
              <button type="button" onMouseDown={(e) => (e.preventDefault(), choose(p))} className={cn('flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm', i === pick ? 'bg-primary/10' : 'hover:bg-muted')}>
                <Avatar name={p.name} photo={p.photo} size={24} />
                <span className="flex-1 truncate font-medium">{p.name}</span>
                <span className="text-[11px] text-muted-foreground">{p.role === 'ADMIN' ? 'Admin' : p.role === 'SALES' ? 'Sales' : 'Marketing'}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className={cn('mr-16 rounded-xl border bg-card shadow-sm transition-colors focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15', drag && 'border-primary ring-4 ring-primary/20')}>
        {uploads.length ? (
          <div className="flex flex-wrap gap-2 border-b px-3 pb-2 pt-3">
            {uploads.map((u) => (
              <div key={u.key} className={cn('relative flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pl-1.5 pr-7 text-xs', u.error && 'border-destructive/50 bg-destructive/10')} title={u.error ?? u.name}>
                {u.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- a local preview
                  <img src={u.preview} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </span>
                )}
                <span className="max-w-[140px]">
                  <span className="block truncate font-medium">{u.name}</span>
                  <span className={cn('block', u.error ? 'text-destructive' : 'text-muted-foreground')}>{u.error ? 'Failed' : u.done ? 'Ready' : `${Math.round(u.progress * 100)}%`}</span>
                </span>
                {!u.done && !u.error ? <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-muted-foreground" /> : null}
                {u.done || u.error ? (
                  <button type="button" aria-label={`Remove ${u.name}`} onClick={() => setUploads((x) => x.filter((y) => y.key !== u.key))} className="absolute right-1.5 top-1.5 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-1.5 px-2 py-2">
          {filesEnabled ? (
            <>
              <button type="button" onClick={() => fileInput.current?.click()} aria-label="Attach files" title="Attach files (or drop them here)" className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Paperclip className="h-[18px] w-[18px]" />
              </button>
              <input ref={fileInput} type="file" multiple className="hidden" onChange={(e) => (e.target.files && addFiles(e.target.files), (e.target.value = ''))} />
            </>
          ) : null}
          <textarea
            ref={ref}
            value={text}
            rows={1}
            autoFocus={autoFocus}
            placeholder={placeholder}
            aria-label={placeholder}
            onPaste={(e) => {
              const pasted = Array.from(e.clipboardData.files)
              if (pasted.length && filesEnabled) {
                e.preventDefault()
                addFiles(pasted)
              }
            }}
            onChange={(e) => {
              setText(e.target.value)
              track(e.target.value, e.target.selectionStart)
              if (e.target.value) typing()
            }}
            onKeyDown={(e) => {
              if (options.length) {
                if (e.key === 'ArrowDown') return void (e.preventDefault(), setPick((p) => (p + 1) % options.length))
                if (e.key === 'ArrowUp') return void (e.preventDefault(), setPick((p) => (p - 1 + options.length) % options.length))
                if (e.key === 'Enter' || e.key === 'Tab') return void (e.preventDefault(), choose(options[pick]!))
                if (e.key === 'Escape') return void setMention(null)
              }
              if (e.key === 'ArrowUp' && !text && !uploads.length && onEditLast) {
                e.preventDefault()
                onEditLast()
                return
              }
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                void submit()
              }
            }}
            className="max-h-[220px] flex-1 resize-none bg-transparent px-1 py-1.5 text-[14.5px] outline-none placeholder:text-muted-foreground"
          />
          <button type="button" onClick={() => void submit()} disabled={busy || (!text.trim() && !uploads.some((u) => u.done))} aria-label="Send" className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm transition-[opacity,transform] hover:-translate-y-px disabled:translate-y-0 disabled:opacity-30">
            <SendHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 hidden px-1 text-[11px] text-muted-foreground sm:block">
        <b>Enter</b> to send · <b>Shift + Enter</b> new line · <b>@</b> mention · *bold* _italic_ `code`{filesEnabled ? ' · drop or paste files' : ''}
        {onEditLast ? ' · ↑ edit your last message' : ''}
      </p>
    </div>
  )
}
