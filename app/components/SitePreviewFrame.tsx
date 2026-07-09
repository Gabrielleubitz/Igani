'use client'

import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Globe, Loader2 } from 'lucide-react'
import { getWebsiteScreenshotUrl, normalizeWebsiteUrl } from '@/lib/websiteUrl'
import { T } from '@/components/T'

type SitePreviewFrameProps = {
  title: string
  url: string
  fallbackImage?: string
  viewMode: 'desktop' | 'tablet' | 'mobile'
}

export function SitePreviewFrame({ title, url, fallbackImage, viewMode }: SitePreviewFrameProps) {
  const liveUrl = useMemo(() => {
    try {
      return normalizeWebsiteUrl(url)
    } catch {
      return ''
    }
  }, [url])

  const screenshotUrl = useMemo(
    () => (liveUrl ? getWebsiteScreenshotUrl(liveUrl) : ''),
    [liveUrl]
  )

  const [previewSrc, setPreviewSrc] = useState(screenshotUrl)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    setPreviewSrc(screenshotUrl)
    setIsLoading(true)
    setHasError(false)
  }, [screenshotUrl])

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

  const handleImageError = () => {
    if (fallbackImage && previewSrc !== fallbackImage) {
      setPreviewSrc(fallbackImage)
      setIsLoading(true)
      return
    }
    setIsLoading(false)
    setHasError(true)
  }

  return (
    <div className={`bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-slate-700/30 ${frameClasses}`}>
      <div className="flex h-full flex-col bg-[#f4f6f8]">
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

        <div className="relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[#eef1f4]">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#eef1f4]/95 text-slate-600">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
              <p className="text-sm font-medium"><T>Capturing live preview…</T></p>
              <p className="max-w-xs px-6 text-center text-xs text-slate-500">
                <T>Most client sites block in-page embedding, so we load a fresh screenshot instead.</T>
              </p>
            </div>
          )}

          {hasError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="text-sm font-medium text-slate-700"><T>Preview unavailable</T></p>
              <p className="max-w-sm text-sm text-slate-500">
                <T>We couldn&apos;t capture this site right now. Open the live project to view it.</T>
              </p>
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-700"
                >
                  <ExternalLink className="h-4 w-4" />
                  <T>Visit Live Site</T>
                </a>
              )}
            </div>
          ) : (
            previewSrc && (
              <img
                src={previewSrc}
                alt={`Preview of ${title}`}
                className="block w-full"
                onLoad={() => setIsLoading(false)}
                onError={handleImageError}
              />
            )
          )}
        </div>
      </div>
    </div>
  )
}
