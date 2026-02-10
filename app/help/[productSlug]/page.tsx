'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { getHelpProductConfig } from '@/lib/help-product-config'
import { HelpPageTemplate } from '@/components/HelpPageTemplate'

/** Generic gate when ?src= or ?k= is required but missing. No product details. */
function HelpGateView() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-bold text-white mb-2">Support</h1>
        <p className="text-slate-400 mb-6">
          If you were sent here from one of our products, use the link from that app to open the correct support form.
        </p>
        <a
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Go back
        </a>
      </div>
    </div>
  )
}

export default function ProductHelpPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const productSlug = typeof params?.productSlug === 'string' ? params.productSlug : ''

  const config = useMemo(() => getHelpProductConfig(productSlug), [productSlug])
  const srcParam = searchParams?.get('src')?.toLowerCase()
  const kParam = searchParams?.get('k')
  const gateRequired = config?.requireSourceParam === true
  const gatePassed = !gateRequired || srcParam === productSlug.toLowerCase() || !!kParam

  const sourceUrl =
    typeof window !== 'undefined'
      ? window.location.href
      : `https://igani.co/help/${productSlug}`

  if (!config) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold text-white mb-2">Not found</h1>
          <p className="text-slate-400 mb-6">This help page does not exist.</p>
          <a href="/" className="text-cyan-400 hover:text-cyan-300">
            Go back
          </a>
        </div>
      </div>
    )
  }

  if (!gatePassed) {
    return <HelpGateView />
  }

  return <HelpPageTemplate config={config} sourceUrl={sourceUrl} />
}
