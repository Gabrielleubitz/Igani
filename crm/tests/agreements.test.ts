import { describe, expect, it } from 'vitest'
import { MAX_AGREEMENT_BYTES, agreementUploadProblem, canOpenAgreement, formatSize, safeFileName } from '../lib/agreements'

describe('agreement rules', () => {
  it('accepts PDFs, Word, images and text up to the size limit', () => {
    expect(agreementUploadProblem({ name: 'a.pdf', type: 'application/pdf', size: 1000 })).toBeNull()
    expect(agreementUploadProblem({ name: 'a.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: MAX_AGREEMENT_BYTES })).toBeNull()
  })
  it('refuses empty, oversized and unsupported files', () => {
    expect(agreementUploadProblem({ name: 'a.pdf', type: 'application/pdf', size: 0 })).toMatch(/empty/)
    expect(agreementUploadProblem({ name: 'a.pdf', type: 'application/pdf', size: MAX_AGREEMENT_BYTES + 1 })).toMatch(/too big/)
    expect(agreementUploadProblem({ name: 'a.exe', type: 'application/x-msdownload', size: 10 })).toMatch(/Upload a PDF/)
    expect(agreementUploadProblem({ name: 'a.html', type: 'text/html', size: 10 })).toMatch(/Upload a PDF/)
  })
  it('admins open anything; a salesperson only their own', () => {
    expect(canOpenAgreement({ id: 'a', role: 'ADMIN' }, { userId: 'x' })).toBe(true)
    expect(canOpenAgreement({ id: 'x', role: 'SALES' }, { userId: 'x' })).toBe(true)
    expect(canOpenAgreement({ id: 'y', role: 'SALES' }, { userId: 'x' })).toBe(false)
    expect(canOpenAgreement({ id: 'm', role: 'MARKETING' }, { userId: 'x' })).toBe(false)
  })
  it('makes names safe and sizes readable', () => {
    expect(safeFileName('../../etc/pass"wd.pdf')).not.toMatch(/[\\/"]/)
    expect(safeFileName('')).toBe('agreement')
    expect(formatSize(500)).toBe('1 KB')
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5 MB')
  })
})
