import { describe, expect, it } from 'vitest'
import { shareActions } from '@/lib/share-actions'

const text = 'Gabriel and Dana will send the proposal and book the demo. Sam to review the contract.'
describe('shareActions', () => {
  it('adds a line for every teammate named on a shared item', () => {
    const r = shareActions(['Gabriel: send the proposal', 'Gabriel: book the demo', 'Sam: review the contract'], text, ['Gabriel', 'Dana', 'Sam'])
    expect(r).toEqual(['Gabriel: send the proposal', 'Dana: send the proposal', 'Gabriel: book the demo', 'Dana: book the demo', 'Sam: review the contract'])
  })
  it('splits combined owners and avoids duplicates', () => {
    expect(shareActions(['Gabriel and Dana: send it', 'Dana: send it'], '', ['Gabriel', 'Dana'])).toEqual(['Gabriel: send it', 'Dana: send it'])
  })
})

describe('shareActions edge cases', () => {
  it('handles comma lists', () => {
    const r = shareActions(['Sam: send the report'], 'Sam, Dana and Gabriel should send the report.', ['Sam', 'Dana', 'Gabriel'])
    expect(r).toEqual(['Sam: send the report', 'Dana: send the report', 'Gabriel: send the report'])
  })
  it('adds the teammate when the model wrote only an outsider', () => {
    const r = shareActions(['Bob: call vendor'], 'Bob and Gabriel to call vendor.', ['Gabriel', 'Dana'])
    expect(r).toEqual(['Bob: call vendor', 'Gabriel: call vendor'])
  })
})
