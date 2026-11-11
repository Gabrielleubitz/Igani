import 'server-only'
import { openaiFetch } from './ai-usage'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { zipSync, strToU8 } from 'fflate'
import type { Offer } from '@prisma/client'
import type { OfferContent } from '@/offers/types'
import { formatModulePrice, formatPrice, normalizeSelection, parseModules, periodOf, recurringTotals, selectionTotal, type OfferModuleItem } from './offer-modules'
import { liveOfferUrl, loadDefinition } from './offers'
import type { TranscriptModules } from './offer-transcript-ai'

/**
 * "Export UI": the agreed offer as a ready Next.js + Tailwind project, so building the real product can start on a
 * desktop with the exact screens the client saw. The mockup screens and blocks are copied as-is (UI only); BUILD.md
 * explains every module, feature and backend piece that has to be built behind them.
 */

const ROOT = process.cwd()

function walk(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
}

type Lead = { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; company: string | null; website: string | null }

export async function buildOfferExport(offer: Offer & { lead: Lead }, opts: { ai: boolean }): Promise<{ zip: Uint8Array; fileName: string }> {
  const definition = await loadDefinition(offer.slug)
  if (!definition) throw new Error(`This deployment has no content for "${offer.slug}" yet. Push it from the studio first.`)
  const content = definition.content
  const modules = parseModules(offer.modules)
  const chosen = normalizeSelection(modules, offer.selectedModules.length ? offer.selectedModules : modules.filter((m) => m.required || m.included).map((m) => m.id))
  const brief = (offer.brief ?? null) as TranscriptModules | null
  const dir = `${offer.slug}-ui`
  const files: Record<string, Uint8Array> = {}
  const put = (path: string, text: string): void => {
    files[`${dir}/${path}`] = strToU8(text)
  }
  const copy = (abs: string, as: string): void => {
    files[`${dir}/${as}`] = new Uint8Array(readFileSync(abs))
  }

  // The agreed UI, unchanged
  copy(join(ROOT, 'offers', 'types.ts'), 'offers/types.ts')
  for (const f of walk(join(ROOT, 'offers', 'blocks'))) copy(f, `offers/blocks/${relative(join(ROOT, 'offers', 'blocks'), f)}`)
  for (const f of walk(join(ROOT, 'offers', offer.slug)).filter((f) => !f.endsWith('offer-data.json'))) copy(f, `offers/${offer.slug}/${relative(join(ROOT, 'offers', offer.slug), f)}`)
  for (const f of walk(join(ROOT, 'public', 'offers', offer.slug))) copy(f, `public/offers/${offer.slug}/${relative(join(ROOT, 'public', 'offers', offer.slug), f)}`)

  // A small app that shows every screen, so `npm run dev` opens the design straight away
  put('package.json', JSON.stringify({ name: `${offer.slug}-app`, private: true, scripts: { dev: 'next dev', build: 'next build', start: 'next start' }, dependencies: { next: '14.2.35', react: '18.3.1', 'react-dom': '18.3.1', 'lucide-react': '0.460.0' }, devDependencies: { typescript: '5.6.3', '@types/react': '18.3.12', '@types/node': '20.17.6', tailwindcss: '3.4.15', postcss: '8.4.49', autoprefixer: '10.4.20' } }, null, 2) + '\n')
  put('next.config.mjs', `/** @type {import('next').NextConfig} */\nexport default { reactStrictMode: true }\n`)
  put('postcss.config.mjs', `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }\n`)
  put('tailwind.config.ts', `import type { Config } from 'tailwindcss'\n\nexport default { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './offers/**/*.{ts,tsx}'], theme: { extend: {} }, plugins: [] } satisfies Config\n`)
  put('tsconfig.json', JSON.stringify({ compilerOptions: { target: 'ES2020', lib: ['dom', 'dom.iterable', 'esnext'], strict: true, noEmit: true, esModuleInterop: true, module: 'esnext', moduleResolution: 'bundler', resolveJsonModule: true, isolatedModules: true, jsx: 'preserve', incremental: true, plugins: [{ name: 'next' }], paths: { '@/*': ['./*'] }, skipLibCheck: true }, include: ['next-env.d.ts', '**/*.ts', '**/*.tsx'], exclude: ['node_modules'] }, null, 2) + '\n')
  put('.gitignore', 'node_modules\n.next\n.env*\n')
  put('app/globals.css', `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root { --offer-accent: ${content.client.accent ?? '#2563eb'}; }\nbody { background: #eef1f6; color: #0f172a; }\n`)
  put('app/layout.tsx', LAYOUT(content, offer))
  put('app/page.tsx', INDEX_PAGE(offer.slug))
  put('app/flow/[id]/page.tsx', FLOW_PAGE(offer.slug))
  put('components/DeviceFrame.tsx', DEVICE_FRAME)
  put('offer.config.json', JSON.stringify({ slug: offer.slug, title: offer.title, currency: offer.currency, monthlyPrice: offer.monthlyPrice, timelineMonths: offer.timelineMonths, signedAt: offer.signedAt, signedTotal: offer.signedTotal, modules: modules.map((m) => ({ ...m, chosen: chosen.includes(m.id) })) }, null, 2) + '\n')

  // The docs
  const facts = buildFacts(offer, content, modules, chosen, brief)
  const plan = opts.ai ? await implementationPlan(facts).catch((err) => `> The AI implementation plan could not be generated (${err instanceof Error ? err.message : 'error'}). Export again to retry.\n`) : null
  put('BUILD.md', buildMarkdown(offer, content, modules, chosen, brief, plan))
  put('CLAUDE.md', CLAUDE_MD(offer.slug))
  put('README.md', `# ${offer.title}\n\nThe UI the client agreed to, exported from the Igani CRM.\n\n\`\`\`bash\nnpm install\nnpm run dev   # http://localhost:3000 shows every screen\n\`\`\`\n\nRead **BUILD.md** for everything that has to be built behind these screens.\n`)

  return { zip: zipSync(files, { level: 6 }), fileName: `${dir}.zip` }
}

// ─── BUILD.md ────────────────────────────────────────────────────────────────

const en = (l: { en: string; he: string } | undefined): string => (l ? l.en || l.he : '')

function buildFacts(offer: Offer & { lead: Lead }, content: OfferContent, modules: OfferModuleItem[], chosen: string[], brief: TranscriptModules | null): string {
  const mod = (m: OfferModuleItem): object => ({ id: m.id, name: m.name, group: m.group, summary: m.summary ?? en(content.modules[m.id]?.summary), bullets: content.modules[m.id]?.bullets?.map(en) ?? [] })
  return JSON.stringify({
    client: { company: offer.lead.company, website: offer.lead.website, summary: brief?.clientSummary },
    offer: { title: offer.title, timelineMonths: offer.timelineMonths, monthlyFee: !!offer.monthlyPrice, recurringModules: modules.filter((m) => chosen.includes(m.id) && periodOf(m) !== 'once').map((m) => ({ id: m.id, period: periodOf(m) })) },
    need: en(content.need.body),
    solution: en(content.solution.body),
    agreedModules: modules.filter((m) => chosen.includes(m.id)).map(mod),
    notChosen: modules.filter((m) => !chosen.includes(m.id)).map(mod),
    architecture: content.architecture?.layers.map((l) => ({ layer: en(l.name), items: l.items.map((i) => en(i.label)) })),
    screens: content.flows.map((f) => ({ flow: f.id, device: f.device, title: en(f.title), steps: f.steps.map((s) => ({ screen: s.screen, title: en(s.title), caption: en(s.caption) })) })),
    phases: content.phases.map((p) => ({ when: en(p.when), title: en(p.title), body: en(p.body) })),
    decisions: content.decisions?.map((d) => ({ question: en(d.question), affects: en(d.impact), due: en(d.due) })),
    leftOutOnTheCall: brief?.excluded,
    openQuestionsFromTheCall: brief?.openQuestions,
  })
}

function buildMarkdown(offer: Offer & { lead: Lead }, content: OfferContent, modules: OfferModuleItem[], chosen: string[], brief: TranscriptModules | null, plan: string | null): string {
  const money = (n: number): string => formatPrice(n, offer.currency)
  const total = selectionTotal(modules, chosen)
  const rec = recurringTotals(modules, chosen, offer.monthlyPrice)
  const recText = [rec.month ? `${money(rec.month)}/month` : '', rec.year ? `${money(rec.year)}/year` : ''].filter(Boolean).join(' + ')
  const lines: string[] = []
  const h = (s: string): void => void lines.push('', s, '')
  lines.push(`# ${offer.title}`, '', `Client: **${offer.lead.company || [offer.lead.firstName, offer.lead.lastName].filter(Boolean).join(' ')}**${offer.lead.website ? ` (${offer.lead.website})` : ''}  `, `Offer: ${liveOfferUrl(offer.slug)}  `)
  lines.push(offer.signedAt ? `Signed: ${offer.signedAt.toISOString().slice(0, 10)} by ${offer.signerName} · ${money(offer.signedTotal ?? total)} one-time${recText ? ` + ${recText}` : ''}` : `Status: ${offer.status.toLowerCase()} (not signed yet) · package ${money(total)}${recText ? ` + ${recText}` : ''}`)
  if (offer.timelineMonths) lines.push(`Timeline: ${offer.timelineMonths} months`)
  lines.push('', '> The screens in `offers/' + offer.slug + '/` are the agreed design. Build the real product behind them without changing how they look. Blocks in `offers/blocks/` are shared UI pieces.')

  h('## What the client needs')
  lines.push(en(content.need.body))
  for (const p of content.need.points ?? []) lines.push(`- ${en(p)}`)
  if (brief?.clientSummary) lines.push('', `From the call: ${brief.clientSummary}`)
  h('## What we are building')
  lines.push(en(content.solution.body))
  for (const p of content.solution.points ?? []) lines.push(`- ${en(p)}`)

  h('## Agreed modules')
  lines.push('| Module | Group | Price | What it covers |', '|---|---|---|---|')
  for (const m of modules.filter((x) => chosen.includes(x.id))) lines.push(`| **${m.name}** \`${m.id}\` | ${m.group} | ${formatModulePrice(m, offer.currency)} | ${(m.summary ?? en(content.modules[m.id]?.summary)).replace(/\|/g, '/')} |`)
  const recurringMods = modules.filter((x) => chosen.includes(x.id) && periodOf(x) !== 'once')
  if (recurringMods.length || offer.monthlyPrice) {
    lines.push('', '**Recurring payments** (billing has to support these):')
    for (const m of recurringMods) lines.push(`- ${m.name}: ${formatModulePrice(m, offer.currency)}`)
    if (offer.monthlyPrice) lines.push(`- Fixed monthly fee: ${money(offer.monthlyPrice)} / month`)
  }
  for (const m of modules.filter((x) => chosen.includes(x.id))) {
    const c = content.modules[m.id]
    if (!c?.bullets?.length) continue
    lines.push('', `**${m.name}**`)
    for (const b of c.bullets) lines.push(`- ${en(b)}`)
  }
  const later = modules.filter((m) => !chosen.includes(m.id))
  if (later.length) {
    h('## Offered but not chosen (do not build now)')
    for (const m of later) lines.push(`- ${m.name} \`${m.id}\`: ${m.summary ?? en(content.modules[m.id]?.summary)}`)
  }

  h('## Screens (the agreed UI)')
  lines.push('Run `npm run dev` and open http://localhost:3000 to see them in phone and desktop frames.', '')
  for (const f of content.flows) {
    lines.push(`### ${en(f.title)} (${f.device}) · \`/flow/${f.id}\``)
    f.steps.forEach((s, i) => lines.push(`${i + 1}. **${en(s.title)}** (\`screens.${s.screen}\`): ${en(s.caption)}`))
    lines.push('')
  }

  if (content.architecture) {
    h('## How it fits together')
    for (const l of content.architecture.layers) lines.push(`- **${en(l.name)}**: ${l.items.map((i) => en(i.label) + (i.moduleId ? ` (\`${i.moduleId}\`)` : '')).join(', ')}`)
  }
  if (content.phases.length) {
    h('## Phases')
    for (const p of content.phases) lines.push(`- **${en(p.when)} · ${en(p.title)}**: ${en(p.body)}`)
  }
  const questions = [...(content.decisions ?? []).map((d) => `${en(d.question)} (affects ${en(d.impact)}, by ${en(d.due)})`), ...(brief?.openQuestions ?? [])]
  if (questions.length) {
    h('## Open decisions')
    for (const q of questions) lines.push(`- [ ] ${q}`)
  }
  if (brief?.excluded?.length) {
    h('## Out of scope (from the call)')
    for (const x of brief.excluded) lines.push(`- **${x.topic}**: ${x.reason}`)
  }
  if (plan) {
    h('## Implementation plan')
    lines.push('_Drafted by AI from the agreed scope. Check it against the decisions above before building._', '', plan.trim())
  }
  return lines.join('\n') + '\n'
}

const PLAN_PROMPT = `You are the lead engineer at Igani, a software studio. A client signed an offer. From the JSON facts, write the implementation
plan a developer (working with Claude Code) will build from. Markdown only, starting at heading level 3 (###). Sections:
### Stack - default: Next.js App Router + TypeScript + Tailwind (the UI already exists in this stack), Postgres + Prisma, auth, hosting on Vercel;
    name the payment/messaging providers the facts mention. Justify briefly, no alternatives list.
### Data model - entities with key fields and relations (a compact list per entity).
### Modules - one #### per AGREED module: goal; features (bullets); the screens it powers (use the screen ids given); backend: API routes /
    server actions, background jobs, webhooks; integrations; admin tools; acceptance criteria (checkboxes).
### Cross-cutting - auth and roles, security, i18n/RTL if Hebrew, notifications, audit, payments compliance, data migration if mentioned.
### Build order - milestones that follow the phases.
Rules: only agreed modules (never build "notChosen" or anything in leftOutOnTheCall); respect open decisions by flagging them where they
block work; no prices; be concrete and specific to this client; no filler; no em dashes.`

async function implementationPlan(facts: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  const model = process.env.OPENAI_OFFER_MODEL || 'gpt-5.5'
  const reasoning = /^(gpt-5|o\d)/.test(model)
  const res = await openaiFetch('offer', 'https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, ...(reasoning ? { reasoning_effort: 'medium' } : { temperature: 0.2 }), messages: [{ role: 'system', content: PLAN_PROMPT }, { role: 'user', content: facts }] }),
    signal: AbortSignal.timeout(240_000),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = body.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('empty answer')
  return text
}

// ─── Generated app files ─────────────────────────────────────────────────────

const LAYOUT = (content: OfferContent, offer: Offer): string => `import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

export const metadata: Metadata = { title: ${JSON.stringify(offer.title)} }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="${content.defaultLang}" dir="${content.defaultLang === 'he' ? 'rtl' : 'ltr'}">
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  )
}
`

const INDEX_PAGE = (slug: string): string => `import Link from 'next/link'
import offer from '@/offers/${slug}/content'

/** Every flow of the agreed UI. */
export default function Home() {
  const { content } = offer
  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-3xl font-semibold">{content.hero.title.en || content.hero.title.he}</h1>
      <p className="text-slate-600">{content.hero.summary.en || content.hero.summary.he}</p>
      <ul className="space-y-3">
        {content.flows.map((f) => (
          <li key={f.id} className="rounded-xl bg-white p-4 shadow-sm">
            <Link href={\`/flow/\${f.id}\`} className="font-semibold text-[var(--offer-accent)]">{f.title.en || f.title.he}</Link>
            <span className="ms-2 text-sm text-slate-500">{f.device} · {f.steps.length} screens</span>
            <div className="mt-1 flex gap-3 text-sm">
              <Link href={\`/flow/\${f.id}?lang=he\`}>עברית</Link>
              <Link href={\`/flow/\${f.id}?lang=en\`}>English</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
`

const FLOW_PAGE = (slug: string): string => `import { notFound } from 'next/navigation'
import { DeviceFrame } from '@/components/DeviceFrame'
import offer from '@/offers/${slug}/content'
import type { Lang } from '@/offers/types'

/** One flow: every screen side by side in its device frame. These are the agreed designs - build the real app behind them. */
export default function Flow({ params, searchParams }: { params: { id: string }; searchParams: { lang?: string } }) {
  const flow = offer.content.flows.find((f) => f.id === params.id)
  if (!flow) notFound()
  const lang: Lang = searchParams.lang === 'en' || searchParams.lang === 'he' ? searchParams.lang : offer.content.defaultLang
  return (
    <main className="space-y-6 p-8" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <h1 className="text-2xl font-semibold">{flow.title[lang]}</h1>
      <div className={flow.device === 'phone' ? 'flex flex-wrap gap-8' : 'space-y-10'}>
        {flow.steps.map((s, i) => {
          const Screen = offer.screens[s.screen]
          return (
            <figure key={i} className={flow.device === 'phone' ? 'w-[300px]' : 'max-w-6xl'}>
              <DeviceFrame device={flow.device}>{Screen ? <Screen lang={lang} /> : null}</DeviceFrame>
              <figcaption className="mt-3 text-sm"><b>{i + 1}. {s.title[lang]}</b> <code className="text-xs text-slate-500">screens.{s.screen}</code><br />{s.caption[lang]}</figcaption>
            </figure>
          )
        })}
      </div>
    </main>
  )
}
`

const DEVICE_FRAME = `import type { ReactNode } from 'react'

/** Phone or desktop frame around a mockup screen (same frame the client saw in the offer). */
export function DeviceFrame({ device, children }: { device: 'phone' | 'desktop'; children: ReactNode }) {
  if (device === 'desktop') {
    return (
      <div className="w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
        <div className="flex items-center gap-1.5 border-b border-slate-200 bg-slate-100 px-3 py-2" dir="ltr">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" /><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="relative aspect-[16/10] w-full overflow-y-auto bg-white">{children}</div>
      </div>
    )
  }
  return (
    <div className="mx-auto w-[300px] rounded-[44px] bg-slate-900 p-3 shadow-2xl">
      <div className="relative overflow-hidden rounded-[34px] bg-white">
        <div className="h-7" />
        <div className="h-[560px] overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
`

const CLAUDE_MD = (slug: string): string => `# Building this project

This repo starts from the UI a client signed off on in an Igani offer.

- \`offers/${slug}/\` holds the agreed screens (content.tsx + screens.tsx). **The look is agreed**: keep layouts, copy and styling;
  turn them into real, working pages and components.
- \`offers/blocks/\` are shared UI pieces those screens use (display-only). Reuse them; don't fork them per page.
- **BUILD.md** lists every agreed module, feature, backend piece, open decision and what is out of scope. Build only agreed modules.
- Hebrew screens are right-to-left. Keep logical spacing (ms/me/ps/pe/start/end).
- Ask before deciding anything listed under "Open decisions".
`
