import { AccentButton, Avatar, Icon, Picture, Pill, cx, surface, type IconName, type Tone } from './base'

/* Website / landing-page sections. Each fills the width it is given (a desktop frame, or a phone frame stacked). */

// ─── Navigation ──────────────────────────────────────────────────────────────

export interface SiteHeaderProps {
  brand: string
  logo?: string
  links: string[]
  cta?: string
  tone?: Tone
}
/** Top bar: brand, links, one call to action. Links collapse to a menu icon on narrow frames. */
export function SiteHeader({ brand, logo, links, cta, tone = 'light' }: SiteHeaderProps): React.ReactElement {
  const s = surface(tone)
  return (
    <header className={cx('flex items-center gap-4 border-b px-5 py-3', s.bg, s.border)}>
      {logo ? <Picture src={logo} alt={brand} className="h-7 w-24 [&_img]:object-contain" /> : <span className={cx('text-lg font-bold', s.text)}>{brand}</span>}
      <nav className="ms-auto hidden items-center gap-5 text-sm md:flex">
        {links.map((l) => (
          <span key={l} className={s.muted}>
            {l}
          </span>
        ))}
      </nav>
      {cta ? <AccentButton className="ms-auto px-4 py-2 md:ms-0">{cta}</AccentButton> : null}
    </header>
  )
}

export interface SiteFooterProps {
  brand: string
  tagline?: string
  columns: { title: string; links: string[] }[]
  legal?: string
  tone?: Tone
}
export function SiteFooter({ brand, tagline, columns, legal, tone = 'dark' }: SiteFooterProps): React.ReactElement {
  const s = surface(tone)
  return (
    <footer className={cx('px-6 py-10', s.bg)}>
      <div className="grid gap-8 sm:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <div className={cx('text-lg font-bold', s.text)}>{brand}</div>
          {tagline ? <p className={cx('mt-2 max-w-xs text-sm', s.muted)}>{tagline}</p> : null}
        </div>
        {columns.map((c) => (
          <div key={c.title}>
            <div className={cx('mb-2 text-sm font-semibold', s.text)}>{c.title}</div>
            <ul className={cx('space-y-1.5 text-sm', s.muted)}>
              {c.links.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {legal ? <div className={cx('mt-8 border-t pt-4 text-xs', s.border, s.muted)}>{legal}</div> : null}
    </footer>
  )
}

// ─── Heroes ──────────────────────────────────────────────────────────────────

export interface HeroCenteredProps {
  badge?: string
  title: string
  /** Part of the title shown in the accent colour (must be the end of `title`) */
  highlight?: string
  subtitle: string
  primaryCta: string
  secondaryCta?: string
  /** Optional preview under the text: an image path */
  preview?: string
}
/** Centred hero on a soft accent gradient with a faint grid (from the Caleno landing page). */
export function HeroCentered({ badge, title, highlight, subtitle, primaryCta, secondaryCta, preview }: HeroCenteredProps): React.ReactElement {
  const rest = highlight && title.endsWith(highlight) ? title.slice(0, -highlight.length) : title
  return (
    <section className="relative overflow-hidden px-6 py-14 sm:py-20">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#fff_0%,color-mix(in_srgb,var(--offer-accent)_6%,white)_45%,color-mix(in_srgb,var(--offer-accent)_18%,white)_100%)]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)', backgroundSize: '40px 40px', maskImage: 'radial-gradient(100% 70% at 50% 30%, #000, rgba(0,0,0,0.05))' }}
      />
      <div className="relative mx-auto max-w-3xl text-center">
        {badge ? (
          <div className="mb-5 flex justify-center">
            <span className="rounded-full border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]/70 px-3 py-1 text-xs text-slate-500 shadow-sm">{badge}</span>
          </div>
        ) : null}
        <h1 className="text-balance text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">
          {rest}
          {highlight && rest !== title ? <span className="text-[var(--offer-accent)]">{highlight}</span> : null}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-500 sm:text-lg">{subtitle}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <span className="inline-flex min-w-[160px] items-center justify-center rounded-full bg-slate-900 px-6 py-3.5 text-sm font-medium text-white">{primaryCta}</span>
          {secondaryCta ? <span className="inline-flex min-w-[160px] items-center justify-center rounded-full border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]/80 px-6 py-3.5 text-sm font-medium text-slate-900">{secondaryCta}</span> : null}
        </div>
      </div>
      {preview ? <Picture src={preview} className="relative mx-auto mt-10 aspect-[16/9] max-w-4xl rounded-2xl border border-slate-200 shadow-xl" sizes="900px" /> : null}
    </section>
  )
}

export interface HeroSplitProps {
  eyebrow?: string
  title: string
  subtitle: string
  primaryCta: string
  secondaryCta?: string
  image?: string
  /** Small proof line under the buttons, e.g. "4.9 ★ from 300+ clients" */
  proof?: string
  tone?: Tone
}
/** Text on one side, a large image on the other. Stacks on phones. */
export function HeroSplit({ eyebrow, title, subtitle, primaryCta, secondaryCta, image, proof, tone = 'light' }: HeroSplitProps): React.ReactElement {
  const s = surface(tone)
  return (
    <section className={cx('grid items-center gap-8 px-6 py-12 md:grid-cols-2', s.bg)}>
      <div>
        {eyebrow ? <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--offer-accent)]">{eyebrow}</div> : null}
        <h1 className={cx('text-4xl font-semibold leading-tight tracking-tight', s.text)}>{title}</h1>
        <p className={cx('mt-4 text-lg leading-8', s.muted)}>{subtitle}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <AccentButton>{primaryCta}</AccentButton>
          {secondaryCta ? <AccentButton variant="outline">{secondaryCta}</AccentButton> : null}
        </div>
        {proof ? <div className={cx('mt-5 text-sm', s.muted)}>{proof}</div> : null}
      </div>
      <Picture src={image} className="aspect-[4/3] w-full rounded-3xl" sizes="600px" />
    </section>
  )
}

// ─── Content sections ────────────────────────────────────────────────────────

export interface SectionIntro {
  title: string
  subtitle?: string
}
function Intro({ title, subtitle, tone = 'light' }: SectionIntro & { tone?: Tone }): React.ReactElement {
  const s = surface(tone)
  return (
    <>
      <h2 className={cx('text-center text-2xl font-semibold tracking-tight md:text-3xl', s.text)}>{title}</h2>
      {subtitle ? <p className={cx('mx-auto mt-3 max-w-2xl text-center text-base md:text-lg', s.muted)}>{subtitle}</p> : null}
    </>
  )
}

export interface FeatureGridProps extends SectionIntro {
  features: { icon: IconName; title: string; description: string }[]
}
/** Icon cards in a 1/2/3-column grid inside a soft card (from the Caleno landing page). */
export function FeatureGrid({ title, subtitle, features }: FeatureGridProps): React.ReactElement {
  return (
    <section className="px-4 py-12">
      <div className="rounded-3xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 shadow-sm md:p-10">
        <Intro title={title} subtitle={subtitle} />
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <article key={f.title} className="rounded-2xl border border-slate-200 bg-slate-50/60 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] text-[var(--offer-accent)]">
                <Icon name={f.icon} className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-start text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-start leading-relaxed text-slate-500">{f.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export interface StepsProps extends SectionIntro {
  steps: { title: string; description: string }[]
}
/** Numbered "how it works" steps, side by side on wide frames (from the Caleno landing page). */
export function Steps({ title, subtitle, steps }: StepsProps): React.ReactElement {
  return (
    <section className="px-4 py-12">
      <div className="rounded-3xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-6 shadow-sm md:p-10">
        <Intro title={title} subtitle={subtitle} />
        <div className="mt-10 flex flex-col gap-6 md:flex-row">
          {steps.map((st, i) => (
            <div key={st.title} className="flex flex-1 flex-col items-center rounded-2xl border border-slate-200 bg-slate-50/60 p-6 text-center md:items-start md:text-start">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[var(--offer-accent)] bg-white text-lg font-semibold text-[var(--offer-accent)]">{i + 1}</div>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">{st.title}</h3>
              <p className="mt-2 leading-relaxed text-slate-500">{st.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export interface StatsBandProps {
  stats: { value: string; label: string }[]
  tone?: Tone
}
export function StatsBand({ stats, tone = 'dark' }: StatsBandProps): React.ReactElement {
  const s = surface(tone)
  return (
    <section className={cx('grid grid-cols-2 gap-6 px-6 py-10 md:grid-cols-4', s.bg)}>
      {stats.map((x) => (
        <div key={x.label} className="text-center">
          <div className={cx('text-3xl font-bold tabular-nums', tone === 'dark' ? 'text-white' : 'text-[var(--offer-accent)]')}>{x.value}</div>
          <div className={cx('mt-1 text-sm', s.muted)}>{x.label}</div>
        </div>
      ))}
    </section>
  )
}

export interface TestimonialsProps extends SectionIntro {
  items: { quote: string; name: string; role?: string; avatar?: string; rating?: number }[]
}
export function Testimonials({ title, subtitle, items }: TestimonialsProps): React.ReactElement {
  return (
    <section className="bg-slate-50 px-6 py-12">
      <Intro title={title} subtitle={subtitle} />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <figure key={t.name} className="rounded-2xl bg-white p-5 shadow-sm shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]">
            {t.rating ? <div className="mb-2 text-amber-400">{'★'.repeat(Math.round(t.rating))}</div> : null}
            <blockquote className="leading-relaxed text-slate-700">“{t.quote}”</blockquote>
            <figcaption className="mt-4 flex items-center gap-3">
              <Avatar name={t.name} src={t.avatar} size={36} />
              <span>
                <span className="block text-sm font-semibold text-slate-900">{t.name}</span>
                {t.role ? <span className="block text-xs text-slate-500">{t.role}</span> : null}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export interface PricingTiersProps extends SectionIntro {
  tiers: { name: string; price: string; period?: string; features: string[]; cta: string; featured?: boolean; badge?: string }[]
}
/** The client's own pricing (packages, memberships), not Igani's offer pricing. */
export function PricingTiers({ title, subtitle, tiers }: PricingTiersProps): React.ReactElement {
  return (
    <section className="px-6 py-12">
      <Intro title={title} subtitle={subtitle} />
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {tiers.map((t) => (
          <div key={t.name} className={cx('flex flex-col rounded-3xl p-6', t.featured ? 'bg-slate-900 text-white shadow-xl' : 'bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] ring-1 ring-slate-900/[0.07]')}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t.name}</span>
              {t.badge ? <Pill>{t.badge}</Pill> : null}
            </div>
            <div className="mt-4 text-4xl font-bold tabular-nums">
              {t.price}
              {t.period ? <span className={cx('ms-1 text-sm font-normal', t.featured ? 'text-slate-300' : 'text-slate-500')}>{t.period}</span> : null}
            </div>
            <ul className={cx('mt-5 flex-1 space-y-2 text-sm', t.featured ? 'text-slate-200' : 'text-slate-600')}>
              {t.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--offer-accent)]" />
                  {f}
                </li>
              ))}
            </ul>
            <AccentButton className="mt-6 w-full">{t.cta}</AccentButton>
          </div>
        ))}
      </div>
    </section>
  )
}

export interface FaqProps extends SectionIntro {
  items: { q: string; a: string }[]
}
/** Native disclosure rows (open/close works without JavaScript). */
export function Faq({ title, subtitle, items }: FaqProps): React.ReactElement {
  return (
    <section className="mx-auto max-w-3xl px-6 py-12">
      <Intro title={title} subtitle={subtitle} />
      <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        {items.map((it, i) => (
          <details key={it.q} className="group px-5 py-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-slate-900">
              {it.q}
              <span className="text-slate-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 leading-relaxed text-slate-600">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

export interface GalleryBentoProps extends SectionIntro {
  images: { src?: string; caption: string }[]
}
/** First image large, the rest in a grid around it. */
export function GalleryBento({ title, subtitle, images }: GalleryBentoProps): React.ReactElement {
  return (
    <section className="px-6 py-12">
      <Intro title={title} subtitle={subtitle} />
      <div className="mt-8 grid auto-rows-[160px] grid-cols-2 gap-3 md:grid-cols-4">
        {images.map((im, i) => (
          <figure key={i} className={cx('group relative overflow-hidden rounded-2xl', i === 0 && 'col-span-2 row-span-2')}>
            <Picture src={im.src} alt={im.caption} className="absolute inset-0" sizes="500px" />
            <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm text-white">{im.caption}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}

export interface LogoMarqueeProps {
  label?: string
  names: string[]
}
/** "Trusted by" strip: names scroll slowly (CSS only). */
export function LogoMarquee({ label, names }: LogoMarqueeProps): React.ReactElement {
  const row = [...names, ...names]
  return (
    <section className="overflow-hidden border-y border-slate-200 bg-white py-6">
      {label ? <div className="mb-4 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{label}</div> : null}
      <div className="flex w-max animate-[offer-marquee_30s_linear_infinite] gap-12 px-6">
        {row.map((n, i) => (
          <span key={i} className="whitespace-nowrap text-lg font-semibold text-slate-400">
            {n}
          </span>
        ))}
      </div>
      <style>{'@keyframes offer-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}'}</style>
    </section>
  )
}

export interface CtaBandProps {
  title: string
  subtitle?: string
  cta: string
  secondary?: string
}
export function CtaBand({ title, subtitle, cta, secondary }: CtaBandProps): React.ReactElement {
  return (
    <section className="px-4 py-10">
      <div className="rounded-3xl bg-[var(--offer-accent)] px-6 py-10 text-center text-white">
        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
        {subtitle ? <p className="mx-auto mt-3 max-w-xl text-white/80">{subtitle}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <span className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900">{cta}</span>
          {secondary ? <span className="rounded-xl border border-white/40 px-5 py-3 text-sm font-semibold text-white">{secondary}</span> : null}
        </div>
      </div>
    </section>
  )
}

export interface ContactSectionProps extends SectionIntro {
  details: { icon: IconName; label: string; value: string }[]
  fields: string[]
  submit: string
}
/** Contact details next to a (static) form. */
export function ContactSection({ title, subtitle, details, fields, submit }: ContactSectionProps): React.ReactElement {
  return (
    <section className="grid gap-8 px-6 py-12 md:grid-cols-2">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">{title}</h2>
        {subtitle ? <p className="mt-3 text-slate-500">{subtitle}</p> : null}
        <ul className="mt-6 space-y-4">
          {details.map((d) => (
            <li key={d.label} className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--offer-accent)_10%,white)] text-[var(--offer-accent)]">
                <Icon name={d.icon} className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-xs text-slate-500">{d.label}</span>
                <span className="block font-medium text-slate-900">{d.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-900/[0.07] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
        {fields.map((f) => (
          <div key={f}>
            <div className="mb-1 text-sm font-medium text-slate-700">{f}</div>
            <div className="h-10 rounded-lg border border-slate-200 bg-slate-50" />
          </div>
        ))}
        <AccentButton className="w-full">{submit}</AccentButton>
      </div>
    </section>
  )
}
