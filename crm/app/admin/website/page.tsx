import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { OfferInsightsPanel } from '@/components/admin/OfferInsightsPanel'
import { WebsiteTrackingToggle } from '@/components/admin/WebsiteTrackingToggle'
import { PageIntro } from '@/components/PageIntro'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { requireUser } from '@/lib/auth'
import { loadSiteInsights } from '@/lib/offer-insights'
import { getSetting } from '@/lib/settings'
import { SITE_PAGES, isSitePage, type SitePage } from '@/lib/site-pages'

export const metadata = { title: 'Website' }
export const dynamic = 'force-dynamic'

const RANGES = [7, 30, 90] as const

/** Our own Hotjar for igani.co: how visitors read the home page and the real estate page. Admin only. */
export default async function WebsitePage(props: { searchParams: Promise<{ page?: string; days?: string }> }): Promise<React.ReactElement> {
  await requireUser(['ADMIN'])
  const sp = await props.searchParams
  const page: SitePage = sp.page && isSitePage(sp.page) ? sp.page : 'home'
  const days = RANGES.find((d) => String(d) === sp.days) ?? 30
  const [data, tracking] = await Promise.all([loadSiteInsights(page, days), getSetting('website.tracking')])
  const meta = SITE_PAGES[page]
  const url = `${meta.base}${meta.path}`
  const pill = (active: boolean): string => `rounded-md px-3 py-1 text-sm ${active ? 'bg-background font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`
  const href = (p: SitePage, d: number): string => `/admin/website?page=${p}${d === 30 ? '' : `&days=${d}`}`

  return (
    <div className="space-y-5">
      <PageIntro title="Website" hint="How visitors read igani.co and the real estate site: how far they scroll, which sections hold them, where they click, and a heatmap. Visits from this CRM's Open buttons are never counted." />
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {(Object.keys(SITE_PAGES) as SitePage[]).map((p) => (
            <Link key={p} href={href(p, days)} className={pill(p === page)} aria-current={p === page ? 'page' : undefined}>
              {SITE_PAGES[p].label}
            </Link>
          ))}
        </div>
        <div className="inline-flex rounded-lg border bg-muted/40 p-0.5">
          {RANGES.map((d) => (
            <Link key={d} href={href(page, d)} className={pill(d === days)}>
              {d} days
            </Link>
          ))}
        </div>
        <a href={`${url}?team=1`} target="_blank" rel="noreferrer" className="ms-auto inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" title="Opens the page and marks this browser as team, so your own visits aren't counted">
          Open page <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">{meta.label}</CardTitle>
            <p className="font-mono text-xs text-muted-foreground">{url.replace(/^https?:\/\//, '')}</p>
          </div>
          <WebsiteTrackingToggle key={page} page={page} initial={tracking} />
        </CardHeader>
        <CardContent>
          <OfferInsightsPanel site data={data} target={{ kind: 'remote', url: `${url}?igani-heatmap=1`, origin: new URL(meta.base).origin }} />
        </CardContent>
      </Card>
    </div>
  )
}
