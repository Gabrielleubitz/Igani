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

  const frameClasses = (() => {
    switch (viewMode) {
      case 'mobile':
        return 'w-full max-w-[320px] h-[640px]'
      case 'tablet':
        return 'w-full max-w-[768px] h-[900px]'
      default:
        return 'w-full h-[600px] sm:h-[700px] md:h-[800px]'
    }
  })()

  return (
    <div className={`overflow-hidden rounded-xl border-4 border-slate-700/30 bg-white shadow-2xl ${frameClasses}`}>
      <div className="flex h-full flex-col bg-white">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500">
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{liveUrl.replace(/^https?:\/\//, '')}</span>
          </div>
          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-50"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <T>Live</T>
            </a>
          )}
        </div>

        {embedCheck?.embeddable === false && (
          <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-100">
            <p className="font-semibold text-amber-50"><T>Live embed blocked by this site&apos;s security headers</T></p>
            <p className="mt-1 text-amber-100/90">
              <T>
                For Igani-built projects, allow framing from igani.co in the project&apos;s Next.js headers
                (frame-ancestors). Until then, use Visit Live Site.
              </T>
            </p>
          </div>
        )}

        <div className="relative min-h-0 flex-1 bg-white">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-white/95 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
              <p className="text-sm font-medium"><T>Loading live site…</T></p>
            </div>
          )}

          {liveUrl ? (
            <iframe
              ref={iframeRef}
              src={liveUrl}
              title={`Preview of ${title}`}
              className="h-full w-full border-0 bg-white"
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
