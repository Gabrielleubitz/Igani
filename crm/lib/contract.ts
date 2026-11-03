/**
 * Contracts built in the CRM: the text (drafted with AI from Igani's standard terms + the offer, edited by an admin).
 * Prices never live in the text: the fees schedule is generated from the offer's modules at render time.
 */

export interface ContractSection {
  heading: string
  /** Each clause is one paragraph, numbered automatically (1.1, 1.2 ...) */
  clauses: string[]
}

export interface ContractDoc {
  title: string
  subtitle?: string
  /** Opening paragraph under the parties */
  intro: string
  sections: ContractSection[]
}

export type ContractLang = 'he' | 'en'

export function parseContractDoc(json: unknown): ContractDoc | null {
  if (!json || typeof json !== 'object') return null
  const r = json as Record<string, unknown>
  const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const sections = Array.isArray(r.sections)
    ? r.sections
        .map((x) => {
          const s = (x ?? {}) as Record<string, unknown>
          return { heading: str(s.heading, 200), clauses: Array.isArray(s.clauses) ? s.clauses.map((c) => str(c, 4000)).filter(Boolean).slice(0, 40) : [] }
        })
        .filter((s) => s.heading || s.clauses.length)
        .slice(0, 40)
    : []
  const title = str(r.title, 200)
  if (!title || !sections.length) return null
  return { title, subtitle: str(r.subtitle, 300) || undefined, intro: str(r.intro, 4000), sections }
}

/**
 * Igani's standard positions (from the signed contract template, contractV1). The AI adapts these to each offer;
 * it must keep the legal substance (ownership on full payment, confidentiality, liability cap, Israeli law).
 */
export const IGANI_STANDARD_TERMS = `Igani standard terms (keep the substance; adapt wording and details to the offer):
1. Parties: Igani (the developer/provider) and the client. Effective on signature.
2. Scope: the work is the modules agreed in Schedule A (fees schedule) and described in the offer at the offer link.
   Anything not in Schedule A is out of scope; changes are agreed in writing (email is enough) and may change price/timeline.
3. Fees and payment: one-time fees per Schedule A. A down-payment invoice is issued after signing; work starts when it is paid.
   The balance is invoiced per the milestones/phases. Recurring fees (monthly/yearly) in Schedule A start at launch and
   continue until cancelled with 30 days' written notice. Amounts exclude VAT where applicable. Late payment may pause work.
4. Timeline: the estimated timeline and phases from the offer; it depends on the client providing content, access,
   feedback and decisions on time. Delays on the client's side move the timeline.
5. Client responsibilities: provide content, brand assets, accounts/access to third-party services, timely feedback, and
   one point of contact. Third-party costs (e.g. app stores, SMS/WhatsApp, payment providers, hosting) are paid by the client
   unless Schedule A says otherwise.
6. Pre-existing materials: Igani keeps all rights to its pre-existing tools, code and components. The client gets a
   perpetual, worldwide, royalty-free licence to them as embedded in the deliverables.
7. Ownership: upon full payment, Igani assigns to the client all rights in the deliverables made specifically for the
   client (excluding pre-existing materials). Until full payment, Igani owns them.
8. Confidentiality: each party keeps the other's confidential information confidential and uses it only for this agreement.
9. Warranties and liability: services are performed professionally; otherwise provided "as is". No liability for indirect
   or consequential damages. Each party's total liability is capped at the amounts paid under this agreement.
10. Term and termination: from signature until delivery (and for recurring services until cancelled). Either party may end it
   for material breach not cured within 14 days of written notice; work done until then is paid.
11. Law: governed by the laws of Israel; exclusive venue the competent courts of Tel Aviv-Yafo.
12. Entire agreement; electronic signature: this agreement, Schedule A and the offer are the whole agreement. Signing
   electronically is binding.`
