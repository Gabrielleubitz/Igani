'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, MessageCircle, RefreshCw, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { markIgRead, redraftIgReply, sendIgReply } from '@/app/actions/instagram-dm'

export type DmThread = {
  id: string; who: string; name: string | null; picture: string | null; unread: number; last: string; lastAt: string
  keyword: string | null; reel: string | null; leadId: string | null; leadStatus: string | null; booked: boolean
  draft: string | null; canReply: boolean
  messages: { id: string; fromUs: boolean; text: string; at: string }[]
}

function Avatar({ t, size = 40 }: { t: DmThread; size?: number }): React.ReactElement {
  return t.picture
    ? /* eslint-disable-next-line @next/next/no-img-element -- Instagram's avatar host */ <img src={t.picture} alt="" style={{ width: size, height: size }} className="shrink-0 rounded-full object-cover" />
    : <span style={{ width: size, height: size }} className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#3f7bff] to-[#1e2a44] text-sm font-semibold text-white">{t.who.replace('@', '').slice(0, 1).toUpperCase()}</span>
}

function Conversation({ t, canMessage, onBack }: { t: DmThread; canMessage: boolean; onBack: () => void }): React.ReactElement {
  const router = useRouter()
  const [text, setText] = useState(t.draft ?? '')
  const [busy, setBusy] = useState<'send' | 'draft' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { setText(t.draft ?? ''); setError(null) }, [t.id, t.draft])
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [t.id, t.messages.length])
  useEffect(() => { if (t.unread) void markIgRead(t.id).then(() => router.refresh()) }, [t.id, t.unread, router])

  async function send(): Promise<void> {
    setBusy('send'); setError(null)
    const r = await sendIgReply(t.id, text)
    setBusy(null)
    if (r.ok) { setText(''); router.refresh() } else setError(r.error)
  }
  async function redraft(): Promise<void> {
    setBusy('draft'); setError(null)
    const r = await redraftIgReply(t.id)
    setBusy(null)
    if (r.ok && r.draft) setText(r.draft); else if (!r.ok) setError(r.error)
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <button type="button" onClick={onBack} className="rounded-lg p-1 hover:bg-muted md:hidden" aria-label="Back to conversations"><ArrowLeft className="h-4 w-4" /></button>
        <Avatar t={t} size={36} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{t.who}</p>
          <p className="truncate text-xs text-muted-foreground">{t.name && t.name !== t.who ? `${t.name} · ` : ''}{t.reel ? `From the reel “${t.reel}” (${t.keyword})` : 'Instagram DM'}</p>
        </div>
        {t.leadId && <Button asChild size="sm" variant="outline"><Link href={`/sales/leads/${t.leadId}`}>Open lead</Link></Button>}
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {t.messages.map((m) => (
          <div key={m.id} className={cn('flex', m.fromUs ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', m.fromUs ? 'rounded-br-md bg-[#3f7bff] text-white' : 'rounded-bl-md bg-muted')}>
              <p className="whitespace-pre-wrap">{m.text}</p>
              <p className={cn('mt-1 text-[10px]', m.fromUs ? 'text-white/70' : 'text-muted-foreground')}>{m.at}</p>
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="space-y-2 border-t p-3">
        {!canMessage ? <p className="text-xs text-muted-foreground">Turn on DMs: reconnect Instagram in Settings so the CRM can send replies.</p>
          : !t.canReply ? <p className="text-xs text-muted-foreground">It’s been over 24 hours since their last message, so Instagram only allows a reply from the Instagram app.</p> : null}
        {text && t.draft && text === t.draft && <p className="flex items-center gap-1.5 text-xs text-blue-600"><Sparkles className="h-3.5 w-3.5" />AI draft. Check it before you send; nothing goes out until you press Send.</p>}
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder={busy === 'draft' ? 'Writing a draft…' : 'Write a reply…'} className="w-full resize-none rounded-xl border bg-background p-3 text-sm" aria-label="Reply" />
        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <Button size="sm" variant="ghost" disabled={busy !== null} onClick={redraft}>{busy === 'draft' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}New AI draft</Button>
          <Button size="sm" disabled={busy !== null || !text.trim() || !canMessage || !t.canReply} onClick={send}>{busy === 'send' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}Send</Button>
        </div>
      </div>
    </div>
  )
}

export function DmInbox({ threads, initial, connected, canMessage }: { threads: DmThread[]; initial: string | null; connected: boolean; canMessage: boolean }): React.ReactElement {
  const router = useRouter()
  const [sel, setSel] = useState<string | null>(initial)
  const [mobileOpen, setMobileOpen] = useState(Boolean(initial && threads.length))
  const t = threads.find((x) => x.id === sel) ?? null
  // new messages arrive through Instagram's webhook: refresh every 10 s
  useEffect(() => { const i = setInterval(() => router.refresh(), 10_000); return () => clearInterval(i) }, [router])
  const unread = threads.reduce((n, x) => n + x.unread, 0)
  const leads = threads.filter((x) => x.leadId).length
  const booked = threads.filter((x) => x.booked).length

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instagram DMs</h1>
          <p className="mt-1 text-sm text-muted-foreground">Every DM becomes a lead. Replies are drafted for you and only go out when you press Send.</p>
        </div>
        <div className="flex gap-2 text-sm">
          {[['Unread', unread], ['Leads', leads], ['Booked', booked]].map(([l, n]) => (
            <div key={l} className="rounded-xl border bg-card px-4 py-2 text-center"><p className="text-lg font-semibold tabular-nums">{n}</p><p className="text-xs text-muted-foreground">{l}</p></div>
          ))}
        </div>
      </div>
      {!connected && <p className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">Connect Instagram in Settings to receive DMs here.</p>}
      {connected && !canMessage && <p className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">DMs aren’t turned on yet: reconnect Instagram in Settings (it asks for the new “messages” permission).</p>}
      <div className="grid h-[calc(100vh-15rem)] min-h-[480px] overflow-hidden rounded-2xl border bg-card md:grid-cols-[320px_1fr]">
        <ul className={cn('min-h-0 overflow-y-auto border-r', mobileOpen && 'hidden md:block')}>
          {threads.length === 0 && <li className="flex flex-col items-center gap-2 px-6 py-16 text-center text-sm text-muted-foreground"><MessageCircle className="h-6 w-6" />No DMs yet. They’ll appear here as people message @igani.co.</li>}
          {threads.map((x) => (
            <li key={x.id}>
              <button type="button" onClick={() => { setSel(x.id); setMobileOpen(true) }} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60', sel === x.id && 'bg-muted')}>
                <Avatar t={x} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={cn('truncate text-sm', x.unread ? 'font-semibold' : 'font-medium')}>{x.who}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{x.lastAt}</span>
                  </div>
                  <p className={cn('truncate text-xs', x.unread ? 'text-foreground' : 'text-muted-foreground')}>{x.last}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {x.keyword && <span className="rounded-full bg-[#3f7bff]/10 px-2 py-0.5 text-[10px] font-medium text-[#3f7bff]">{x.keyword}</span>}
                    {x.booked && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">Booked</span>}
                    {x.draft && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Draft ready</span>}
                  </div>
                </div>
                {x.unread > 0 && <span className="mt-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#3f7bff] px-1.5 text-[10px] font-semibold text-white">{x.unread}</span>}
              </button>
            </li>
          ))}
        </ul>
        <div className={cn('min-h-0', !mobileOpen && 'hidden md:block')}>
          {t ? <Conversation t={t} canMessage={canMessage} onBack={() => setMobileOpen(false)} /> : <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Pick a conversation</div>}
        </div>
      </div>
    </div>
  )
}
