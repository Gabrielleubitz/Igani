'use client'

import { upload } from '@vercel/blob/client'
import { Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { registerVideo, removeVideo, setVideoAccess } from '@/app/actions/videos'
import { PrivateVideo } from '@/components/PrivateVideo'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MAX_VIDEO_BYTES, TOTAL_VIDEO_BYTES, fitsLimits, type VideoRecord } from '@/lib/video-core'

const mb = (n: number): string => `${(n / 1024 / 1024).toFixed(n > 10 * 1024 * 1024 ? 0 : 1)} MB`

export function VideoManager({ videos, offers }: { videos: VideoRecord[]; offers: { id: string; title: string; slug: string }[] }): React.ReactElement {
  const router = useRouter()
  const input = useRef<HTMLInputElement>(null)
  const [title, setTitle] = useState('')
  const [progress, setProgress] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const used = videos.reduce((n, v) => n + v.size, 0)

  async function onFile(file: File): Promise<void> {
    setMsg(null)
    const err = fitsLimits(file.size, file.type, used)
    if (err) return setMsg(err)
    setProgress(0)
    try {
      const safe = file.name.replace(/[^A-Za-z0-9._-]+/g, '-')
      const blob = await upload(`videos/${safe}`, file, { access: 'private', handleUploadUrl: '/api/admin/videos/upload', multipart: file.size > 20 * 1024 * 1024, onUploadProgress: (p) => setProgress(Math.round(p.percentage)) })
      const res = await registerVideo({ title: title || file.name.replace(/\.[^.]+$/, ''), pathname: blob.pathname, contentType: file.type })
      if (!res.ok) setMsg(res.error)
      else {
        setTitle('')
        router.refresh()
      }
    } catch (e) {
      setMsg((e as Error).message || 'Upload failed.')
    } finally {
      setProgress(null)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Upload a video</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-primary" style={{ width: `${Math.min(100, (used / TOTAL_VIDEO_BYTES) * 100)}%` }} />
          </div>
          <p className="text-sm text-muted-foreground">
            {mb(used)} of 1 GB used. MP4, WebM or MOV, up to {mb(MAX_VIDEO_BYTES)} each. Export at 720p to fit more.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input className="max-w-xs" placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} />
            <input ref={input} type="file" accept="video/mp4,video/webm,video/quicktime" hidden onChange={(e) => e.target.files?.[0] && void onFile(e.target.files[0])} />
            <Button type="button" disabled={progress !== null} onClick={() => input.current?.click()}>
              <Upload className="mr-1 h-4 w-4" aria-hidden /> {progress !== null ? `Uploading ${progress}%` : 'Choose video'}
            </Button>
          </div>
          {msg ? <p className="text-sm text-red-500">{msg}</p> : null}
        </CardContent>
      </Card>

      {videos.length === 0 ? <p className="text-sm text-muted-foreground">No videos yet.</p> : null}
      <div className="grid gap-5 lg:grid-cols-2">
        {videos.map((v) => (
          <VideoCard key={v.id} v={v} offers={offers} pending={pending} start={start} onDone={() => router.refresh()} />
        ))}
      </div>
    </div>
  )
}

function VideoCard({ v, offers, pending, start, onDone }: { v: VideoRecord; offers: { id: string; title: string; slug: string }[]; pending: boolean; start: (fn: () => void) => void; onDone: () => void }): React.ReactElement {
  const [title, setTitle] = useState(v.title)
  const [vis, setVis] = useState(v.visibility)
  const [offerId, setOfferId] = useState(v.offerId ?? '')
  const [err, setErr] = useState<string | null>(null)
  const slug = offers.find((o) => o.id === v.offerId)?.slug
  const dirty = title !== v.title || vis !== v.visibility || (vis === 'offer' && offerId !== (v.offerId ?? ''))
  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="overflow-hidden rounded-xl">
          <PrivateVideo id={v.id} offerSlug={vis === 'offer' ? slug : undefined} title={v.title} />
        </div>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Title" />
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select className="rounded-md border border-border bg-background px-2 py-1.5" value={vis} onChange={(e) => setVis(e.target.value as VideoRecord['visibility'])} aria-label="Who can watch">
            <option value="team">Team only (signed in)</option>
            <option value="offer">One client offer</option>
          </select>
          {vis === 'offer' ? (
            <select className="rounded-md border border-border bg-background px-2 py-1.5" value={offerId} onChange={(e) => setOfferId(e.target.value)} aria-label="Offer">
              <option value="">Choose offer…</option>
              {offers.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          ) : null}
          <span className="text-muted-foreground">{mb(v.size)}</span>
        </div>
        {err ? <p className="text-sm text-red-500">{err}</p> : null}
        <div className="flex gap-2">
          <Button
            size="sm"
            disabled={!dirty || pending}
            onClick={() =>
              start(async () => {
                const r = await setVideoAccess(v.id, vis, offerId || null, title)
                if (r.ok) (setErr(null), onDone())
                else setErr(r.error)
              })
            }
          >
            Save
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              if (confirm(`Delete "${v.title}"? This removes the file.`)) start(async () => void (await removeVideo(v.id), onDone()))
            }}
          >
            <Trash2 className="mr-1 h-4 w-4" aria-hidden /> Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
