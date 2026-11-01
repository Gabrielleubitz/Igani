import { render } from '@react-email/render'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { NewLeadAlert } from '@/emails/NewLeadAlert'
import { newLeadRecipients, newLeadSubject } from '../lib/lead-alerts'

describe('new-lead alert recipients', () => {
  it('alerts every admin plus the Settings list, de-duplicated and case-insensitive', () => {
    const to = newLeadRecipients({ adminEmails: ['Ann@igani.co', 'bo@igani.co'], extraEmails: ['bo@igani.co', 'ops@igani.co'] })
    expect(to).toEqual(['ann@igani.co', 'bo@igani.co', 'ops@igani.co'])
  })

  it('includes the admin who added the lead, so a lone admin can see it work', () => {
    expect(newLeadRecipients({ adminEmails: ['ann@igani.co'], extraEmails: [] })).toEqual(['ann@igani.co'])
  })

  it('ignores blanks and non-addresses, and can end up empty', () => {
    expect(newLeadRecipients({ adminEmails: [' ', 'nope'], extraEmails: [] })).toEqual([])
  })
})

describe('new-lead alert subjects', () => {
  it('reads "New lead from <salesman>" when a teammate added it', () => {
    expect(newLeadSubject({ addedBy: 'Dana Cohen', leadName: 'Noa Levi', company: 'Acme' })).toBe('New lead from Dana Cohen')
  })

  it('keeps the lead name for website-form leads', () => {
    expect(newLeadSubject({ leadName: 'Noa Levi', company: 'Acme' })).toBe('New lead: Noa Levi (Acme)')
    expect(newLeadSubject({ leadName: 'Noa Levi' })).toBe('New lead: Noa Levi')
  })
})

describe('alert emails', () => {
  const base = { logoUrl: 'https://app.igani.co/igani-logo%202.png', brandName: 'Igani' }

  it('says who added the lead', async () => {
    const html = await render(React.createElement(NewLeadAlert, { ...base, leadName: 'Noa Levi', source: 'Other', addedBy: 'Dana Cohen', owner: 'Dana Cohen', leadUrl: 'https://x/l' }))
    expect(html).toContain('Dana Cohen added a new lead')
    expect(html).toContain('Added by')
    expect(html).not.toContain('just came in')
  })

  it('still reads as an inbound lead when nobody added it', async () => {
    const html = await render(React.createElement(NewLeadAlert, { ...base, leadName: 'Noa Levi', source: 'igani.co/contact', leadUrl: 'https://x/l' }))
    expect(html).toContain('A new lead just came in')
    expect(html).not.toContain('Added by')
  })
})
