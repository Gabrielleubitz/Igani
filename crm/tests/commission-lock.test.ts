import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
const state: { signed: Date | null; pending: Date | null } = { signed: null, pending: null }
vi.mock('@/lib/prisma', () => ({
  prisma: { agreementAcceptance: { findFirst: async () => (state.signed ? { signedAt: state.signed } : null) } },
}))
vi.mock('@/lib/sales-contract', () => ({ pendingLinkFor: async () => (state.pending ? { expiresAt: state.pending } : null) }))

import { lockedMessage, termsLockedBy } from '@/lib/commission-lock'

describe('commission terms lock', () => {
  beforeEach(() => ((state.signed = null), (state.pending = null)))
  it('is open while there is no agreement at all', async () => {
    expect(await termsLockedBy('a@b.co')).toBeNull()
    expect(await termsLockedBy(null)).toBeNull()
  })
  it('locks as soon as a contract is created and waiting for signature', async () => {
    state.pending = new Date('2026-11-09T10:00:00Z')
    expect(await termsLockedBy('a@b.co')).toMatchObject({ kind: 'pending' })
    expect(lockedMessage({ kind: 'pending', at: state.pending })).toContain('waiting for signature')
  })
  it('stays locked once it is signed, and signed wins over a newer pending one', async () => {
    state.signed = new Date('2026-11-08T10:00:00Z')
    expect(await termsLockedBy('a@b.co')).toMatchObject({ kind: 'signed' })
    state.pending = new Date('2026-11-09T10:00:00Z')
    expect(await termsLockedBy('a@b.co')).toMatchObject({ kind: 'signed' })
    expect(lockedMessage({ kind: 'signed', at: state.signed })).toContain('signed')
  })
})
