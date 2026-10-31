import * as React from 'react'
import { MeetingCard, PersonHeader, Quote, Shell } from './Shell'
import { formatWhen } from './theme'

export interface PendingBookingProps {
  guestName: string
  guestEmail: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  reviewUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  notes?: string | null
  /** An internal request: a teammate asking admins for a call, rather than a visitor booking online */
  teamRequest?: boolean
}

export function PendingBooking({ guestName, guestEmail, hostName, title, startTime, endTime, timeZone, reviewUrl, logoUrl, brandName, supportEmail, notes, teamRequest }: PendingBookingProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={teamRequest ? `${hostName} wants a team call ${w.date} at ${w.time}. Approve or decline.` : `${guestName} wants to meet ${w.date} at ${w.time}. Approve or decline.`}
      eyebrow={teamRequest ? 'Team meeting request' : 'Needs approval'}
      tone="warning"
      title={teamRequest ? `${hostName} wants to meet with you` : 'New booking request'}
      intro={teamRequest ? 'A teammate asked for a call with you. The time is held until an admin decides. Approving creates the Google Meet and sends everyone the link.' : 'Someone booked through a page that needs your approval. The time is held until you decide.'}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: reviewUrl, label: 'Review & approve' }}
      links={teamRequest ? [{ href: `mailto:${guestEmail}`, label: `Email ${hostName.split(' ')[0]}` }] : [{ href: `mailto:${guestEmail}`, label: `Email ${guestName.split(' ')[0]}` }]}
      footerNote={`You're an admin of the ${brandName ?? 'Igani'} CRM, so approval requests come to you.`}
    >
      <PersonHeader name={teamRequest ? hostName : guestName} sub={teamRequest ? 'Requested a team call' : guestEmail} />
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="warning" rows={teamRequest ? [{ label: 'Requested by', value: hostName }] : [{ label: 'Host', value: hostName }]} />
      {notes ? <Quote label="Their note">{notes}</Quote> : null}
    </Shell>
  )
}

export default PendingBooking
