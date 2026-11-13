'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Archive, ArchiveRestore, Clapperboard, Download, ImagePlus, Loader2, Pencil, Play, Send, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { TabBar } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { approveReel, approveTikTok, checkReel, checkTikTok, dismissReel, reelDownloadUrl, reelPlayUrl, requestNewCover, requestNewReel, restoreReel, saveCaption } from '@/app/actions/reels'

export type StudioReel = {
  id: string
  title: string
  caption: string
  createdAt: string
  cover: string | null
  ig: { status: string; permalink: string | null; error: string | null }
  tiktok: { status: string; privacy: string; error: string | null } | null
  coverQueued: boolean
  coverProgress: { pct: number; step: string } | null
}
export type StudioHeader = {
  worker: { label: string; tone: 'ok' | 'busy' | 'off'; detail: string; pct?: number | null }
  nextRun: string
  queue: { id: string; label: string; state: string; when: string; pct: number; step: string | null }[]
  instagram: boolean
  tiktok: boolean
}

/** A slim progress bar with the percentage. */
function Progress({ pct, step, dark }: { pct: number; step?: string | null; dark?: boolean }): React.ReactElement {
  const v = Math.max(2, Math.min(100, Math.round(pct)))
  return (
    <div className="w-full space-y-1">
      <div className={cn('flex items-center justify-between gap-2 text-xs', dark ? 'text-white/85' : 'text-muted-foreground')}>
        <span className="truncate">{step ?? 'Working'}</span>
        <span className="tabular-nums font-medium">{v}%</span>
      </div>
      <div className={cn('h-1.5 w-full overflow-hidden rounded-full', dark ? 'bg-white/20' : 'bg-muted')} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full rounded-full bg-[#3f7bff] transition-[width] duration-700 ease-out" style={{ width: `${v}%` }} />
      </div>
    </div>
  )
}

const Dot = ({ tone }: { tone: 'ok' | 'busy' | 'off' }): React.ReactElement => (
  <span className={cn('inline-block h-2 w-2 shrink-0 rounded-full', tone === 'ok' ? 'bg-emerald-500' : tone === 'busy' ? 'animate-pulse bg-blue-500' : 'bg-muted-foreground/40')} />
)

function Pill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: 'done' | 'wait' | 'busy' | 'fail' }): React.ReactElement {
  const cls = { done: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', wait: 'bg-muted text-muted-foreground', busy: 'bg-blue-500/10 text-blue-700 dark:text-blue-300', fail: 'bg-red-500/10 text-red-600' }[tone]
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', cls)}>{icon}{label}</span>
}

function Instagram({ className }: { className?: string }): React.ReactElement {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" /></svg>
  )
}

const TikTokIcon = (): React.ReactElement => (
  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden><path d="M16.5 3c.4 2.2 1.8 3.7 4 4v3.1c-1.5 0-2.9-.4-4-1.1v6.3a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.2a2.7 2.7 0 1 0 1.8 2.5V3h3.1Z" /></svg>
)

function ReelCard({ reel, instagramReady, tiktokReady }: { reel: StudioReel; instagramReady: boolean; tiktokReady: boolean }): React.ReactElement {
  const router = useRouter()
  const [caption, setCaption] = useState(reel.caption)
  const [ig, setIg] = useState(reel.ig)
  const [tt, setTt] = useState(reel.tiktok)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(reel.caption)
  const [coverQueued, setCoverQueued] = useState(reel.coverQueued)

  const igPosted = ig.status === 'posted'
  const ttPosted = tt?.status === 'posted'
  const archived = ig.status === 'dismissed'

  // Instagram and TikTok both process on their side: check every 5 s until each is posted
  useEffect(() => {
    if (ig.status !== 'processing') return
    const t = setInterval(async () => {
      const r = await checkReel(reel.id)
      if (!r.ok) { setIg((x) => ({ ...x, status: 'failed', error: r.error })); clearInterval(t); return }
      if (r.status === 'posted') { setIg({ status: 'posted', permalink: r.permalink ?? null, error: null }); clearInterval(t); router.refresh() }
    }, 5000)
    return () => clearInterval(t)
  }, [ig.status, reel.id, router])
  useEffect(() => {
    if (tt?.status !== 'processing') return
    const t = setInterval(async () => {
      const r = await checkTikTok(reel.id)
      if (!r.ok) { setTt((x) => (x ? { ...x, status: 'failed', error: r.error } : x)); clearInterval(t); return }
      if (r.status === 'posted') { setTt((x) => (x ? { ...x, status: 'posted', privacy: r.privacy ?? x.privacy } : x)); clearInterval(t); router.refresh() }
    }, 5000)
    return () => clearInterval(t)
  }, [tt?.status, reel.id, router])

  async function toInstagram(): Promise<boolean> {
    const r = await approveReel(reel.id, caption)
    if (r.ok) { setIg({ status: 'processing', permalink: null, error: null }); return true }
    setError(r.error); return false
  }
  async function toTikTok(): Promise<boolean> {
    const r = await approveTikTok(reel.id, caption)
    if (r.ok) { setTt({ status: 'processing', privacy: '', error: null }); return true }
    setError(r.error); return false
  }
  async function run(name: string, fn: () => Promise<unknown>): Promise<void> {
    setBusy(name); setError(null)
    try { await fn() } finally { setBusy(null) }
  }

  const igPill = igPosted ? <Pill icon={<Instagram className="h-3.5 w-3.5" />} label="Posted" tone="done" />
    : ig.status === 'processing' ? <Pill icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label="Posting…" tone="busy" />
    : ig.status === 'failed' ? <Pill icon={<Instagram className="h-3.5 w-3.5" />} label="Failed" tone="fail" />
    : <Pill icon={<Instagram className="h-3.5 w-3.5" />} label="Not posted" tone="wait" />
  const ttPill = ttPosted ? <Pill icon={<TikTokIcon />} label={tt?.privacy === 'PUBLIC_TO_EVERYONE' ? 'Posted' : 'Posted · private'} tone="done" />
    : tt?.status === 'processing' ? <Pill icon={<Loader2 className="h-3.5 w-3.5 animate-spin" />} label="Posting…" tone="busy" />
    : tt?.status === 'failed' ? <Pill icon={<TikTokIcon />} label="Failed" tone="fail" />
    : <Pill icon={<TikTokIcon />} label="Not posted" tone="wait" />

  const canIg = !igPosted && ig.status !== 'processing' && !archived && instagramReady
  const canTt = !ttPosted && tt?.status !== 'processing' && !archived && tiktokReady

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:shadow-md">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#0a0f1a]">
        {reel.cover ? (
          // eslint-disable-next-line @next/next/no-img-element -- private, short-lived cover link
          <img src={reel.cover} alt={`Cover: ${reel.title}`} className="h-full w-full object-cover object-top transition duration-500 group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-white/50"><Clapperboard className="mr-2 h-4 w-4" />No cover yet</div>
        )}
        <button type="button" onClick={() => run('play', async () => setPlaying(await reelPlayUrl(reel.id)))} className="absolute inset-0 flex items-center justify-center bg-black/0 transition hover:bg-black/25" aria-label={`Play ${reel.title}`}>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-[#0a0f1a] opacity-0 shadow-lg transition group-hover:opacity-100">{busy === 'play' ? <Loader2 className="h-5 w-5 animate-spin" /> : <Play className="ml-0.5 h-5 w-5" />}</span>
        </button>
        {(coverQueued || reel.coverProgress) && (
          <div className="absolute inset-x-3 bottom-3 rounded-xl bg-black/65 p-3 backdrop-blur">
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-white"><Sparkles className="h-3.5 w-3.5" />New cover</p>
            <Progress pct={reel.coverProgress?.pct ?? 0} step={reel.coverProgress?.step ?? 'Waiting for your Mac'} dark />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="line-clamp-2 font-semibold leading-snug">{reel.title}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{reel.createdAt}</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {igPosted && ig.permalink ? <a href={ig.permalink} target="_blank" rel="noreferrer">{igPill}</a> : igPill}
          {ttPill}
        </div>
        <button type="button" onClick={() => { setDraft(caption); setEditing(true) }} className="group/cap rounded-lg text-left text-sm text-muted-foreground hover:text-foreground">
          <span className="line-clamp-3 whitespace-pre-line">{caption}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"><Pencil className="h-3 w-3" />Edit caption</span>
        </button>
        {(error || ig.error || tt?.error) && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error || ig.error || tt?.error}</p>}
        <div className="mt-auto space-y-2 pt-1">
          {!archived && (canIg || canTt) && (
            <Button className="w-full" disabled={busy !== null} onClick={() => run('both', async () => { if (canIg) await toInstagram(); if (canTt) await toTikTok() })}>
              {busy === 'both' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {canIg && canTt ? 'Post to Instagram + TikTok' : canIg ? 'Post to Instagram' : 'Post to TikTok'}
            </Button>
          )}
          <div className="flex flex-wrap items-center gap-1">
            {canIg && canTt && <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run('ig', toInstagram)}><Instagram className="mr-1.5 h-4 w-4" />Only Instagram</Button>}
            {canIg && canTt && <Button size="sm" variant="ghost" disabled={busy !== null} onClick={() => run('tt', toTikTok)}><span className="mr-1.5"><TikTokIcon /></span>Only TikTok</Button>}
            <div className="ml-auto flex items-center">
              <Button size="sm" variant="ghost" title="New cover" aria-label="New cover" disabled={busy !== null || coverQueued} onClick={() => run('cover', async () => { const r = await requestNewCover(reel.id); if (r.ok) setCoverQueued(true); else setError(r.error) })}><ImagePlus className="h-4 w-4" /></Button>
              <Button size="sm" variant="ghost" title="Download video" aria-label="Download video" disabled={busy !== null} onClick={() => run('dl', async () => { const u = await reelDownloadUrl(reel.id); if (u) window.open(u, '_blank') })}><Download className="h-4 w-4" /></Button>
              {archived
                ? <Button size="sm" variant="ghost" title="Restore" aria-label="Restore" disabled={busy !== null} onClick={() => run('restore', async () => { await restoreReel(reel.id); router.refresh() })}><ArchiveRestore className="h-4 w-4" /></Button>
                : <Button size="sm" variant="ghost" title="Archive" aria-label="Archive" disabled={busy !== null} onClick={() => run('archive', async () => { await dismissReel(reel.id); router.refresh() })}><Archive className="h-4 w-4" /></Button>}
            </div>
          </div>
          {!instagramReady && !igPosted && !archived && <p className="text-xs text-muted-foreground">Connect Instagram in Settings to post there.</p>}
        </div>
      </div>

      <Dialog open={playing !== null} onClose={() => setPlaying(null)} title={reel.title} className="w-[min(92vw,26rem)]">
        {playing && <video src={playing} controls autoPlay playsInline className="aspect-[9/16] w-full rounded-xl bg-black" />}
      </Dialog>
      <Dialog open={editing} onClose={() => setEditing(false)} title="Edit caption" description="Used for both Instagram and TikTok.">
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={12} className="w-full rounded-xl border bg-background p-3 text-sm" aria-label="Caption" />
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{draft.length} / 2200</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={() => run('caption', async () => { await saveCaption(reel.id, draft); setCaption(draft); setEditing(false) })}>Save</Button>
          </div>
        </div>
      </Dialog>
    </article>
  )
}

type Tab = 'review' | 'posted' | 'archived'

export function ReelStudio({ reels, header }: { reels: StudioReel[]; header: StudioHeader }): React.ReactElement {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('review')
  const [open, setOpen] = useState(false)
  const [topic, setTopic] = useState('')
  const [sending, setSending] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  const groups = useMemo(() => {
    const archived = reels.filter((r) => r.ig.status === 'dismissed')
    const posted = reels.filter((r) => r.ig.status !== 'dismissed' && (r.ig.status === 'posted' || r.tiktok?.status === 'posted'))
    const review = reels.filter((r) => !archived.includes(r) && !posted.includes(r))
    return { review, posted, archived }
  }, [reels])
  const shown = groups[tab]

  // while something is queued or being made, keep the page fresh
  const active = header.worker.tone === 'busy' || header.queue.some((q) => q.state === 'queued' || q.state === 'working')
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => router.refresh(), 4_000)
    return () => clearInterval(t)
  }, [active, router])

  async function generate(): Promise<void> {
    setSending(true)
    const r = await requestNewReel(topic)
    setSending(false)
    if (!r.ok) { setNote(r.error); return }
    setOpen(false); setTopic('')
    setNote('Queued. Your Mac picks it up within 2 minutes; a reel takes about 45 minutes. It appears here when it’s ready.')
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reels</h1>
          <p className="mt-1 text-sm text-muted-foreground">True-story reels made for Igani. Review, then post. Nothing goes out without you.</p>
        </div>
        <Button size="lg" onClick={() => setOpen(true)}><Sparkles className="mr-2 h-4 w-4" />Generate new reel</Button>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="flex items-start gap-2.5">
          <Dot tone={header.worker.tone} />
          <div className="-mt-1 min-w-0 flex-1">
            <p className="font-medium">{header.worker.label}</p>
            <p className="text-xs text-muted-foreground">{header.worker.detail}</p>
            {header.worker.tone === 'busy' && typeof header.worker.pct === 'number' && <div className="mt-2 max-w-sm"><Progress pct={header.worker.pct} step={null} /></div>}
          </div>
        </div>
        <div className="-mt-1">
          <p className="font-medium">Next automatic reel</p>
          <p className="text-xs text-muted-foreground">{header.nextRun}</p>
        </div>
        <div className="-mt-1 flex flex-wrap items-center gap-2 sm:justify-end">
          <span className="inline-flex items-center gap-1.5 text-xs"><Dot tone={header.instagram ? 'ok' : 'off'} />Instagram</span>
          <span className="inline-flex items-center gap-1.5 text-xs"><Dot tone={header.tiktok ? 'ok' : 'off'} />TikTok</span>
        </div>
        {header.queue.length > 0 && (
          <ul className="space-y-3 border-t pt-3 sm:col-span-3">
            {header.queue.map((q) => (
              <li key={q.id} className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  {q.state === 'working' ? <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" /> : q.state === 'failed' ? <span className="h-2 w-2 rounded-full bg-red-500" /> : q.state === 'done' ? <Dot tone="ok" /> : <Dot tone="off" />}
                  <span className="font-medium">{q.label}</span>
                  <span className="text-muted-foreground">· {q.state === 'working' ? 'in progress' : q.state} · {q.when}</span>
                </div>
                {(q.state === 'queued' || q.state === 'working') && <div className="pl-5"><Progress pct={q.pct} step={q.step} /></div>}
                {q.state === 'failed' && q.step && <p className="pl-5 text-xs text-red-600">{q.step}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

      {note && <p className="rounded-xl bg-blue-500/10 px-4 py-3 text-sm text-blue-800 dark:text-blue-200">{note}</p>}

      <div>
        <TabBar label="Reels" value={tab} onChange={setTab} items={[{ id: 'review', label: 'To review', count: groups.review.length }, { id: 'posted', label: 'Posted', count: groups.posted.length }, { id: 'archived', label: 'Archived', count: groups.archived.length }]} />
        <div role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-5">
          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-16 text-center text-sm text-muted-foreground">
              <Clapperboard className="h-6 w-6" />
              {tab === 'review' ? <>Nothing waiting. <button type="button" className="font-medium text-primary" onClick={() => setOpen(true)}>Generate a reel</button></> : tab === 'posted' ? 'Nothing posted yet.' : 'Nothing archived.'}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((r) => <ReelCard key={r.id} reel={r} instagramReady={header.instagram} tiktokReady={header.tiktok} />)}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onClose={() => setOpen(false)} title="Generate a new reel" description="Your Mac makes it: a true story, the voice, the drawings, the music and a branded cover. About 45 minutes.">
        <label className="block text-sm font-medium" htmlFor="topic">Topic idea <span className="font-normal text-muted-foreground">(optional)</span></label>
        <textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} rows={3} placeholder="e.g. the first email ever sent, a famous product launch flop… Leave empty to let it pick." className="w-full rounded-xl border bg-background p-3 text-sm" />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={sending} onClick={generate}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Generate</Button>
        </div>
      </Dialog>
    </div>
  )
}
