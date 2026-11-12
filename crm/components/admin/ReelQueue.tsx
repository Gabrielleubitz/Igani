'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { approveReel, checkReel, dismissReel, reelPlayUrl } from '@/app/actions/reels'

export type ReelRow = { id: string; title: string; caption: string; status: string; createdAt: string; permalink: string | null; error: string | null }

/** One reel: watch it, edit the caption, Approve → Instagram (or Dismiss). */
function ReelItem({ reel, instagramReady }: { reel: ReelRow; instagramReady: boolean }): React.ReactElement {
  const router = useRouter()
  const [src, setSrc] = useState<string | null>(null)
  const [caption, setCaption] = useState(reel.caption)
  const [status, setStatus] = useState(reel.status)
  const [error, setError] = useState<string | null>(reel.error)
  const [link, setLink] = useState<string | null>(reel.permalink)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (status !== 'pending' && status !== 'processing') return
    let live = true
    void reelPlayUrl(reel.id).then((u) => { if (live) setSrc(u) })
    return () => { live = false }
  }, [reel.id, status])

  // while Instagram processes the video, check every 5 seconds; it publishes as soon as it's ready
  useEffect(() => {
    if (status !== 'processing') return
    const t = setInterval(async () => {
      const r = await checkReel(reel.id)
      if (!r.ok) { setError(r.error); setStatus('failed'); clearInterval(t); return }
      if (r.status === 'posted') { setStatus('posted'); setLink(r.permalink ?? null); clearInterval(t); router.refresh() }
    }, 5000)
    return () => clearInterval(t)
  }, [status, reel.id, router])

  async function approve(): Promise<void> {
    setBusy(true); setError(null)
    const r = await approveReel(reel.id, caption)
    setBusy(false)
    if (r.ok) setStatus('processing'); else setError(r.error)
  }
  async function dismiss(): Promise<void> {
    setBusy(true)
    await dismissReel(reel.id)
    setBusy(false); setStatus('dismissed'); router.refresh()
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row">
      <div className="w-full shrink-0 sm:w-56">
        {src ? <video src={src} controls playsInline className="aspect-[9/16] w-full rounded-lg bg-black" /> : <div className="aspect-[9/16] w-full rounded-lg bg-muted" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm">
        <div>
          <p className="font-medium">{reel.title}</p>
          <p className="text-muted-foreground">{reel.createdAt}</p>
        </div>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={9} disabled={status !== 'pending'} className="w-full rounded-md border bg-background p-2 text-sm" aria-label="Caption" />
        {error && <p className="rounded-md bg-red-500/10 px-3 py-2 text-red-600">{error}</p>}
        {status === 'pending' && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={busy || !instagramReady} onClick={approve}>Approve → post to Instagram</Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={dismiss}>Dismiss</Button>
            {!instagramReady && <span className="self-center text-muted-foreground">Connect Instagram in Settings first.</span>}
          </div>
        )}
        {status === 'processing' && <p className="text-muted-foreground">Instagram is processing the video. It posts by itself when it’s ready (usually under a minute). You can leave this page.</p>}
        {status === 'posted' && <p>Posted to Instagram{link ? <> · <a href={link} target="_blank" rel="noreferrer" className="underline">open it</a></> : null}</p>}
        {status === 'dismissed' && <p className="text-muted-foreground">Dismissed.</p>}
      </div>
    </div>
  )
}

export function ReelQueue({ reels, instagramReady }: { reels: ReelRow[]; instagramReady: boolean }): React.ReactElement {
  if (!reels.length) return <p className="text-sm text-muted-foreground">No reels yet. The reel job adds one here each time it makes a video.</p>
  return <div className="space-y-4">{reels.map((r) => <ReelItem key={r.id} reel={r} instagramReady={instagramReady} />)}</div>
}
