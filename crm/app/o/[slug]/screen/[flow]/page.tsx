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

type Props = { params: { slug: string; flow: string }; searchParams: { lang?: string; step?: string; device?: string } }

/** One flow, full screen, in the device the viewer picked (phone or desktop). */
export default async function ScreenPage({ params, searchParams }: Props): Promise<React.ReactElement> {
  const data = await loadPublicOffer(params.slug)
  const flow = data?.definition?.content.flows.find((f) => f.id === params.flow)
  if (!data || !flow) notFound()
  const lang = pickLang(searchParams.lang, data.definition?.content.defaultLang)
  const device = searchParams.device === 'desktop' ? 'desktop' : searchParams.device === 'phone' ? 'phone' : flow.device
  const step = Number.parseInt(searchParams.step ?? '0', 10) || 0
  const rtl = lang === 'he'
  const screens = data.definition!.screens
  return (
    <div dir={rtl ? 'rtl' : 'ltr'} className="min-h-screen bg-[#eef1f6] px-4 py-6 text-slate-900" style={{ ['--offer-accent' as string]: data.definition?.content.client.accent ?? '#2563eb' }}>
      <div className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <a href={offerHref(offerBase(params.slug), '#screens', lang)} className="text-sm font-medium text-slate-600 hover:text-slate-900">
          {rtl ? '→' : '←'} {ui('backToOffer', lang)}
        </a>
        <h1 className="text-lg font-semibold">{t(flow.title, lang)}</h1>
        <div className="flex gap-1 rounded-full bg-white p-1 text-sm shadow-sm">
          {(['phone', 'desktop'] as const).map((d) => (
            <a key={d} href={offerHref(offerBase(params.slug), `/screen/${flow.id}?step=${step}&device=${d}`, lang)} className={`rounded-full px-3 py-1 ${d === device ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>
              {ui(d, lang)}
            </a>
          ))}
        </div>
      </div>
      <div className={device === 'desktop' ? 'mx-auto max-w-6xl' : 'mx-auto max-w-4xl'}>
        <FlowPlayer
          stacked={device === 'desktop'}
          initialStep={step}
          rtl={rtl}
          labels={{ step: ui('step', lang), of: ui('of', lang), next: ui('next', lang), prev: ui('prev', lang) }}
          steps={flow.steps.map((s) => ({ title: t(s.title, lang), caption: t(s.caption, lang) }))}
          slides={flow.steps.map((s, n) => {
            const Screen = screens[s.screen]
            return (
              <DeviceFrame key={n} device={device}>
                {Screen ? <Screen lang={lang} /> : null}
              </DeviceFrame>
            )
          })}
        />
      </div>
    </div>
  )
}
