import { describe, expect, it } from 'vitest'
import { recipientLabel } from '../lib/email-labels'

const lead = { email: 'a@client.com', name: 'Dana' }

describe('recipientLabel', () => {
  it('shows only this lead when the message also went to another client', () => {
    expect(recipientLabel(lead, { toEmails: ['a@client.com', 'b@other.com'], ccEmails: [] })).toBe('Dana')
    expect(recipientLabel(lead, { toEmails: ['b@other.com'], ccEmails: ['A@Client.com'] })).toBe('Dana')
  })
  it('shows the team addresses on mail the lead sent in', () => {
    expect(recipientLabel(lead, { toEmails: ['rep@igani.co'], ccEmails: [] })).toBe('rep@igani.co')
    expect(recipientLabel({ email: null, name: 'Noa' }, { toEmails: [], ccEmails: [] })).toBe('—')
  })
})
