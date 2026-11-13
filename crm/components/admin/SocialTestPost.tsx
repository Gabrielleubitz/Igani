'use client'

import { DM_Mono, League_Spartan } from 'next/font/google'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { createTestUpload, discardTestUpload, generateSocialPost, instagramTestPost, instagramTestStatus, socialResearchInfo, tiktokTestInfo, tiktokTestPost, tiktokTestStatus } from '@/app/actions/social-test'
import { fullCaption, type SocialDraft } from '@/lib/social-draft'
import { loadAssets, renderMp4 } from './social-video'

const spartan = League_Spartan({ subsets: ['latin'], weight: ['800'], display: 'block' })
const dmMono = DM_Mono({ subsets: ['latin'], weight: ['400', '500'], display: 'block' })
const FONTS = { display: spartan.style.fontFamily, mono: dmMono.style.fontFamily, body: 'Arial, "Liberation Sans", Helvetica, sans-serif' }

type Platform = 'tiktok' | 'instagram'
type Phase =
  | { kind: 'idle' }
  | { kind: 'writing'; firstResearch: boolean }
  | { kind: 'rendering'; pct: number }
  | { kind: 'ready' }
  | { kind: 'uploading'; pct: number }
  | { kind: 'sending' }
  | { kind: 'processing' }
  | { kind: 'done'; link: string | null; note: string }
  | { kind: 'error'; error: string; retry: 'write' | 'post' }

const PRIVACY_LABELS: Record<string, string> = { SELF_ONLY: 'Only me', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', PUBLIC_TO_EVERYONE: 'Everyone' }
const NAME: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram' }

function putFile(url: string, file: Blob, onProgress: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest()
    x.open('PUT', url)
    x.setRequestHeader('Content-Type', 'video/mp4')
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100))
    x.onload = () => (x.status >= 200 && x.status < 300 ? resolve() : reject(new Error(`Upload failed (${x.status}). Check the bucket's CORS rule allows PUT from this site.`)))
    x.onerror = () => reject(new Error("Upload failed. Check the bucket's CORS rule allows PUT from this site."))
    x.send(file)
  })
}

/**
 * "Post now" on a connected account card: writes a post from the saved research (video script, caption, hashtags),
 * renders the video in the browser, shows it for a last look, and posts it straight away.
 */
export function SocialTestPost({ platform }: { platform: Platform }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<SocialDraft | null>(null)
  const [video, setVideo] = useState<Blob | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [ownVideo, setOwnVideo] = useState(false)
  const [caption, setCaption] = useState('')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [privacy, setPrivacy] = useState('SELF_ONLY')
  const [tiktok, setTiktok] = useState<{ username: string | null; options: string[]; maxSec: number | null } | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const name = NAME[platform]
  const busy = ['writing', 'rendering', 'uploading', 'sending', 'processing'].includes(phase.kind)
  const posting = ['uploading', 'sending', 'processing'].includes(phase.kind)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])
  useEffect(() => () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }, [videoUrl])

  // TikTok: who we post as and which privacy levels are allowed (an unaudited app only gets "Only me")
  useEffect(() => {
    if (!open || platform !== 'tiktok' || tiktok) return
    void tiktokTestInfo().then((r) => {
      if (!r.ok) return setInfoError(r.error)
      setTiktok({ username: r.username, options: r.privacyOptions, maxSec: r.maxDurationSec })
      if (!r.privacyOptions.includes('SELF_ONLY') && r.privacyOptions[0]) setPrivacy(r.privacyOptions[0])
    })
  }, [open, platform, tiktok])

  function showVideo(blob: Blob, own: boolean): void {
    setVideo(blob)
    setOwnVideo(own)
    setVideoUrl(URL.createObjectURL(blob))
  }

  async function write(): Promise<void> {
    setVideo(null)
    setVideoUrl(null)
    const info = await socialResearchInfo().catch(() => ({ ok: true as const, createdAt: null }))
    setPhase({ kind: 'writing', firstResearch: !info.createdAt })
    const r = await generateSocialPost(platform)
    if (!r.ok) return setPhase({ kind: 'error', error: r.error, retry: 'write' })
    setDraft(r.draft)
    setCaption(fullCaption(r.draft))
    setPhase({ kind: 'rendering', pct: 0 })
    try {
      const assets = await loadAssets(FONTS)
      showVideo(await renderMp4(r.draft, assets, (pct) => setPhase({ kind: 'rendering', pct })), false)
      setPhase({ kind: 'ready' })
    } catch (e) {
      setPhase({ kind: 'error', error: e instanceof Error ? e.message : 'Could not make the video', retry: 'write' })
    }
  }

  function start(): void {
    setOpen(true)
    if (!draft) void write()
  }

  function close(): void {
    if (busy) return // Instagram only publishes when we poll it, so stay open until it's done
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setOpen(false)
    if (phase.kind === 'done') {
      // next time starts with a fresh post
      setDraft(null)
      setVideo(null)
      setVideoUrl(null)
      setPhase({ kind: 'idle' })
    } else if (phase.kind === 'error' && phase.retry === 'post') setPhase({ kind: 'ready' })
  }

  function poll(check: () => Promise<{ done: boolean; link?: string | null; error?: string }>, note: string): void {
    setPhase({ kind: 'processing' })
    const started = Date.now()
    const stop = (): void => { if (timer.current) clearInterval(timer.current); timer.current = null }
    timer.current = setInterval(async () => {
      const r: { done: boolean; link?: string | null; error?: string } = await check().catch((e: unknown) => ({ done: false, error: e instanceof Error ? e.message : 'Check failed' }))
      if (r.error) { stop(); return setPhase({ kind: 'error', error: r.error, retry: 'post' }) }
      if (r.done) { stop(); return setPhase({ kind: 'done', link: r.link ?? null, note }) }
      if (Date.now() - started > 5 * 60_000) { stop(); setPhase({ kind: 'error', error: `${name} is still processing after 5 minutes. Check the account in the app.`, retry: 'post' }) }
    }, 5000)
  }

  async function post(): Promise<void> {
    if (!video) return
    // with their own video the words were still ours, but only the caption was used: remember the topic either way
    const meta = draft ? { topic: ownVideo ? `${draft.topic} (own video)` : draft.topic, hook: draft.hook, visual: draft.visual } : null
    setPhase({ kind: 'uploading', pct: 0 })
    const up = await createTestUpload({ size: video.size, contentType: 'video/mp4' })
    if (!up.ok) return setPhase({ kind: 'error', error: up.error, retry: 'post' })
    try {
      await putFile(up.url, video, (pct) => setPhase({ kind: 'uploading', pct }))
    } catch (e) {
      await discardTestUpload(up.key)
      return setPhase({ kind: 'error', error: e instanceof Error ? e.message : 'Upload failed', retry: 'post' })
    }
    setPhase({ kind: 'sending' })
    if (platform === 'tiktok') {
      const r = await tiktokTestPost({ key: up.key, caption, privacy, meta })
      if (!r.ok) return setPhase({ kind: 'error', error: r.error, retry: 'post' })
      const user = tiktok?.username
      poll(async () => {
        const s = await tiktokTestStatus(r.publishId)
        if (!s.ok) return { done: false, error: s.error }
        if (s.status !== 'PUBLISH_COMPLETE') return { done: false }
        return { done: true, link: s.postId && user ? `https://www.tiktok.com/@${user}/video/${s.postId}` : null }
      }, privacy === 'SELF_ONLY' ? 'Posted to TikTok as "Only me".' : 'Posted to TikTok.')
    } else {
      const r = await instagramTestPost({ key: up.key, caption, meta })
      if (!r.ok) return setPhase({ kind: 'error', error: r.error, retry: 'post' })
      poll(async () => {
        const s = await instagramTestStatus({ key: up.key, containerId: r.containerId })
        if (!s.ok) return { done: false, error: s.error }
        return s.status === 'posted' ? { done: true, link: s.permalink } : { done: false }
      }, 'Posted to Instagram.')
    }
  }

  const status =
    phase.kind === 'writing' ? (phase.firstResearch ? 'First time only: researching what works on Instagram and TikTok, then writing the post. This takes a minute or two; later posts reuse the research.' : 'Writing the post from the saved research…')
    : phase.kind === 'rendering' ? `Making the video… ${phase.pct}%`
    : phase.kind === 'uploading' ? `Uploading… ${phase.pct}%`
    : phase.kind === 'sending' ? `Sending to ${name}…`
    : phase.kind === 'processing' ? `${name} is processing the video. Keep this open: it posts as soon as it's ready (usually under a minute).`
    : null
  const canPost = Boolean(video) && caption.trim().length > 0 && !busy && phase.kind !== 'done' && (platform !== 'tiktok' || Boolean(tiktok))

  return (
    <>
      <Button size="sm" onClick={start}>Post now</Button>
      <Dialog open={open} onClose={close} title={`Post to ${name}`} description={`A new post written from your saved research: video, caption and hashtags. Check it, then post.${platform === 'instagram' ? ' Instagram posts are public.' : ''}`}>
        <div className="space-y-3 text-sm">
          {videoUrl ? (
            <video key={videoUrl} src={videoUrl} autoPlay loop muted playsInline controls className="mx-auto aspect-[4/5] w-full max-w-[260px] rounded-lg bg-black" />
          ) : (
            <div className="mx-auto flex aspect-[4/5] w-full max-w-[260px] items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">{busy ? 'Working…' : 'No video yet'}</div>
          )}
          {draft && (
            <label className="block space-y-1">
              <span className="font-medium">Caption and hashtags</span>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={6} maxLength={2200} disabled={busy || phase.kind === 'done'} className="w-full rounded-md border bg-background p-2 text-sm" />
            </label>
          )}
          {platform === 'tiktok' && draft && (
            infoError ? <p className="rounded-md bg-red-500/10 px-3 py-2 text-red-600">{infoError}</p>
            : !tiktok ? <p className="text-muted-foreground">Checking the TikTok account…</p>
            : (
              <label className="block space-y-1">
                <span className="font-medium">Who can see it{tiktok.username ? ` (posting as @${tiktok.username})` : ''}</span>
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} disabled={busy || phase.kind === 'done'} className="w-full rounded-md border bg-background p-2 text-sm">
                  {tiktok.options.map((o) => <option key={o} value={o}>{PRIVACY_LABELS[o] ?? o}</option>)}
                </select>
                <span className="block text-xs text-muted-foreground">Until TikTok audits the app, it only allows &ldquo;Only me&rdquo;.</span>
              </label>
            )
          )}
          {status && <p className="rounded-md bg-muted px-3 py-2">{status}</p>}
          {phase.kind === 'error' && <p className="rounded-md bg-red-500/10 px-3 py-2 text-red-600">{phase.error}</p>}
          {phase.kind === 'done' && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-emerald-700 dark:text-emerald-400">
              ✓ {phase.note}{phase.link ? <> · <a href={phase.link} target="_blank" rel="noreferrer" className="underline">Open it</a></> : null}
            </p>
          )}
          {draft && !busy && phase.kind !== 'done' && (
            <label className="block text-xs text-muted-foreground">
              Or use your own video (MP4, up to 64 MB):{' '}
              <input type="file" accept="video/mp4" onChange={(e) => { const f = e.target.files?.[0]; if (f) { showVideo(f, true); setPhase({ kind: 'ready' }) } }} className="mt-1 block w-full text-xs" />
            </label>
          )}
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={close} disabled={busy}>{phase.kind === 'done' ? 'Close' : 'Cancel'}</Button>
            {phase.kind !== 'done' && <Button variant="outline" size="sm" onClick={() => void write()} disabled={busy || posting}>{phase.kind === 'error' && phase.retry === 'write' ? 'Try again' : 'Write a new one'}</Button>}
            {phase.kind !== 'done' && <Button size="sm" onClick={() => void post()} disabled={!canPost}>{phase.kind === 'error' && phase.retry === 'post' ? 'Try posting again' : 'Post now'}</Button>}
          </div>
        </div>
      </Dialog>
    </>
  )
}
