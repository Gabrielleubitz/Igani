import 'server-only'
import { readSnapshot, signerSnapshot } from './signatures'
import { createHash } from 'node:crypto'
import type { Offer } from '@prisma/client'
import { parseContractDoc, type ContractDoc, type ContractLang } from './contract'
import { contractHtml, publicFileDataUrl, type ContractRenderInput } from './contract-html'
import { PERIOD_LABEL, defaultSelection, formatModulePrice, formatPrice, normalizeSelection, parseModules, periodOf, recurringTotals, selectionTotal } from './offer-modules'
import { liveOfferUrl, loadAssets, loadDefinition } from './offers'
import type { TranscriptModules } from './offer-transcript-ai'

type Lead = { firstName: string | null; lastName: string | null; email: string | null; phone: string | null; company: string | null }
export type OfferWithLead = Offer & { lead: Lead }

/** Built contract that can be signed (drafted and approved), or null when the offer uses an uploaded PDF / has none. */
export function approvedContract(o: Offer): ContractDoc | null {
  return o.contractApprovedAt ? parseContractDoc(o.contractDoc) : null
}

export function contractLang(o: Offer, fallback: ContractLang = 'he'): ContractLang {
  return o.contractLang === 'en' || o.contractLang === 'he' ? o.contractLang : fallback
}

/** Fingerprint of exactly the text that was approved and signed. */
export function contractSha256(doc: ContractDoc): string {
  return createHash('sha256').update(JSON.stringify(doc)).digest('hex')
}

export interface SigningDetails {
  name: string
  title: string | null
  email: string
  phone: string | null
  signaturePng: string
  signedAt: Date
  ip: string
}

/** Everything the template needs, for a given module selection (and the client's signature once signed). */
export async function contractRenderInput(o: OfferWithLead, doc: ContractDoc, opts: { selected?: string[]; signing?: SigningDetails; status: ContractRenderInput['status'] }): Promise<ContractRenderInput> {
  const def = await loadDefinition(o.slug)
  const lang = contractLang(o, def?.content.defaultLang ?? 'he')
  const modules = parseModules(o.modules)
  const selected = normalizeSelection(modules, opts.selected ?? (o.selectedModules.length ? o.selectedModules : defaultSelection(modules)))
  const rec = recurringTotals(modules, selected, o.monthlyPrice)
  // who signed for Igani: the copy kept when it was approved, or (a draft) the default signature
  const signer = readSnapshot(o.contractSigner) ?? (await signerSnapshot()) ?? { name: '', title: '', email: '', phone: '', image: '' }
  const signature = signer.image
  const content = def?.content
  const clientCompany = o.lead.company || (content ? (lang === 'he' ? content.client.name.he : content.client.name.en) || null : null)
  const unit = (p: 'month' | 'year'): string => (lang === 'he' ? PERIOD_LABEL[p].short.he : PERIOD_LABEL[p].short.en)
  return {
    lang,
    doc,
    accent: content?.client.accent ?? '#2563eb',
    iganiLogo: publicFileDataUrl('/igani-logo 2.png'),
    clientLogo: publicFileDataUrl(loadAssets(o.slug).logo ?? content?.client.logo),
    igani: { name: signer.name || 'Igani', company: 'Igani', title: signer.title || null, email: signer.email || null, phone: signer.phone || null, signaturePng: opts.status === 'draft' ? null : signature || null, signedAt: o.contractApprovedAt },
    client: opts.signing
      ? { name: opts.signing.name, company: clientCompany, title: opts.signing.title, email: opts.signing.email, phone: opts.signing.phone, signaturePng: opts.signing.signaturePng, signedAt: opts.signing.signedAt }
      : { name: [o.lead.firstName, o.lead.lastName].filter(Boolean).join(' '), company: clientCompany, title: null, email: null, phone: null, signaturePng: null, signedAt: null },
    fees: modules
      .filter((m) => selected.includes(m.id))
      .map((m) => {
        const c = content?.modules[m.id]
        return { name: (c ? (lang === 'he' ? c.title.he : c.title.en) : '') || m.name, price: formatModulePrice(m, o.currency, lang), billing: PERIOD_LABEL[periodOf(m)][lang] }
      }),
    totals: {
      oneTime: formatPrice(selectionTotal(modules, selected), o.currency),
      monthly: rec.month ? `${formatPrice(rec.month, o.currency)} ${unit('month')}` : null,
      yearly: rec.year ? `${formatPrice(rec.year, o.currency)} ${unit('year')}` : null,
    },
    offerUrl: liveOfferUrl(o.slug),
    reference: `${o.slug.toUpperCase()}-${(o.contractApprovedAt ?? o.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}`,
    date: opts.signing?.signedAt ?? o.contractApprovedAt ?? new Date(),
    record: opts.signing ? { ip: opts.signing.ip, contractSha256: contractSha256(doc), signerEmail: opts.signing.email } : undefined,
    status: opts.status,
  }
}

export async function renderContract(o: OfferWithLead, doc: ContractDoc, opts: Parameters<typeof contractRenderInput>[2]): Promise<string> {
  return contractHtml(await contractRenderInput(o, doc, opts))
}

/** Initials for the PDF footer: "DL" from "Dana Levi". */
export const initials = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 3)
    .join('')

/** What the AI drafts from: the offer, its modules (names only, no prices), scope notes and the call analysis. */
export async function contractFacts(o: OfferWithLead, lang: ContractLang): Promise<object> {
  const def = await loadDefinition(o.slug)
  const c = def?.content
  const pick = (l: { he: string; en: string } | undefined): string => (l ? (lang === 'he' ? l.he || l.en : l.en || l.he) : '')
  const modules = parseModules(o.modules)
  const brief = (o.brief ?? null) as TranscriptModules | null
  return {
    client: { company: o.lead.company, contact: [o.lead.firstName, o.lead.lastName].filter(Boolean).join(' ') },
    offerTitle: o.title,
    summary: c ? pick(c.hero.summary) : undefined,
    need: c ? pick(c.need.body) : undefined,
    solution: c ? pick(c.solution.body) : undefined,
    modules: modules.map((m) => ({ id: m.id, name: (c?.modules[m.id] && pick(c.modules[m.id]!.title)) || m.name, summary: (c?.modules[m.id] && pick(c.modules[m.id]!.summary)) || m.summary, billing: periodOf(m), required: m.required, inRecommendedPackage: m.included })),
    timelineMonths: o.timelineMonths,
    phases: c?.phases.map((p) => ({ when: pick(p.when), title: pick(p.title), body: pick(p.body) })),
    openDecisions: c?.decisions?.map((d) => pick(d.question)),
    outOfScopeFromCall: brief?.excluded,
    hasRecurringFees: modules.some((m) => periodOf(m) !== 'once') || !!o.monthlyPrice,
  }
}
