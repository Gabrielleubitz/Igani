import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DeviceFrame } from '@/components/offer/DeviceFrame'
import { FlowPlayer } from '@/components/offer/FlowPlayer'
import { t, ui } from '@/components/offer/i18n'
import { offerHref } from '@/components/offer/OfferPage'
import { offerBase, pickLang } from '@/lib/offer-request'
import { loadPublicOffer } from '@/lib/offers'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { robots: { index: false, follow: false } }

type Props = { params: Promise<{ slug: string; flow: string }>; searchParams: Promise<{ lang?: string; step?: string; device?: string }> }

/** One flow, full screen, in the device the viewer picked (phone or desktop). */
export default async function ScreenPage(props: Props): Promise<React.ReactElement> {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const data = await loadPublicOffer(params.slug)
  const flow = data?.definition?.content.flows.find((f) => f.id === params.flow)
  if (!data || !flow) notFound()
  const lang = pickLang(searchParams.lang, data.definition?.content.defaultLang)
  const base = await offerBase(params.slug)
  const device = searchParams.device === 'desktop' ? 'desktop' : searchParams.device === 'phone' ? 'phone' : flow.device
  const step = Number.parseInt(searchParams.step ?? '0', 10) || 0
  const rtl = lang === 'he'
  const screens = data.definition!.screens
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="relative min-h-screen overflow-x-clip bg-[#f4f6f9] px-4 py-6 text-slate-900 antialiased" style={{ ['--offer-accent' as string]: data.definition?.content.client.accent ?? '#2563eb' }}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(50%_50%_at_50%_0%,color-mix(in_srgb,var(--offer-accent)_14%,transparent),transparent_70%)]" />
      <div className="relative mx-auto mb-10 flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <a href={offerHref(base, '#screens', lang)} className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/10 hover:text-slate-900">
          {rtl ? '→' : '←'} {ui('backToOffer', lang)}
        </a>
        <h1 className="text-lg font-semibold tracking-tight">{t(flow.title, lang)}</h1>
        <div className="flex gap-0.5 rounded-full bg-slate-900/[0.05] p-1 text-sm">
          {(['phone', 'desktop'] as const).map((d) => (
            <a key={d} href={offerHref(base, `/screen/${flow.id}?step=${step}&device=${d}`, lang)} className={`rounded-full px-3.5 py-1.5 font-medium transition ${d === device ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5' : 'text-slate-500 hover:text-slate-900'}`}>
              {ui(d, lang)}
            </a>
          ))}
        </div>
      </div>
      <div className={`relative ${device === 'desktop' ? 'mx-auto max-w-6xl' : 'mx-auto max-w-5xl'}`}>
        <FlowPlayer
          stacked={device === 'desktop'}
          initialStep={step}
          rtl={rtl}
          labels={{ step: ui('step', lang), of: ui('of', lang), next: ui('next', lang), prev: ui('prev', lang) }}
          steps={flow.steps.map((s) => ({ title: t(s.title, lang), caption: t(s.caption, lang) }))}
          slides={flow.steps.map((s, n) => {
            const Screen = screens[s.screen]
            return (
              <DeviceFrame key={n} device={device} url={`${params.slug}.app.igani.co`}>
                {Screen ? <Screen lang={lang} /> : null}
              </DeviceFrame>
            )
          })}
        />
      </div>
    </div>
  )
}
