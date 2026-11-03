import { ArrowDown, ArrowLeft, ArrowRight, CalendarClock, Check, Expand, Globe, Layers, LayoutGrid, MessageCircle, Monitor, Smartphone, Sparkles } from 'lucide-react'
import Image from 'next/image'
import type { CSSProperties, ReactNode } from 'react'
import { Logo } from '@/components/brand/Logo'
import { defaultSelection, normalizeSelection } from '@/lib/offer-modules'
import type { PublicOffer } from '@/lib/offers'
import { cn } from '@/lib/utils'
import type { Lang, OfferContent, Section as SectionContent } from '@/offers/types'
import { DeviceFrame } from './DeviceFrame'
import { FlowPlayer } from './FlowPlayer'
import { t, ui, monthYear } from './i18n'
import { OfferNav, Reveal } from './OfferChrome'
import { OfferTracker } from './OfferTracker'
import { ModulePicker, OfferSelectionProvider, PackageRecurring, SelectedTotal, SignPanel, type ModuleCopy } from './OfferClient'

const DEFAULT_ACCENT = '#2563eb'
const PHASE_COLS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4' }

/** Link inside an offer that keeps the language: offerHref('/o/x', '/screen/a?step=1#top', 'en') → /o/x/screen/a?step=1&lang=en#top */
export function offerHref(base: string, path: string, lang: Lang): string {
  const [pathAndQuery = '', hash] = path.split('#', 2)
  const href = `${base}${pathAndQuery}${pathAndQuery.includes('?') ? '&' : '?'}lang=${lang}`
  return `${href || '/'}${hash ? `#${hash}` : ''}`
}

// ─── Building blocks of the page ─────────────────────────────────────────────

function Eyebrow({ n, children }: { n: number; children: ReactNode }): React.ReactElement {
  return (
    <div className="mb-3 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[0.2em] rtl:tracking-normal text-[var(--offer-accent)]">
      <span className="tabular-nums">{String(n).padStart(2, '0')}</span>
      <span className="h-px w-8 bg-[color-mix(in_srgb,var(--offer-accent)_40%,transparent)]" />
      <span>{children}</span>
    </div>
  )
}

/** A numbered page section: "02 — SCREENS", big title, optional intro. */
function Section({ id, n, eyebrow, title, intro, children }: { id?: string; n: number; eyebrow: string; title: ReactNode; intro?: string; children: ReactNode }): React.ReactElement {
  return (
    <section id={id} className="scroll-mt-28">
      <Reveal>
        <div className="mb-10 max-w-3xl">
          <Eyebrow n={n}>{eyebrow}</Eyebrow>
          <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-[2.6rem]">{title}</h2>
          {intro ? <p className="mt-4 text-pretty text-lg leading-8 text-slate-600">{intro}</p> : null}
        </div>
      </Reveal>
      <Reveal delay={80}>{children}</Reveal>
    </section>
  )
}

function CheckList({ items, lang, tone = 'neutral' }: { items: SectionContent['points']; lang: Lang; tone?: 'neutral' | 'accent' }): React.ReactElement | null {
  if (!items?.length) return null
  return (
    <ul className="mt-6 space-y-3">
      {items.map((p, k) => (
        <li key={k} className="flex items-start gap-3 text-[15px] leading-7 text-slate-700">
          <span className={cn('mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full', tone === 'accent' ? 'bg-[var(--offer-accent)] text-white' : 'bg-slate-900/[0.06] text-slate-600')}>
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
          <span>{t(p, lang)}</span>
        </li>
      ))}
    </ul>
  )
}

function Fact({ label, children, icon }: { label: string; children: ReactNode; icon?: ReactNode }): React.ReactElement {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[16px] font-semibold tabular-nums leading-snug text-slate-900">{children}</div>
    </div>
  )
}

/** The client's logo on a white tile, or their initials on the accent colour. */
function ClientMark({ name, logo, size = 'md' }: { name: string; logo?: string; size?: 'sm' | 'md' }): React.ReactElement {
  const box = size === 'sm' ? 'h-8 min-w-8 px-1.5' : 'h-12 min-w-12 px-2'
  return logo ? (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-slate-900/[0.07]', box)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- logos are small, often SVG, and carry a ?v= version */}
      <img src={logo} alt={name} className={cn('w-auto max-w-[9rem] object-contain', size === 'sm' ? 'h-5' : 'h-8')} />
    </span>
  ) : (
    <span className={cn('flex shrink-0 items-center justify-center rounded-xl bg-[var(--offer-accent)] font-semibold text-white', box, size === 'sm' ? 'text-xs' : 'text-base')}>
      {name
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')}
    </span>
  )
}

// ─── The page ────────────────────────────────────────────────────────────────

export function OfferPage({ data, lang, base, supportEmail, track = false }: { data: PublicOffer; lang: Lang; base: string; supportEmail: string; track?: boolean }): React.ReactElement {
  const { offer, modules, definition, preview } = data
  const content: OfferContent | undefined = definition?.content
  const rtl = lang === 'he'
  const Forward = rtl ? ArrowLeft : ArrowRight
  const accent = content?.client.accent ?? DEFAULT_ACCENT
  const clientName = content ? t(content.client.name, lang) : offer.lead.company || [offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ') || offer.title
  // The logo uploaded in the studio wins; Claude's content.client.logo is the fallback
  const clientLogo = data.assets.logo ?? content?.client.logo
  const initial = offer.selectedModules.length ? normalizeSelection(modules, offer.selectedModules) : defaultSelection(modules)
  const screensCount = content?.flows.reduce((sum, f) => sum + f.steps.length, 0) ?? 0
  const copy: Record<string, ModuleCopy> = Object.fromEntries(
    modules.map((m) => {
      const c = content?.modules[m.id]
      return [m.id, { title: c ? t(c.title, lang) : m.name, summary: c ? t(c.summary, lang) : (m.summary ?? ''), bullets: c?.bullets?.map((b) => t(b, lang)) ?? [] }]
    }),
  )
  const editable = offer.status === 'LIVE' && !preview
  const otherLang: Lang = lang === 'he' ? 'en' : 'he'
  const date = monthYear(offer.publishedAt ?? offer.createdAt, lang)
  const domain = `${offer.slug}.app.igani.co`
  // The badge already says "Project offer": drop it from the eyebrow when Claude's copy starts with it too
  const eyebrow = content ? t(content.hero.eyebrow, lang).replace(new RegExp(`^\\s*${ui('offer', lang)}\\s*[·•|:-]?\\s*`), '') || clientName : clientName

  // Section numbers follow what this offer actually contains
  let counter = 0
  const num = (): number => ++counter
  const nav: [string, string][] = [
    ['#overview', ui('overview', lang)],
    ...(content?.flows.length ? ([['#screens', ui('screens', lang)]] as [string, string][]) : []),
    ...(modules.length ? ([['#modules', ui('modulesShort', lang)]] as [string, string][]) : []),
    ...(content?.phases.length ? ([['#phases', ui('phases', lang)]] as [string, string][]) : []),
    ['#sign', ui('sign', lang)],
  ]

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      lang={lang}
      className="offer-root relative min-h-screen overflow-x-clip bg-[#f7f8fa] text-slate-900 antialiased selection:bg-[color-mix(in_srgb,var(--offer-accent)_25%,white)]"
      style={{ '--offer-accent': accent } as CSSProperties}
    >
      {/* ambient glow + fine grid behind the hero */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[900px] bg-[radial-gradient(55%_45%_at_75%_0%,color-mix(in_srgb,var(--offer-accent)_16%,transparent),transparent_70%),radial-gradient(40%_35%_at_5%_15%,color-mix(in_srgb,var(--offer-accent)_9%,transparent),transparent_70%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[760px] opacity-50"
        style={{ backgroundImage: 'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)', backgroundSize: '56px 56px', maskImage: 'radial-gradient(70% 60% at 50% 0%, #000 30%, transparent 75%)' }}
      />

      {preview ? (
        <div className="relative z-50 flex items-center justify-center gap-2 bg-amber-50 px-4 py-2 text-center text-[13px] font-medium text-amber-900 ring-1 ring-amber-200">
          <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {ui('draft', lang)}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-slate-900/[0.06] bg-[#f7f8fa]/75 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo onLight height={22} />
          <span className="hidden h-5 w-px bg-slate-900/10 sm:block" />
          <span className="hidden min-w-0 items-center gap-2 sm:flex">
            <ClientMark name={clientName} logo={clientLogo} size="sm" />
            <span className="truncate text-sm font-medium text-slate-700">{clientName}</span>
          </span>
          <OfferNav items={nav} label={ui('overview', lang)} />
          <a
            href={offerHref(base, '', otherLang)}
            className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/10 transition hover:text-slate-900 lg:ms-2"
          >
            <Globe className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            {otherLang === 'he' ? 'עברית' : 'English'}
          </a>
        </div>
      </header>

      <OfferSelectionProvider slug={offer.slug} modules={modules} initial={initial} editable={editable} fixedMonthly={offer.monthlyPrice}>
        {track ? <OfferTracker slug={offer.slug} lang={lang} /> : null}
        <main className="relative mx-auto max-w-6xl space-y-28 px-4 pb-28 pt-12 sm:space-y-36 sm:px-6 sm:pt-20">
          {/* ── Hero ── */}
          <section id="overview" className="grid scroll-mt-28 items-start gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)]">
            <Reveal>
              <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full bg-white/80 py-1 pe-3 ps-1 text-[13px] font-medium text-slate-700 shadow-sm ring-1 ring-slate-900/[0.07] backdrop-blur">
                <span className="shrink-0 rounded-full bg-[var(--offer-accent)] px-2 py-0.5 text-[11px] font-semibold text-white">{ui('offer', lang)}</span>
                <span className="truncate">{eyebrow}</span>
              </div>
              <h1 className="text-balance text-[2.4rem] font-semibold leading-[1.07] tracking-[-0.035em] text-slate-950 sm:text-6xl">{content ? t(content.hero.title, lang) : offer.title}</h1>
              {content ? <p className="mt-6 max-w-2xl text-pretty text-lg leading-8 text-slate-600 sm:text-xl sm:leading-9">{t(content.hero.summary, lang)}</p> : null}
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#modules" className="group inline-flex items-center gap-2 rounded-full bg-[var(--offer-accent)] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_12px_30px_-12px_var(--offer-accent)] transition hover:brightness-110">
                  {ui('seeModules', lang)}
                  <Forward className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </a>
                <a href={`mailto:${supportEmail}?subject=${encodeURIComponent(offer.title)}`} className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-[15px] font-semibold text-slate-800 shadow-sm ring-1 ring-slate-900/10 transition hover:ring-slate-900/20">
                  <MessageCircle className="h-4 w-4 text-slate-400" aria-hidden />
                  {ui('talk', lang)}
                </a>
              </div>
              <dl className="mt-12 flex flex-wrap gap-x-8 gap-y-3 border-t border-slate-900/[0.07] pt-6 text-sm text-slate-600">
                {offer.timelineMonths ? (
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-[var(--offer-accent)]" aria-hidden />
                    <dt className="sr-only">{ui('timeline', lang)}</dt>
                    <dd>
                      <b className="font-semibold text-slate-900">{offer.timelineMonths}</b> {ui('months', lang)}
                    </dd>
                  </div>
                ) : null}
                {modules.length ? (
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-[var(--offer-accent)]" aria-hidden />
                    <dt className="sr-only">{ui('scope', lang)}</dt>
                    <dd>
                      <b className="font-semibold text-slate-900">{modules.length}</b> {ui('modulesCount', lang)}
                    </dd>
                  </div>
                ) : null}
                {screensCount ? (
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4 text-[var(--offer-accent)]" aria-hidden />
                    <dt className="sr-only">{ui('screens', lang)}</dt>
                    <dd>
                      <b className="font-semibold text-slate-900">{screensCount}</b> {ui('screensCount', lang)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </Reveal>

            <Reveal delay={120}>
              <aside className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-[0_40px_80px_-40px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/[0.06] sm:p-7">
                <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--offer-accent)] via-[color-mix(in_srgb,var(--offer-accent)_45%,white)] to-[var(--offer-accent)]" />
                <div className="flex items-center gap-3">
                  <ClientMark name={clientName} logo={clientLogo} />
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium text-slate-500">
                      {ui('preparedFor', lang)} · {date}
                    </div>
                    <div className="line-clamp-2 text-[17px] font-semibold leading-snug text-slate-900">{clientName}</div>
                  </div>
                </div>
                {modules.length ? (
                  <div className="relative mt-6 overflow-hidden rounded-2xl bg-slate-950 p-5 text-white">
                    <span aria-hidden className="absolute -end-10 -top-16 h-40 w-40 rounded-full bg-[var(--offer-accent)] opacity-40 blur-3xl" />
                    <div className="relative">
                      <div className="text-[12px] font-medium text-slate-400">{ui('yourPackage', lang)}</div>
                      <div className="mt-1.5 text-[2.25rem] font-semibold leading-none tracking-tight tabular-nums">
                        <SelectedTotal currency={offer.currency} />
                      </div>
                      <div className="mt-1.5 text-[12px] text-slate-400">{ui('oneTime', lang)}</div>
                      <PackageRecurring currency={offer.currency} labels={{ month: ui('monthly', lang), year: ui('yearly', lang), perMonth: ui('perMonth', lang), perYear: ui('perYear', lang) }} />
                    </div>
                  </div>
                ) : null}
                <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5">
                  {offer.timelineMonths ? (
                    <Fact label={ui('timeline', lang)} icon={<CalendarClock className="h-3.5 w-3.5" aria-hidden />}>
                      {offer.timelineMonths} {ui('months', lang)}
                    </Fact>
                  ) : null}
                  {modules.length || screensCount ? (
                    <Fact label={ui('scope', lang)} icon={<Layers className="h-3.5 w-3.5" aria-hidden />}>
                      {modules.length ? `${modules.length} ${ui('modulesCount', lang)}` : ''}
                      {modules.length && screensCount ? ' · ' : ''}
                      {screensCount ? `${screensCount} ${ui('screensCount', lang)}` : ''}
                    </Fact>
                  ) : null}
                  {content?.facts?.map((f, k) => (
                    <Fact key={k} label={t(f.label, lang)}>
                      {t(f.value, lang)}
                    </Fact>
                  ))}
                </div>
                <a href="#sign" className="group mt-7 flex items-center justify-between rounded-2xl bg-slate-900/[0.04] px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-900/[0.07]">
                  {ui('signButton', lang)}
                  <Forward className="h-4 w-4 text-[var(--offer-accent)] transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" aria-hidden />
                </a>
              </aside>
            </Reveal>
          </section>

          {/* ── Screens ── */}
          {content?.flows.length
            ? content.flows.map((flow, fi) => (
                <Section
                  key={flow.id}
                  id={fi === 0 ? 'screens' : `flow-${flow.id}`}
                  n={num()}
                  eyebrow={`${ui('screens', lang)} · ${flow.device === 'phone' ? ui('phone', lang) : ui('desktop', lang)}`}
                  title={t(flow.title, lang)}
                  intro={flow.caption ? t(flow.caption, lang) : undefined}
                >
                  <FlowPlayer
                    stacked={flow.device === 'desktop'}
                    rtl={rtl}
                    labels={{ step: ui('step', lang), of: ui('of', lang), next: ui('next', lang), prev: ui('prev', lang) }}
                    steps={flow.steps.map((s) => ({ title: t(s.title, lang), caption: t(s.caption, lang) }))}
                    slides={flow.steps.map((s, k) => {
                      const Screen = definition?.screens[s.screen]
                      return (
                        <div key={k} className="flex flex-col items-center gap-5">
                          <DeviceFrame device={flow.device} url={domain}>
                            {Screen ? <Screen lang={lang} /> : <div className="p-6 text-sm text-slate-400">{s.screen}</div>}
                          </DeviceFrame>
                          <div className="flex gap-2 text-[12px] font-medium">
                            <a href={offerHref(base, `/screen/${flow.id}?step=${k}&device=phone`, lang)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-900/10 transition hover:text-slate-900">
                              <Smartphone className="h-3.5 w-3.5" aria-hidden />
                              {ui('phone', lang)}
                            </a>
                            <a href={offerHref(base, `/screen/${flow.id}?step=${k}&device=desktop`, lang)} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-slate-600 ring-1 ring-slate-900/10 transition hover:text-slate-900">
                              <Monitor className="h-3.5 w-3.5" aria-hidden />
                              {ui('desktop', lang)}
                            </a>
                            <span className="inline-flex items-center gap-1 px-1 text-slate-400">
                              <Expand className="h-3 w-3" aria-hidden />
                              {ui('fullScreen', lang)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  />
                </Section>
              ))
            : null}

          {/* ── Need + system ── */}
          {content ? (
            <Section id="solution" n={num()} eyebrow={`${ui('need', lang)} · ${ui('system', lang)}`} title={t(content.solution.title, lang)}>
              <div className="grid gap-5 lg:grid-cols-2">
                <article className="rounded-[28px] bg-white p-7 ring-1 ring-slate-900/[0.06] sm:p-9">
                  <div className="text-[12px] font-semibold uppercase tracking-[0.16em] rtl:tracking-normal text-slate-400">{ui('need', lang)}</div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{t(content.need.title, lang)}</h3>
                  <p className="mt-4 whitespace-pre-line text-[16px] leading-8 text-slate-600">{t(content.need.body, lang)}</p>
                  <CheckList items={content.need.points} lang={lang} />
                </article>
                <article className="relative overflow-hidden rounded-[28px] bg-[color-mix(in_srgb,var(--offer-accent)_7%,white)] p-7 ring-1 ring-[color-mix(in_srgb,var(--offer-accent)_20%,transparent)] sm:p-9">
                  <span aria-hidden className="absolute -end-20 -top-20 h-60 w-60 rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_18%,transparent)] blur-3xl" />
                  <div className="relative">
                    <div className="text-[12px] font-semibold uppercase tracking-[0.16em] rtl:tracking-normal text-[var(--offer-accent)]">{ui('system', lang)}</div>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900">{t(content.solution.title, lang)}</h3>
                    <p className="mt-4 whitespace-pre-line text-[16px] leading-8 text-slate-700">{t(content.solution.body, lang)}</p>
                    <CheckList items={content.solution.points} lang={lang} tone="accent" />
                  </div>
                </article>
              </div>
            </Section>
          ) : null}

          {/* ── Architecture ── */}
          {content?.architecture ? (
            <Section id="architecture" n={num()} eyebrow={ui('howItConnects', lang)} title={t(content.architecture.title, lang)} intro={content.architecture.intro ? t(content.architecture.intro, lang) : undefined}>
              <div className="rounded-[28px] bg-white p-3 ring-1 ring-slate-900/[0.06] sm:p-5">
                {content.architecture.layers.map((layer, k) => (
                  <div key={k}>
                    {k > 0 ? (
                      <div className="flex justify-center py-1 text-slate-300" aria-hidden>
                        <ArrowDown className="h-4 w-4" />
                      </div>
                    ) : null}
                    <div className="grid gap-3 rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-900/[0.04] sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[12px] font-semibold tabular-nums text-slate-500 ring-1 ring-slate-900/[0.07]">{k + 1}</span>
                        <span className="text-sm font-semibold text-slate-700">{t(layer.name, lang)}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {layer.items.map((it, j) =>
                          it.moduleId ? (
                            <a key={j} href={`#module-${it.moduleId}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-[color-mix(in_srgb,var(--offer-accent)_30%,transparent)] transition hover:ring-[var(--offer-accent)]">
                              <span className="h-1.5 w-1.5 rounded-full bg-[var(--offer-accent)]" />
                              {t(it.label, lang)}
                            </a>
                          ) : (
                            <span key={j} className="inline-flex items-center rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-600 ring-1 ring-slate-900/[0.06]">
                              {t(it.label, lang)}
                            </span>
                          ),
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* ── Gallery ── */}
          {content?.gallery?.length ? (
            <Section id="gallery" n={num()} eyebrow={ui('gallery', lang)} title={clientName}>
              <div className="grid auto-rows-[220px] gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {content.gallery.map((g, k) => (
                  <figure key={k} className={cn('group relative overflow-hidden rounded-[24px] bg-slate-100 ring-1 ring-slate-900/[0.06]', k === 0 && 'sm:row-span-2')}>
                    <Image src={g.src} alt={t(g.caption, lang)} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                    <figcaption className="absolute inset-x-3 bottom-3 rounded-xl bg-white/85 px-3 py-2 text-sm font-medium text-slate-800 backdrop-blur">{t(g.caption, lang)}</figcaption>
                  </figure>
                ))}
              </div>
            </Section>
          ) : null}

          {/* ── Modules ── */}
          {modules.length ? (
            <Section id="modules" n={num()} eyebrow={ui('modules', lang)} title={ui('seeModules', lang)}>
              <ModulePicker modules={modules} copy={copy} currency={offer.currency} lang={lang} />
            </Section>
          ) : null}

          {/* ── Phases ── */}
          {content?.phases.length ? (
            <Section id="phases" n={num()} eyebrow={ui('timeline', lang)} title={`${ui('phases', lang)}${offer.timelineMonths ? ` · ${offer.timelineMonths} ${ui('months', lang)}` : ''}`}>
              <ol className={cn('grid gap-4', PHASE_COLS[content.phases.length] ?? 'md:grid-cols-3')}>
                {content.phases.map((p, k) => (
                  <li key={k} className="relative rounded-[24px] bg-white p-6 ring-1 ring-slate-900/[0.06]">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--offer-accent)] text-sm font-semibold text-white shadow-[0_0_0_5px_color-mix(in_srgb,var(--offer-accent)_14%,transparent)]">{k + 1}</span>
                      <span className="rounded-full bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] px-2.5 py-1 text-[12px] font-semibold text-[var(--offer-accent)]">{t(p.when, lang)}</span>
                    </div>
                    <div className="mt-5 text-lg font-semibold tracking-tight text-slate-900">{t(p.title, lang)}</div>
                    <p className="mt-2 text-[15px] leading-7 text-slate-600">{t(p.body, lang)}</p>
                  </li>
                ))}
              </ol>
            </Section>
          ) : null}

          {/* ── Decisions ── */}
          {content?.decisions?.length ? (
            <Section id="decisions" n={num()} eyebrow={ui('decisions', lang)} title={ui('decisions', lang)}>
              <div className="grid gap-3 md:grid-cols-2">
                {content.decisions.map((d, k) => (
                  <div key={k} className="flex flex-col rounded-[22px] bg-white p-5 ring-1 ring-slate-900/[0.06]">
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-[15px] font-semibold leading-6 text-slate-900">{t(d.question, lang)}</span>
                      <span className="shrink-0 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200/70">
                        {ui('due', lang)} {t(d.due, lang)}
                      </span>
                    </div>
                    <div className="mt-3 text-sm text-slate-500">
                      {ui('impact', lang)}: <span className="font-medium text-slate-700">{t(d.impact, lang)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {/* ── Next step, about us, sign ── */}
          <section id="sign" className="grid scroll-mt-28 items-start gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <Reveal className="space-y-5">
              <Eyebrow n={num()}>{ui('nextSteps', lang)}</Eyebrow>
              {content ? (
                <>
                  <h2 className="text-balance text-3xl font-semibold leading-[1.15] tracking-[-0.02em] text-slate-900 sm:text-[2.6rem]">{t(content.nextSteps.title, lang)}</h2>
                  <p className="text-lg leading-8 text-slate-600">{t(content.nextSteps.body, lang)}</p>
                  <CheckList items={content.nextSteps.points} lang={lang} tone="accent" />
                </>
              ) : null}
              {content?.about ? (
                <div className="mt-8 rounded-[24px] bg-white p-6 ring-1 ring-slate-900/[0.06]">
                  <div className="flex items-center gap-3">
                    <Logo onLight height={22} />
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em] rtl:tracking-normal text-slate-400">{ui('about', lang)}</span>
                  </div>
                  <p className="mt-3 text-[15px] leading-7 text-slate-600">{t(content.about.body, lang)}</p>
                  <CheckList items={content.about.points} lang={lang} />
                </div>
              ) : null}
            </Reveal>
            <Reveal delay={100}>
              <SignPanel
                slug={offer.slug}
                lang={lang}
                currency={offer.currency}
                modules={modules}
                moduleTitles={Object.fromEntries(Object.entries(copy).map(([k, v]) => [k, v.title]))}
                contractUrl={offer.contractApprovedAt || offer.contractPublicId ? `/api/public/offers/${offer.slug}/contract` : null}
                defaultPhone={offer.lead.phone ?? ''}
                defaultName={[offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ')}
                defaultEmail={offer.lead.email ?? ''}
                signed={offer.signedAt && offer.signerName ? { name: offer.signerName, at: offer.signedAt.toISOString() } : null}
                preview={preview}
              />
            </Reveal>
          </section>
        </main>
      </OfferSelectionProvider>

      <footer className="relative border-t border-slate-900/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 text-sm text-slate-500 sm:flex-row sm:px-6">
          <div className="flex items-center gap-3">
            <Logo onLight height={20} />
            <span className="h-4 w-px bg-slate-900/10" />
            <span>
              {ui('preparedBy', lang)} · {clientName}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span>{date}</span>
            <a href={`mailto:${supportEmail}`} className="font-medium text-slate-700 hover:text-slate-900">
              {supportEmail}
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
