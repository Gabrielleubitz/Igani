import { render } from '@react-email/render'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { LeadsImported } from '@/emails/LeadsImported'
import { NewLeadAlert } from '@/emails/NewLeadAlert'
import { importedLeadsSubject, newLeadRecipients, newLeadSubject } from '../lib/lead-alerts'

describe('new-lead alert recipients', () => {
  it('alerts every admin plus the Settings list, de-duplicated and case-insensitive', () => {
    const to = newLeadRecipients({ adminEmails: ['Ann@igani.co', 'bo@igani.co'], extraEmails: ['bo@igani.co', 'ops@igani.co'] })
    expect(to).toEqual(['ann@igani.co', 'bo@igani.co', 'ops@igani.co'])
  })

  it('leaves out the person who added the lead, however their address is cased', () => {
    const to = newLeadRecipients({ adminEmails: ['ann@igani.co', 'bo@igani.co'], extraEmails: [], exceptEmail: 'ANN@igani.co' })
    expect(to).toEqual(['bo@igani.co'])
  })

  it('ignores blanks and non-addresses, and can end up empty', () => {
    expect(newLeadRecipients({ adminEmails: [' ', 'nope'], extraEmails: [] })).toEqual([])
    expect(newLeadRecipients({ adminEmails: ['ann@igani.co'], extraEmails: [], exceptEmail: 'ann@igani.co' })).toEqual([])
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

  it('summarises an import in one subject', () => {
    expect(importedLeadsSubject({ addedBy: 'Dana', count: 1 })).toBe('New lead from Dana')
    expect(importedLeadsSubject({ addedBy: 'Dana', count: 48 })).toBe('48 new leads from Dana')
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

  it('summarises an import with the first few names and a count of the rest', async () => {
    const sample = Array.from({ length: 6 }, (_, i) => ({ name: `Lead ${i + 1}`, detail: 'Acme' }))
    const html = await render(React.createElement(LeadsImported, { ...base, addedBy: 'Dana', count: 40, sample, leadsUrl: 'https://x/leads' }))
    expect(html).toContain('Dana imported 40 new leads')
    expect(html).toContain('Lead 1')
    expect(html).toContain('and 34 more')
  })
})
