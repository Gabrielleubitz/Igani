import { describe, expect, it } from 'vitest'
import { parseCsv } from '@/lib/csv-parse'

describe('parseCsv', () => {
  it('reads plain rows, CRLF and a final line without a newline', () => {
    expect(parseCsv('a,b\r\n1,2\r\n3,4')).toEqual([['a', 'b'], ['1', '2'], ['3', '4']])
  })
  it('handles quotes, commas and line breaks inside quotes, and doubled quotes', () => {
    expect(parseCsv('name,note\n"Levi, Dana","said ""hi""\nthen left"\n')).toEqual([['name', 'note'], ['Levi, Dana', 'said "hi"\nthen left']])
  })
  it('drops a byte-order mark and blank lines, keeps empty cells', () => {
    expect(parseCsv('﻿name,phone\n\nDana,\n,050\n')).toEqual([['name', 'phone'], ['Dana', ''], ['', '050']])
  })
  it('guesses semicolons and tabs, and ignores separators inside quotes', () => {
    expect(parseCsv('שם;טלפון\nדנה;050-1234567')).toEqual([['שם', 'טלפון'], ['דנה', '050-1234567']])
    expect(parseCsv('a\tb\n1\t2')).toEqual([['a', 'b'], ['1', '2']])
    expect(parseCsv('"a,b";c\n1;2')).toEqual([['a,b', 'c'], ['1', '2']])
  })
  it('returns nothing for an empty file', () => {
    expect(parseCsv('')).toEqual([])
    expect(parseCsv('\n\n')).toEqual([])
  })
})
