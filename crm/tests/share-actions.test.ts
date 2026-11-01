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
