'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { createTestUpload, discardTestUpload, instagramTestPost, instagramTestStatus, tiktokTestInfo, tiktokTestPost, tiktokTestStatus } from '@/app/actions/social-test'

type Platform = 'tiktok' | 'instagram'
type Phase = { kind: 'idle' } | { kind: 'uploading'; pct: number } | { kind: 'sending' } | { kind: 'processing' } | { kind: 'done'; link: string | null; note: string } | { kind: 'error'; error: string }

const PRIVACY_LABELS: Record<string, string> = { SELF_ONLY: 'Only me', MUTUAL_FOLLOW_FRIENDS: 'Friends', FOLLOWER_OF_CREATOR: 'Followers', PUBLIC_TO_EVERYONE: 'Everyone' }
const NAME: Record<Platform, string> = { tiktok: 'TikTok', instagram: 'Instagram' }

function putFile(url: string, file: File, onProgress: (pct: number) => void): Promise<void> {
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

/** "Post now" on a connected account card: upload a short MP4 and publish it right away, to prove the connection works. */
export function SocialTestPost({ platform }: { platform: Platform }): React.ReactElement {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('Testing the Igani connection')
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const [privacy, setPrivacy] = useState('SELF_ONLY')
  const [tiktok, setTiktok] = useState<{ username: string | null; nickname: string | null; options: string[]; maxSec: number | null } | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const name = NAME[platform]
  const busy = phase.kind === 'uploading' || phase.kind === 'sending' || phase.kind === 'processing'

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  // TikTok: who we post as and which privacy levels are allowed (an unaudited app only gets "Only me")
  useEffect(() => {
    if (!open || platform !== 'tiktok' || tiktok) return
    void tiktokTestInfo().then((r) => {
      if (!r.ok) return setInfoError(r.error)
      setTiktok({ username: r.username, nickname: r.nickname, options: r.privacyOptions, maxSec: r.maxDurationSec })
      if (!r.privacyOptions.includes('SELF_ONLY') && r.privacyOptions[0]) setPrivacy(r.privacyOptions[0])
    })
  }, [open, platform, tiktok])

  function close(): void {
    if (busy) return // Instagram only publishes when we poll it, so stay open until it's done
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setOpen(false)
    setPhase({ kind: 'idle' })
    setFile(null)
  }

  function poll(check: () => Promise<{ done: boolean; link?: string | null; error?: string }>, note: string): void {
    setPhase({ kind: 'processing' })
    const started = Date.now()
    timer.current = setInterval(async () => {
      const r: { done: boolean; link?: string | null; error?: string } = await check().catch((e: unknown) => ({ done: false, error: e instanceof Error ? e.message : 'Check failed' }))
      if (r.error) { clearInterval(timer.current!); timer.current = null; return setPhase({ kind: 'error', error: r.error }) }
      if (r.done) { clearInterval(timer.current!); timer.current = null; return setPhase({ kind: 'done', link: r.link ?? null, note }) }
      if (Date.now() - started > 5 * 60_000) { clearInterval(timer.current!); timer.current = null; setPhase({ kind: 'error', error: `${name} is still processing after 5 minutes. Check the account in the app.` }) }
    }, 5000)
  }

  async function post(): Promise<void> {
    if (!file) return
    if (file.type !== 'video/mp4') return setPhase({ kind: 'error', error: 'Use an MP4 video.' })
    setPhase({ kind: 'uploading', pct: 0 })
    const up = await createTestUpload({ size: file.size, contentType: file.type })
    if (!up.ok) return setPhase({ kind: 'error', error: up.error })
    try {
      await putFile(up.url, file, (pct) => setPhase({ kind: 'uploading', pct }))
    } catch (e) {
      await discardTestUpload(up.key)
      return setPhase({ kind: 'error', error: e instanceof Error ? e.message : 'Upload failed' })
    }
    setPhase({ kind: 'sending' })
    if (platform === 'tiktok') {
      const r = await tiktokTestPost({ key: up.key, caption, privacy })
      if (!r.ok) return setPhase({ kind: 'error', error: r.error })
      const user = tiktok?.username
      poll(async () => {
        const s = await tiktokTestStatus(r.publishId)
        if (!s.ok) return { done: false, error: s.error }
        if (s.status !== 'PUBLISH_COMPLETE') return { done: false }
        return { done: true, link: s.postId && user ? `https://www.tiktok.com/@${user}/video/${s.postId}` : null }
      }, privacy === 'SELF_ONLY' ? 'Posted to TikTok as "Only me". Delete it from the TikTok app when you\'re done.' : 'Posted to TikTok. Delete it from the TikTok app when you\'re done.')
    } else {
      const r = await instagramTestPost({ key: up.key, caption })
      if (!r.ok) return setPhase({ kind: 'error', error: r.error })
      poll(async () => {
        const s = await instagramTestStatus({ key: up.key, containerId: r.containerId })
        if (!s.ok) return { done: false, error: s.error }
        return s.status === 'posted' ? { done: true, link: s.permalink } : { done: false }
      }, 'Posted to Instagram, publicly. Delete it from the Instagram app when you\'re done.')
    }
  }

  const status =
    phase.kind === 'uploading' ? `Uploading… ${phase.pct}%`
    : phase.kind === 'sending' ? `Sending to ${name}…`
    : phase.kind === 'processing' ? `${name} is processing the video. Keep this open: it posts as soon as it's ready (usually under a minute).`
    : null

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>Post now</Button>
      <Dialog open={open} onClose={close} title={`Test post to ${name}`} description={`Posts a short video straight away, to check the connection can publish.${platform === 'instagram' ? ' Instagram has no private posts: it will be public on the account.' : ''}`}>
        <div className="space-y-3 text-sm">
          <label className="block space-y-1">
            <span className="font-medium">Video (MP4, up to 64 MB{platform === 'tiktok' && tiktok?.maxSec ? `, ${tiktok.maxSec}s max` : ''}{platform === 'instagram' ? ', 3 to 90 seconds, ideally 9:16' : ''})</span>
            <input type="file" accept="video/mp4" disabled={busy} onChange={(e) => { setFile(e.target.files?.[0] ?? null); setPhase({ kind: 'idle' }) }} className="block w-full text-sm" />
          </label>
          <label className="block space-y-1">
            <span className="font-medium">Caption</span>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} maxLength={2200} disabled={busy} className="w-full rounded-md border bg-background p-2 text-sm" />
          </label>
          {platform === 'tiktok' && (
            infoError ? <p className="rounded-md bg-red-500/10 px-3 py-2 text-red-600">{infoError}</p>
            : !tiktok ? <p className="text-muted-foreground">Checking the TikTok account…</p>
            : (
              <label className="block space-y-1">
                <span className="font-medium">Who can see it{tiktok.username ? ` (posting as @${tiktok.username})` : ''}</span>
                <select value={privacy} onChange={(e) => setPrivacy(e.target.value)} disabled={busy} className="w-full rounded-md border bg-background p-2 text-sm">
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
              ✓ The connection works. {phase.note}{phase.link ? <> · <a href={phase.link} target="_blank" rel="noreferrer" className="underline">Open it</a></> : null}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={close} disabled={busy}>{phase.kind === 'done' ? 'Close' : 'Cancel'}</Button>
            <Button size="sm" onClick={post} disabled={!file || busy || phase.kind === 'done' || (platform === 'tiktok' && !tiktok)}>Post now</Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
