import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({ env: () => ({ NEXT_PUBLIC_APP_URL: 'https://app.igani.co' }) }))
const rows = new Map<string, { value: unknown; updatedAt: Date }>()
const termUpdates: { where: unknown; data: { commissionTerms: unknown } }[] = []
vi.mock('@/lib/prisma', () => ({
  prisma: {
    agreementAcceptance: { create: async ({ data }: { data: Record<string, unknown> }) => ({ id: 'acc1', ...data }) },
    allowedUser: { updateMany: async (args: { where: unknown; data: { commissionTerms: unknown } }) => (termUpdates.push(args), { count: 1 }) },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
    siteSetting: {
      create: async ({ data }: { data: { key: string; value: unknown } }) => (rows.has(data.key) ? Promise.reject(new Error('dup')) : void rows.set(data.key, { value: data.value, updatedAt: new Date() })),
      findUnique: async ({ where }: { where: { key: string } }) => (rows.has(where.key) ? { key: where.key, ...rows.get(where.key)! } : null),
      findMany: async ({ where }: { where: { key: { startsWith: string } } }) => [...rows].filter(([k]) => k.startsWith(where.key.startsWith)).map(([key, v]) => ({ key, value: v.value })),
      deleteMany: async ({ where }: { where: { key: string | { startsWith?: string; in?: string[] }; updatedAt?: { lt: Date } } }) => {
        let n = 0
        for (const [k, v] of [...rows]) {
          const hit =
            typeof where.key === 'string'
              ? k === where.key
              : where.key.in
                ? where.key.in.includes(k)
                : k.startsWith(where.key.startsWith ?? '') && (!where.updatedAt || v.updatedAt < where.updatedAt.lt)
          if (hit) (rows.delete(k), n++)
        }
        return { count: n }
      },
    },
  },
}))

import { claimLink, createContractLink, listPendingLinks, pendingLinkFor, readContractLink, restoreLink, saveAcceptance } from '@/lib/sales-contract'
import { DEFAULT_FIGURES, type LegalTerms } from '@/lib/sales-contract-core'

const TERMS: LegalTerms = { companyLegalName: 'Test Person', companyTradingAs: 'Test Brand', companyIdNumber: '123456789', companyAddress: '1 Test Street, Test City', agentAddress: '2 Rep Street, Rep City', payoutDays: 10, clawbackDays: 60, noticeDays: 30, jurisdiction: 'Test Jurisdiction' }
const data = { name: 'Ariel Tzadok', email: 'a@b.co', effectiveDate: '2026-11-05', figures: DEFAULT_FIGURES, terms: TERMS }
const admin = { name: 'Ilan', email: 'i@igani.co', signature: 'data:image/png;base64,iVBORw0KGgo=' }

describe('stored signing link', () => {
  beforeEach(() => rows.clear())
  it('makes a short link, reads it, lets only one signer claim it, and can restore it', async () => {
    const { url } = await createContractLink(data, admin)
    expect(url).toMatch(/^https:\/\/app\.igani\.co\/sign\/[A-Za-z0-9_-]{12}$/)
    const code = url.split('/').pop()!
    const r = await readContractLink(code)
    expect(r).toMatchObject({ ok: true, payload: { id: code, data: { name: 'Ariel Tzadok' } } })
    expect(await claimLink(code)).toBe(true)
    expect(await claimLink(code)).toBe(false)
    expect(await readContractLink(code)).toMatchObject({ ok: false, reason: 'invalid' })
    if (r.ok) await restoreLink(r.payload)
    expect(await readContractLink(code)).toMatchObject({ ok: true })
  })
  it('refuses and deletes an expired link, and purges old rows when a new one is made', async () => {
    const old = new Date(Date.now() - 20 * 3_600_000)
    const { url } = await createContractLink(data, admin, old)
    const code = url.split('/').pop()!
    expect(await readContractLink(code)).toMatchObject({ ok: false, reason: 'expired' })
    expect(rows.size).toBe(0)
    await createContractLink(data, admin, old)
    rows.forEach((v) => (v.updatedAt = old))
    await createContractLink(data, admin)
    expect(rows.size).toBe(1)
  })
  it('rejects malformed codes without touching the database', async () => {
    expect(await readContractLink('../../x')).toMatchObject({ ok: false, reason: 'invalid' })
  })
})

describe('one open contract per person', () => {
  beforeEach(() => rows.clear())
  it('keeps every other person’s link when a new contract is sent', async () => {
    const a = await createContractLink({ ...data, name: 'Ariel', email: 'ariel@x.co' }, admin)
    const b = await createContractLink({ ...data, name: 'Bella', email: 'bella@x.co' }, admin)
    expect((await listPendingLinks()).map((l) => l.email).sort()).toEqual(['ariel@x.co', 'bella@x.co'])
    // a second contract to Ariel replaces only Ariel's earlier one
    const a2 = await createContractLink({ ...data, name: 'Ariel', email: 'Ariel@X.co' }, admin)
    const links = await listPendingLinks()
    expect(links).toHaveLength(2)
    expect(await readContractLink(a.url.split('/').pop()!)).toMatchObject({ ok: false })
    expect(await readContractLink(b.url.split('/').pop()!)).toMatchObject({ ok: true })
    expect(await readContractLink(a2.url.split('/').pop()!)).toMatchObject({ ok: true })
  })
  it('finds a person’s open link by email, ignoring case', async () => {
    expect(await pendingLinkFor('nobody@x.co')).toBeNull()
    const { url } = await createContractLink({ ...data, email: 'ariel@x.co' }, admin)
    expect((await pendingLinkFor('ARIEL@x.co'))?.url).toBe(url)
  })
})

describe('signing locks in the commission terms from the contract', () => {
  it('writes the signed figures as the salesperson’s terms', async () => {
    termUpdates.length = 0
    const payload = { id: 'abc123abc123', exp: 0, data: { ...data, email: 'Ariel@X.co', figures: { threshold: 20_000, basePercent: 25, bonus: 1_500, increment: 4_000 } }, admin }
    const id = await saveAcceptance({ payload: { ...payload, admin: { ...admin, signedAt: '2026-11-05T10:00:00Z' } }, signerName: 'Ariel Tzadok', business: { name: 'Ariel Ltd', number: '515123456' }, signature: admin.signature, signedAt: new Date('2026-11-05T12:00:00Z'), ip: '1.2.3.4', userAgent: 'test' }, { pdf: new Uint8Array([1]), hash: 'h' })
    expect(id).toBe('acc1')
    expect(termUpdates).toHaveLength(1)
    expect(termUpdates[0]).toMatchObject({ where: { email: { equals: 'ariel@x.co' } }, data: { commissionTerms: { baseRatePct: 25, threshold: 20_000, incrementSize: 4_000, bonusPerIncrement: 1_500 } } })
  })
})
