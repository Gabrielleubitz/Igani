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
}

export function PendingBooking({ guestName, guestEmail, hostName, title, startTime, endTime, timeZone, reviewUrl, logoUrl, brandName, supportEmail, notes }: PendingBookingProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`${guestName} wants to meet ${w.date} at ${w.time}. Approve or decline.`}
      eyebrow="Needs approval"
      tone="warning"
      title="New booking request"
      intro="Someone booked through a page that needs your approval. The time is held until you decide."
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: reviewUrl, label: 'Review & approve' }}
      links={[{ href: `mailto:${guestEmail}`, label: `Email ${guestName.split(' ')[0]}` }]}
      footerNote={`You're an admin of the ${brandName ?? 'Igani'} CRM, so approval requests come to you.`}
    >
      <PersonHeader name={guestName} sub={guestEmail} />
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="warning" rows={[{ label: 'Host', value: hostName }]} />
      {notes ? <Quote label="Their note">{notes}</Quote> : null}
    </Shell>
  )
}

export default PendingBooking
