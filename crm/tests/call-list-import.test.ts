import { describe, expect, it } from 'vitest'
import { IMPORT_MAX_ROWS, ImportFileError, prepareImport } from '@/lib/call-list-import'

describe('prepareImport', () => {
  it('finds the columns, writes numbers as E.164 and tidies the website', () => {
    const r = prepareImport('Name,Phone,Company,Website\nDana Levi,050-123-4567,Acme,acme.co.il\nYoni,+972 52 765 4321,Bluebird,\n')
    expect(r.rows).toEqual([
      { line: 2, name: 'Dana Levi', phone: '+972501234567', website: 'https://acme.co.il/' },
      { line: 3, name: 'Yoni', phone: '+972527654321', website: null },
    ])
    expect(r.columns).toEqual({ phone: 'Phone', name: 'Name', company: 'Company', website: 'Website' })
    expect(r.total).toBe(2)
  })
  it('understands Hebrew headers', () => {
    const r = prepareImport('שם,טלפון,חברה\nדנה,0501234567,אקמי')
    expect(r.rows[0]).toMatchObject({ name: 'דנה', phone: '+972501234567' })
  })
  it('uses the company as the name when there is no name, and “Unnamed” when there is neither', () => {
    const r = prepareImport('phone,company\n0501234567,Acme\n0527654321,')
    expect(r.rows.map((x) => x.name)).toEqual(['Acme', 'Unnamed'])
  })
  it('rejects rows without a usable number, with the line and why', () => {
    const r = prepareImport('name,phone\nA,\nB,hello\nC,1-900-555-1234\nD,050-123-4567')
    expect(r.rows.map((x) => x.name)).toEqual(['D'])
    expect(r.rejected.map((x) => x.line)).toEqual([2, 3, 4])
    expect(r.rejected[0]!.reason).toMatch(/no phone/i)
  })
  it('keeps the first of a number that appears twice, however it is written', () => {
    const r = prepareImport('name,phone\nA,050-123-4567\nB,+972501234567\nC,0501234567')
    expect(r.rows.map((x) => x.name)).toEqual(['A'])
    expect(r.duplicatesInFile).toBe(2)
  })
  it('refuses files it cannot use', () => {
    expect(() => prepareImport('name\nDana')).toThrow(ImportFileError)
    expect(() => prepareImport('name,phone')).toThrow(/at least one person/)
    expect(() => prepareImport(`phone\n${Array.from({ length: IMPORT_MAX_ROWS + 1 }, () => '0501234567').join('\n')}`)).toThrow(/Too many rows/)
  })
})
