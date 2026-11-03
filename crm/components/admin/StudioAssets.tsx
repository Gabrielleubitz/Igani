'use client'

import { ImagePlus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface Asset {
  name: string
  path: string
  size: number
  logo: boolean
}

/**
 * The client's logo and images for this offer (studio only). Files land in public/offers/<slug>/, ship with "push",
 * and show up in offer-data.json so Claude can use them. Tell Claude in the terminal when you've added something.
 */
export function StudioAssets({ slug, api }: { slug: string; api: string }): React.ReactElement {
  const [assets, setAssets] = useState<Asset[]>([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const imgRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void fetch(api).then(async (r) => r.ok && setAssets(((await r.json()) as { assets: Asset[] }).assets))
  }, [api])

  async function upload(files: FileList | null, kind: 'logo' | 'image'): Promise<void> {
    if (!files?.length) return
    setBusy(true)
    setMsg(null)
    // One request per file, sent as-is to the studio helper on this Mac (saved into public/offers/<slug>/)
    let latest: Asset[] | null = null
    for (const f of Array.from(files).slice(0, kind === 'logo' ? 1 : 20)) {
      const r = await fetch(api, { method: 'POST', headers: { 'content-type': f.type || 'application/octet-stream', 'x-file-name': encodeURIComponent(f.name), 'x-kind': kind }, body: f })
      const data = (await r.json().catch(() => ({}))) as { assets?: Asset[]; error?: string }
      if (!r.ok || !data.assets) {
        setBusy(false)
        return setMsg({ ok: false, text: data.error ?? 'Upload failed' })
      }
      latest = data.assets
    }
    setBusy(false)
    if (latest) setAssets(latest)
    window.dispatchEvent(new Event('studio:assets')) // the preview reloads with the new logo
    setMsg({ ok: true, text: kind === 'logo' ? 'Logo saved: it is on the offer now (header and summary card). Claude can also use it in the mockups.' : 'Saved. Tell Claude which images to use (they are listed in offer-data.json).' })
  }

  async function remove(name: string): Promise<void> {
    const r = await fetch(`${api}?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
    if (r.ok) {
      setAssets(((await r.json()) as { assets: Asset[] }).assets)
      window.dispatchEvent(new Event('studio:assets'))
    }
  }

  // Thumbnails are served by the local preview server (the files live on this Mac until "push")
  const preview = `http://${slug}.localhost:3100`
  const logo = assets.find((a) => a.logo)
  const images = assets.filter((a) => !a.logo)
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 text-sm">
      <span className="font-medium">Client logo</span>
      <button type="button" onClick={() => logoRef.current?.click()} disabled={busy} className="flex h-10 min-w-[7rem] items-center justify-center rounded-md border border-dashed border-border bg-white px-2" title={logo ? 'Replace the logo' : 'Upload the logo'}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local preview of a just-uploaded file
 <img src={`${preview}${logo.path}?v=${logo.size}`} alt="Client logo" className="max-h-8 max-w-[9rem] object-contain" />
        ) : (
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <ImagePlus className="h-4 w-4" aria-hidden /> Upload
          </span>
        )}
      </button>
      <input ref={logoRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => void upload(e.target.files, 'logo')} />
      <span className="mx-1 h-6 w-px bg-border" />
      <span className="font-medium">Images</span>
      <div className="flex max-w-full flex-wrap items-center gap-2">
        {images.map((a) => (
          <span key={a.name} className="group relative" title={a.path}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
 <img src={`${preview}${a.path}`} alt={a.name} className="h-10 w-14 rounded border border-border object-cover" />
            <button type="button" onClick={() => void remove(a.name)} aria-label={`Remove ${a.name}`} className="absolute -end-1.5 -top-1.5 hidden rounded-full bg-rose-600 p-0.5 text-white group-hover:block">
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Button type="button" variant="outline" size="sm" className="h-10" onClick={() => imgRef.current?.click()} disabled={busy}>
          + Add screenshots / photos
        </Button>
      </div>
      <input ref={imgRef} type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif" className="hidden" onChange={(e) => void upload(e.target.files, 'image')} />
      {busy ? <span className="text-xs text-muted-foreground">Uploading…</span> : msg ? <span className={`text-xs ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
    </div>
  )
}
