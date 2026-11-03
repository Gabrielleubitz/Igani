import Link from 'next/link'
import { DeviceFrame } from '@/components/offer/DeviceFrame'
import { PageIntro } from '@/components/PageIntro'
import { CopyButton } from '@/components/ui/copy-button'
import { requireUser } from '@/lib/auth'
import { BLOCKS, BLOCK_CATEGORIES } from '@/offers/blocks/catalog'

export const metadata = { title: 'Offer blocks' }
export const dynamic = 'force-dynamic'

const ACCENTS = ['#2563eb', '#0e7490', '#059669', '#d97706', '#e11d48', '#7c3aed', '#0f172a']

/** Every lego brick Claude builds offer mockups from, rendered live in the chosen accent colour. */
export default async function BlocksPage(props: { searchParams: Promise<{ accent?: string; cat?: string }> }): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  await requireUser(['ADMIN'])
  const accent = /^#[0-9a-f]{6}$/i.test(searchParams.accent ?? '') ? searchParams.accent! : ACCENTS[0]!
  const cat = BLOCK_CATEGORIES.find((c) => c === searchParams.cat)
  const shown = BLOCKS.filter((b) => !cat || b.category === cat)
  const href = (p: { accent?: string; cat?: string | null }): string => {
    const q = new URLSearchParams()
    const a = p.accent ?? accent
    const c = p.cat === null ? undefined : (p.cat ?? cat)
    if (a !== ACCENTS[0]) q.set('accent', a)
    if (c) q.set('cat', c)
    return `/admin/offers/blocks${q.size ? `?${q}` : ''}`
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageIntro title="Offer blocks" hint={`${BLOCKS.length} ready-made pieces Claude builds mockups from. In the studio, ask for them by ID ("use HeroSplit and PricingTiers"); Claude changes the content, not the blocks.`} />
        <Link href="/admin/offers" className="text-sm text-muted-foreground hover:text-foreground">
          ← Offers
        </Link>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={href({ cat: null })} className={`rounded-full border px-3 py-1 ${!cat ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
          All
        </Link>
        {BLOCK_CATEGORIES.map((c) => (
          <Link key={c} href={href({ cat: c })} className={`rounded-full border px-3 py-1 ${cat === c ? 'border-primary/50 bg-primary/15 font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            {c} <span className="tabular-nums text-muted-foreground">{BLOCKS.filter((b) => b.category === c).length}</span>
          </Link>
        ))}
        <span className="ms-auto flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Accent</span>
          {ACCENTS.map((a) => (
            <Link key={a} href={href({ accent: a })} aria-label={`Accent ${a}`} className={`h-6 w-6 rounded-full border-2 ${a === accent ? 'border-white' : 'border-transparent'}`} style={{ background: a }} />
          ))}
        </span>
      </div>
      <div className="grid gap-6 xl:grid-cols-2" style={{ ['--offer-accent' as string]: accent }}>
        {shown.map((b) => (
          <section key={b.id} className={`overflow-hidden rounded-xl border border-border bg-card ${b.fit === 'page' || b.fit === 'desktop' ? 'xl:col-span-2' : ''}`}>
            <div className="flex flex-wrap items-center gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{b.name}</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{b.id}</code>
                  <span className="text-xs text-muted-foreground">
                    {b.category} · {b.fit} · blocks/{b.file}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{b.description}</p>
              </div>
              <span className="hidden text-xs text-muted-foreground lg:inline">from {b.from}</span>
              <CopyButton text={b.id} label="Copy ID" />
            </div>
            <div className="bg-[#eef1f6] p-6 text-slate-900">
              {b.fit === 'phone' ? (
                <DeviceFrame device="phone">{b.sample()}</DeviceFrame>
              ) : b.fit === 'desktop' ? (
                <DeviceFrame device="desktop">{b.sample()}</DeviceFrame>
              ) : (
                <div className="overflow-hidden rounded-xl bg-white shadow-sm">{b.sample()}</div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
