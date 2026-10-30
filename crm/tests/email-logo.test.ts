import { render } from '@react-email/render'
import * as React from 'react'
import { describe, expect, it } from 'vitest'
import { BookingConfirmed } from '@/emails/BookingConfirmed'
import { BookingInvite } from '@/emails/BookingInvite'
import { LeadAssigned } from '@/emails/LeadAssigned'
import { PendingBooking } from '@/emails/PendingBooking'
import { TaskDigest } from '@/emails/TaskDigest'
import { TeamInvite } from '@/emails/TeamInvite'

const LOGO = 'https://app.igani.co/igani-logo%202.png'
const when = { startTime: new Date('2026-11-02T15:00:00Z'), endTime: new Date('2026-11-02T15:30:00Z'), timeZone: 'UTC' }

describe('email logo', () => {
  it('every template uses the dark wordmark on a white chip, never the white wordmark', async () => {
    const emails: React.ReactElement[] = [
      React.createElement(BookingInvite, { hostName: 'Ann', guestName: 'Bo', title: 'Intro', ...when, acceptUrl: 'https://x', logoUrl: LOGO, brandName: 'Igani' } as never),
      React.createElement(BookingConfirmed, { guestName: 'Bo', hostName: 'Ann', title: 'Intro', ...when, logoUrl: LOGO, brandName: 'Igani', icsFileName: 'a.ics' } as never),
      React.createElement(PendingBooking, { guestName: 'Bo', guestEmail: 'b@x.co', hostName: 'Ann', title: 'Intro', ...when, reviewUrl: 'https://x', logoUrl: LOGO, brandName: 'Igani' } as never),
      React.createElement(TeamInvite, { role: 'SALES', inviterName: 'Ann', loginUrl: 'https://x', logoUrl: LOGO, brandName: 'Igani' }),
      React.createElement(LeadAssigned, { repName: 'Ann', leadName: 'Bo', leadEmail: 'b@x.co', company: null, source: 'web', leadUrl: 'https://x', logoUrl: LOGO, brandName: 'Igani' } as never),
      React.createElement(TaskDigest, { name: 'Ann', tasks: [], tasksUrl: 'https://x', logoUrl: LOGO, brandName: 'Igani' } as never),
    ]
    for (const el of emails) {
      const html = await render(el)
      expect(html).toContain('src="https://app.igani.co/igani-logo%202.png"')
      expect(html).not.toMatch(/igani-logo\.png/)
      expect(html).toContain('background-color:#ffffff')
    }
  })
})
