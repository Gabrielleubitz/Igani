/**
 * Pure helpers for offer pricing (no Prisma, no server-only), shared by the admin editor, the public page and the signing API.
 * Admins enter the modules and prices; the client only chooses which optional modules they want.
 */

export const MODULE_GROUPS = ['core', 'main', 'addons'] as const
export type ModuleGroup = (typeof MODULE_GROUPS)[number]

export const GROUP_LABEL: Record<ModuleGroup, { en: string; he: string }> = {
  core: { en: 'Core (required)', he: 'ליבה (חובה)' },
  main: { en: 'Main modules', he: 'מודולים עיקריים' },
  addons: { en: 'Add-ons', he: 'תוספות' },
}

/** How a module is billed: once at setup, or as a recurring payment. */
export const BILLING_PERIODS = ['once', 'month', 'year'] as const
export type BillingPeriod = (typeof BILLING_PERIODS)[number]
export const PERIOD_LABEL: Record<BillingPeriod, { en: string; he: string; short: { en: string; he: string } }> = {
  once: { en: 'One-time', he: 'חד-פעמי', short: { en: '', he: '' } },
  month: { en: 'Monthly', he: 'חודשי', short: { en: '/ month', he: 'לחודש' } },
  year: { en: 'Yearly', he: 'שנתי', short: { en: '/ year', he: 'לשנה' } },
}

export interface OfferModuleItem {
  /** Stable key, also used by the written content (offers/<slug>/content.tsx → modules[id]) */
  id: string
  group: ModuleGroup
  name: string
  /** Price in whole currency units, per `period` */
  price: number
  /** once = setup price (default); month / year = recurring payment */
  period?: BillingPeriod
  /** Always part of the deal; the client can't remove it */
  required: boolean
  /** Pre-selected in the recommended package (the client can still remove it) */
  included: boolean
  /** Optional one-line description (e.g. from the call transcript); the offer page uses it when Claude's copy has none */
  summary?: string
}

const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/
/** Names that would clash with real hosts or app routes. */
const RESERVED = new Set(['www', 'app', 'api', 'admin', 'mail', 'crm', 'o', 'studio', 'static', 'assets', 'login'])

/** Why a slug can't be used, or null. Slugs become the subdomain (honey.app.igani.co) and the folder offers/honey/. */
export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return 'Use 1–40 lowercase letters, numbers and dashes (no dash at the start or end).'
  if (RESERVED.has(slug)) return `"${slug}" is reserved. Pick another name.`
  return null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
}

const isGroup = (v: unknown): v is ModuleGroup => (MODULE_GROUPS as readonly unknown[]).includes(v)

/** Reads the stored JSON defensively: bad rows are dropped, prices are whole and non-negative, ids are unique. */
export function parseModules(json: unknown): OfferModuleItem[] {
  if (!Array.isArray(json)) return []
  const seen = new Set<string>()
  const out: OfferModuleItem[] = []
  for (const raw of json) {
    if (!raw || typeof raw !== 'object') continue
    const r = raw as Record<string, unknown>
    const id = typeof r.id === 'string' ? r.id.trim() : ''
    const name = typeof r.name === 'string' ? r.name.trim() : ''
    const price = typeof r.price === 'number' && Number.isFinite(r.price) ? Math.max(0, Math.round(r.price)) : NaN
    if (!id || !name || Number.isNaN(price) || seen.has(id)) continue
    seen.add(id)
    const group = isGroup(r.group) ? r.group : 'main'
    const required = group === 'core' ? true : r.required === true
    const summary = typeof r.summary === 'string' && r.summary.trim() ? r.summary.trim().slice(0, 500) : undefined
    const period = r.period === 'month' || r.period === 'year' ? r.period : undefined
    out.push({ id, group, name, price, required, included: required || r.included === true, ...(period ? { period } : {}), ...(summary ? { summary } : {}) })
  }
  return out
}

/** The client's choice, cleaned: unknown ids dropped, required modules always in. Order follows the module list. */
export function normalizeSelection(modules: OfferModuleItem[], ids: readonly string[] | null | undefined): string[] {
  const chosen = new Set(ids ?? [])
  return modules.filter((m) => m.required || chosen.has(m.id)).map((m) => m.id)
}

/** What a client sees before choosing anything: required + recommended modules. */
export function defaultSelection(modules: OfferModuleItem[]): string[] {
  return modules.filter((m) => m.required || m.included).map((m) => m.id)
}

export const periodOf = (m: OfferModuleItem): BillingPeriod => m.period ?? 'once'

/** One-time (setup) total of a selection. Recurring modules are not in it: see recurringTotals. */
export function selectionTotal(modules: OfferModuleItem[], ids: readonly string[]): number {
  const chosen = new Set(normalizeSelection(modules, ids))
  return modules.filter((m) => chosen.has(m.id) && periodOf(m) === 'once').reduce((sum, m) => sum + m.price, 0)
}

/** Recurring payments of a selection, plus the offer's fixed monthly fee (if any). */
export function recurringTotals(modules: OfferModuleItem[], ids: readonly string[], fixedMonthly: number | null = null): { month: number; year: number } {
  const chosen = new Set(normalizeSelection(modules, ids))
  const sum = (p: BillingPeriod): number => modules.filter((m) => chosen.has(m.id) && periodOf(m) === p).reduce((s, m) => s + m.price, 0)
  return { month: sum('month') + (fixedMonthly ?? 0), year: sum('year') }
}

/** "₪250 / month", "₪3,000 / year" or "₪20,000". */
export function formatModulePrice(m: OfferModuleItem, currency: string, lang: 'en' | 'he' = 'en'): string {
  const unit = PERIOD_LABEL[periodOf(m)].short[lang]
  return unit ? `${formatPrice(m.price, currency)} ${unit}` : formatPrice(m.price, currency)
}

export function groupTotal(modules: OfferModuleItem[], group: ModuleGroup): number {
  return modules.filter((m) => m.group === group && periodOf(m) === 'once').reduce((sum, m) => sum + m.price, 0)
}

/** One-time total if every module were chosen. */
export function allModulesTotal(modules: OfferModuleItem[]): number {
  return modules.filter((m) => periodOf(m) === 'once').reduce((sum, m) => sum + m.price, 0)
}

const SYMBOL: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€', GBP: '£' }

export function formatPrice(amount: number, currency = 'ILS'): string {
  const n = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount)
  const sym = SYMBOL[currency]
  return sym ? `${sym}${n}` : `${n} ${currency}`
}
