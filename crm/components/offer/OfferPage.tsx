import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { defaultSelection, formatPrice, normalizeSelection } from '@/lib/offer-modules'
import type { PublicOffer } from '@/lib/offers'
import type { Lang, OfferContent, Section } from '@/offers/types'
import { DeviceFrame } from './DeviceFrame'
import { FlowPlayer } from './FlowPlayer'
import { t, ui, monthYear } from './i18n'
import { ModulePicker, OfferSelectionProvider, SelectedRecurring, SelectedTotal, SignPanel, type ModuleCopy } from './OfferClient'

const DEFAULT_ACCENT = '#2563eb'

/** Link inside an offer that keeps the language: offerHref('/o/x', '/screen/a?step=1#top', 'en') → /o/x/screen/a?step=1&lang=en#top */
export function offerHref(base: string, path: string, lang: Lang): string {
  const [pathAndQuery = '', hash] = path.split('#', 2)
  const href = `${base}${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}lang=${lang}`
  return `${href || '/'}${hash ? `#${hash}` : ''}`
}

function Heading({ id, eyebrow, children }: { id?: string; eyebrow?: string; children: ReactNode }): React.ReactElement {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      {eyebrow ? <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--offer-accent)]">{eyebrow}</div> : null}
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">{children}</h2>
    </div>
  )
}

function Prose({ section, lang }: { section: Section; lang: Lang }): React.ReactElement {
  return (
    <div>
      <p className="whitespace-pre-line text-[17px] leading-8 text-slate-700">{t(section.body, lang)}</p>
      {section.points?.length ? (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {section.points.map((p, n) => (
            <li key={n} className="flex gap-3 rounded-xl bg-white p-4 text-slate-700 shadow-sm ring-1 ring-slate-200/70">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--offer-accent)]" />
              <span>{t(p, lang)}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }): React.ReactElement {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{children}</div>
    </div>
  )
}

export function OfferPage({ data, lang, base, supportEmail }: { data: PublicOffer; lang: Lang; base: string; supportEmail: string }): React.ReactElement {
  const { offer, modules, definition, preview } = data
  const content: OfferContent | undefined = definition?.content
  const rtl = lang === 'he'
  const accent = content?.client.accent ?? DEFAULT_ACCENT
  const clientName = content ? t(content.client.name, lang) : offer.lead.company || [offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ') || offer.title
  const initial = offer.selectedModules.length ? normalizeSelection(modules, offer.selectedModules) : defaultSelection(modules)
  const screensCount = content?.flows.reduce((n, f) => n + f.steps.length, 0) ?? 0
  const copy: Record<string, ModuleCopy> = Object.fromEntries(
    modules.map((m) => {
      const c = content?.modules[m.id]
      return [m.id, { title: c ? t(c.title, lang) : m.name, summary: c ? t(c.summary, lang) : (m.summary ?? ''), bullets: c?.bullets?.map((b) => t(b, lang)) ?? [] }]
    }),
  )
  const editable = offer.status === 'LIVE' && !preview
  const otherLang: Lang = lang === 'he' ? 'en' : 'he'
  const nav: [string, string][] = [
    ['#overview', ui('overview', lang)],
    ...(content?.flows.length ? ([['#screens', ui('screens', lang)]] as [string, string][]) : []),
    ...(modules.length ? ([['#modules', ui('modulesShort', lang)]] as [string, string][]) : []),
    ...(content?.phases.length ? ([['#phases', ui('phases', lang)]] as [string, string][]) : []),
    ['#sign', ui('sign', lang)],
  ]

  return (
    <div dir={rtl ? 'rtl' : 'ltr'} lang={lang} className="offer-root min-h-screen bg-[#f6f7fb] text-slate-900 antialiased" style={{ '--offer-accent': accent } as CSSProperties}>
      {preview ? <div className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900">{ui('draft', lang)}</div> : null}

      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo onLight height={24} />
          <span className="hidden truncate text-sm text-slate-500 md:inline">
            {ui('offer', lang)} · {clientName}
          </span>
          <nav className="ms-auto hidden items-center gap-1 lg:flex" aria-label={ui('overview', lang)}>
            {nav.map(([href, label]) => (
              <a key={href} href={href} className="rounded-full px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                {label}
              </a>
            ))}
          </nav>
          <a href={offerHref(base, '', otherLang)} className="ms-auto rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50 lg:ms-0">
            {otherLang === 'he' ? 'עברית' : 'English'}
          </a>
        </div>
      </header>

      <OfferSelectionProvider slug={offer.slug} modules={modules} initial={initial} editable={editable} fixedMonthly={offer.monthlyPrice}>
        <main className="mx-auto max-w-6xl space-y-24 px-4 pb-24 pt-14 sm:px-6">
          {/* Hero + summary card */}
          <section id="overview" className="grid scroll-mt-24 gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
            <div>
              <div className="mb-4 inline-flex rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_12%,white)] px-3 py-1 text-xs font-semibold text-[var(--offer-accent)]">
                {content ? t(content.hero.eyebrow, lang) : ui('offer', lang)}
              </div>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">{content ? t(content.hero.title, lang) : offer.title}</h1>
              {content ? <p className="mt-6 whitespace-pre-line text-lg leading-8 text-slate-600">{t(content.hero.summary, lang)}</p> : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#modules" className="rounded-xl bg-[var(--offer-accent)] px-5 py-3 font-semibold text-white">
                  {ui('seeModules', lang)}
                </a>
                <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(offer.title)}`} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-800">
                  {ui('talk', lang)}
                </a>
              </div>
            </div>
            <aside className="rounded-3xl bg-white p-6 shadow-[0_20px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-slate-200/70">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                {content?.client.logo ? <Image src={content.client.logo} alt={clientName} width={120} height={40} className="h-10 w-auto object-contain" /> : null}
                <div>
                  <div className="text-xs text-slate-500">{ui('preparedFor', lang)}</div>
                  <div className="font-semibold">{clientName}</div>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-5">
                <Fact label={ui('date', lang)}>{monthYear(offer.publishedAt ?? offer.createdAt, lang)}</Fact>
                {modules.length ? (
                  <Fact label={ui('oneTime', lang)}>
                    <SelectedTotal currency={offer.currency} />
                  </Fact>
                ) : null}
                <SelectedRecurring currency={offer.currency} period="month" label={ui('monthly', lang)} />
                <SelectedRecurring currency={offer.currency} period="year" label={ui('yearly', lang)} />
                {offer.timelineMonths ? (
                  <Fact label={ui('timeline', lang)}>
                    {offer.timelineMonths} {ui('months', lang)}
                  </Fact>
                ) : null}
                {modules.length || screensCount ? (
                  <Fact label={ui('scope', lang)}>
                    <span className="text-base">
                      {modules.length ? `${modules.length} ${ui('modulesCount', lang)}` : ''}
                      {modules.length && screensCount ? ' · ' : ''}
                      {screensCount ? `${screensCount} ${ui('screensCount', lang)}` : ''}
                    </span>
                  </Fact>
                ) : null}
                {content?.facts?.map((f, n) => (
                  <Fact key={n} label={t(f.label, lang)}>
                    <span className="text-base">{t(f.value, lang)}</span>
                  </Fact>
                ))}
              </div>
            </aside>
          </section>

          {/* Screens */}
          {content?.flows.length
            ? content.flows.map((flow, fi) => (
                <section key={flow.id} id={fi === 0 ? 'screens' : `flow-${flow.id}`} className="scroll-mt-24">
                  <Heading eyebrow={ui('screens', lang)}>{t(flow.title, lang)}</Heading>
                  {flow.caption ? <p className="-mt-4 mb-8 max-w-3xl text-slate-600">{t(flow.caption, lang)}</p> : null}
                  <FlowPlayer
                    stacked={flow.device === 'desktop'}
                    rtl={rtl}
                    labels={{ step: ui('step', lang), of: ui('of', lang), next: ui('next', lang), prev: ui('prev', lang) }}
                    steps={flow.steps.map((s) => ({ title: t(s.title, lang), caption: t(s.caption, lang) }))}
                    slides={flow.steps.map((s, n) => {
                      const Screen = definition?.screens[s.screen]
                      return (
                        <div key={n} className="flex flex-col items-center gap-3">
                          <DeviceFrame device={flow.device}>{Screen ? <Screen lang={lang} /> : <div className="p-6 text-sm text-slate-400">{s.screen}</div>}</DeviceFrame>
                          <div className="flex gap-3 text-xs">
                            <a href={offerHref(base, `/screen/${flow.id}?step=${n}&device=phone`, lang)} className="text-slate-500 hover:text-slate-900">
                              {ui('fullScreen', lang)} · {ui('phone', lang)}
                            </a>
                            <a href={offerHref(base, `/screen/${flow.id}?step=${n}&device=desktop`, lang)} className="text-slate-500 hover:text-slate-900">
                              {ui('fullScreen', lang)} · {ui('desktop', lang)}
                            </a>
                          </div>
                        </div>
                      )
                    })}
                  />
                </section>
              ))
            : null}

          {/* Need + solution */}
          {content ? (
            <section className="grid gap-12 lg:grid-cols-2">
              <div>
                <Heading eyebrow={ui('need', lang)}>{t(content.need.title, lang)}</Heading>
                <Prose section={content.need} lang={lang} />
              </div>
              <div>
                <Heading eyebrow={ui('system', lang)}>{t(content.solution.title, lang)}</Heading>
                <Prose section={content.solution} lang={lang} />
              </div>
            </section>
          ) : null}

          {/* Architecture */}
          {content?.architecture ? (
            <section>
              <Heading eyebrow={ui('howItConnects', lang)}>{t(content.architecture.title, lang)}</Heading>
              {content.architecture.intro ? <p className="-mt-4 mb-8 max-w-3xl text-slate-600">{t(content.architecture.intro, lang)}</p> : null}
              <div className="space-y-3">
                {content.architecture.layers.map((layer, n) => (
                  <div key={n} className="grid gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200/70 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-center">
                    <div className="text-sm font-semibold text-slate-500">{t(layer.name, lang)}</div>
                    <div className="flex flex-wrap gap-2">
                      {layer.items.map((it, k) =>
                        it.moduleId ? (
                          <a key={k} href={`#module-${it.moduleId}`} className="rounded-lg border border-[color-mix(in_srgb,var(--offer-accent)_35%,white)] bg-[color-mix(in_srgb,var(--offer-accent)_8%,white)] px-3 py-1.5 text-sm font-medium text-slate-800 hover:border-[var(--offer-accent)]">
                            {t(it.label, lang)}
                          </a>
                        ) : (
                          <span key={k} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm text-slate-700">
                            {t(it.label, lang)}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Gallery */}
          {content?.gallery?.length ? (
            <section>
              <Heading eyebrow={ui('gallery', lang)}>{clientName}</Heading>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {content.gallery.map((g, n) => (
                  <figure key={n} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/70">
                    <Image src={g.src} alt={t(g.caption, lang)} width={800} height={520} className="aspect-[4/3] w-full object-cover" />
                    <figcaption className="p-3 text-sm text-slate-600">{t(g.caption, lang)}</figcaption>
                  </figure>
                ))}
              </div>
            </section>
          ) : null}

          {/* Modules */}
          {modules.length ? (
            <section>
              <Heading id="modules" eyebrow={ui('seeModules', lang)}>
                {ui('modules', lang)}
              </Heading>
              <ModulePicker modules={modules} copy={copy} currency={offer.currency} lang={lang} />
            </section>
          ) : null}

          {/* Phases */}
          {content?.phases.length ? (
            <section>
              <Heading id="phases" eyebrow={ui('timeline', lang)}>
                {ui('phases', lang)}
                {offer.timelineMonths ? ` · ${offer.timelineMonths} ${ui('months', lang)}` : ''}
              </Heading>
              <ol className="relative space-y-6 border-s-2 border-slate-200 ps-6">
                {content.phases.map((p, n) => (
                  <li key={n} className="relative">
                    <span className="absolute -start-[33px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-[var(--offer-accent)] bg-white" />
                    <div className="text-xs font-semibold uppercase tracking-wider text-[var(--offer-accent)]">{t(p.when, lang)}</div>
                    <div className="mt-1 font-semibold text-slate-900">{t(p.title, lang)}</div>
                    <p className="mt-1 text-slate-600">{t(p.body, lang)}</p>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {/* Decisions */}
          {content?.decisions?.length ? (
            <section>
              <Heading eyebrow={ui('decisions', lang)}>{ui('decisions', lang)}</Heading>
              <div className="overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200/70">
                <table className="w-full min-w-[560px] text-start text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-start font-medium">{ui('question', lang)}</th>
                      <th className="px-4 py-3 text-start font-medium">{ui('impact', lang)}</th>
                      <th className="px-4 py-3 text-start font-medium">{ui('due', lang)}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {content.decisions.map((d, n) => (
                      <tr key={n}>
                        <td className="px-4 py-3 font-medium text-slate-900">{t(d.question, lang)}</td>
                        <td className="px-4 py-3 text-slate-600">{t(d.impact, lang)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{t(d.due, lang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {/* About + next steps + sign */}
          <section id="sign" className="grid scroll-mt-24 gap-12 lg:grid-cols-2">
            <div className="space-y-12">
              {content?.about ? (
                <div>
                  <Heading eyebrow={ui('about', lang)}>{t(content.about.title, lang)}</Heading>
                  <Prose section={content.about} lang={lang} />
                </div>
              ) : null}
              {content ? (
                <div>
                  <Heading eyebrow={ui('nextSteps', lang)}>{t(content.nextSteps.title, lang)}</Heading>
                  <Prose section={content.nextSteps} lang={lang} />
                </div>
              ) : null}
            </div>
            <SignPanel
              slug={offer.slug}
              lang={lang}
              currency={offer.currency}
              modules={modules}
              moduleTitles={Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.title]))}
              contractUrl={offer.contractUrl}
              defaultName={[offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ')}
              defaultEmail={offer.lead.email ?? ''}
              signed={offer.signedAt && offer.signerName ? { name: offer.signerName, at: offer.signedAt.toISOString() } : null}
              preview={preview}
            />
          </section>
        </main>
      </OfferSelectionProvider>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-sm text-slate-500">
        <div className="mb-3 flex justify-center">
          <Logo onLight height={20} />
        </div>
        {ui('preparedBy', lang)} · {monthYear(offer.publishedAt ?? offer.createdAt, lang)}
      </footer>
    </div>
  )
}
