'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Globe, Loader2 } from 'lucide-react'
import { normalizeWebsiteUrl } from '@/lib/websiteUrl'
import { T } from '@/components/T'

type SitePreviewFrameProps = {
  title: string
  url: string
  viewMode: 'desktop' | 'tablet' | 'mobile'
}

/** Viewport each mode renders at before scaling: a laptop, an iPad Air, an iPhone. */
const DEVICES = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
} as const

type EmbedCheck = {
  embeddable: boolean
  reason?: string
}

export function SitePreviewFrame({ title, url, viewMode }: SitePreviewFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [embedCheck, setEmbedCheck] = useState<EmbedCheck | null>(null)

  const liveUrl = useMemo(() => {
    try {
      return normalizeWebsiteUrl(url)
    } catch {
      return ''
    }
  }, [url])

  useEffect(() => {
    if (!liveUrl) return

    let cancelled = false

    const checkEmbed = async () => {
      try {
        const response = await fetch(
          `/api/preview/can-embed?url=${encodeURIComponent(liveUrl)}`
        )
        if (!response.ok) return
        const data = (await response.json()) as EmbedCheck
        if (!cancelled) setEmbedCheck(data)
      } catch {
        // If the check fails, still attempt the iframe.
      }
    }

    void checkEmbed()
    return () => {
      cancelled = true
    }
  }, [liveUrl])

  useEffect(() => {
    setIsLoading(true)
  }, [liveUrl, viewMode])

  // Render the site at a real device size and scale it to fit, so "Desktop" shows the
  // desktop layout even on a phone (a phone-wide iframe would always get the mobile layout)
  const device = DEVICES[viewMode]
  const stageRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState({ width: 0, maxHeight: 0 })

  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const measure = () => setFit({ width: el.clientWidth, maxHeight: Math.max(320, window.innerHeight * 0.8) })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const scale = fit.width ? Math.min(1, fit.width / device.width, fit.maxHeight / device.height) : 0
  const frameWidth = Math.round(device.width * scale)
  const viewportHeight = Math.round(device.height * scale)

  return (
    <div ref={stageRef} className="flex w-full justify-center">
      <div
        className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.9)]"
        style={{ width: frameWidth || '100%', visibility: scale ? 'visible' : 'hidden' }}
      >
        <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2 sm:px-4 sm:py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{liveUrl.replace(/^https?:\/\//, '')}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {scale > 0 && scale < 1 && (
              <span className="hidden text-[11px] tabular-nums text-slate-400 sm:inline">
                {device.width}px · {Math.round(scale * 100)}%
              </span>
            )}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#2A5FB8] hover:bg-[#EEF1F6]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <T>Live</T>
              </a>
            )}
          </div>
        </div>

        {embedCheck?.embeddable === false && (
          <div className="border-b border-amber-500/30 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
            <p className="font-semibold"><T>Live embed blocked by this site&apos;s security headers</T></p>
            <p className="mt-1">
              <T>
                For Igani-built projects, allow framing from igani.co in the project&apos;s Next.js headers
                (frame-ancestors). Until then, use Visit Live Site.
              </T>
            </p>
          </div>
        )}

        <div className="relative overflow-hidden bg-white" style={{ height: viewportHeight || 400 }}>
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-[#4080E0]" />
              <p className="text-sm font-medium"><T>Loading live site…</T></p>
            </div>
          )}

          {liveUrl ? (
            <iframe
              ref={iframeRef}
              src={liveUrl}
              title={`Preview of ${title}`}
              className="absolute left-0 top-0 origin-top-left border-0 bg-white"
              style={{ width: device.width, height: device.height, transform: `scale(${scale || 1})` }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              referrerPolicy="no-referrer-when-downgrade"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
              <T>Invalid project URL</T>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
