import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/env', () => ({ env: () => ({ NEXT_PUBLIC_APP_URL: 'https://app.igani.co' }) }))
const rows = new Map<string, { value: unknown; updatedAt: Date }>()
vi.mock('@/lib/prisma', () => ({
  prisma: {
    siteSetting: {
      create: async ({ data }: { data: { key: string; value: unknown } }) => (rows.has(data.key) ? Promise.reject(new Error('dup')) : void rows.set(data.key, { value: data.value, updatedAt: new Date() })),
      findUnique: async ({ where }: { where: { key: string } }) => (rows.has(where.key) ? { key: where.key, ...rows.get(where.key)! } : null),
      deleteMany: async ({ where }: { where: { key: string | { startsWith: string }; updatedAt?: { lt: Date } } }) => {
        let n = 0
        for (const [k, v] of [...rows]) {
          const hit = typeof where.key === 'string' ? k === where.key : k.startsWith(where.key.startsWith) && (!where.updatedAt || v.updatedAt < where.updatedAt.lt)
          if (hit) (rows.delete(k), n++)
        }
        return { count: n }
      },
    },
  },
}))

import { claimLink, createContractLink, readContractLink, restoreLink } from '@/lib/sales-contract'
import { DEFAULT_FIGURES, type LegalTerms } from '@/lib/sales-contract-core'

const TERMS: LegalTerms = { companyLegalName: 'Test Co Ltd.', companyAddress: '1 Test Street, Test City', agentAddress: '2 Rep Street, Rep City', payoutDays: 10, clawbackDays: 60, noticeDays: 30, jurisdiction: 'Test Jurisdiction' }
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
