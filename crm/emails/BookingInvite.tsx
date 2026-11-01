import * as React from 'react'
import { MeetingCard, Quote, Shell } from './Shell'
import { formatWhen } from './theme'

export interface BookingInviteProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  acceptUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  notes?: string | null
}

export function BookingInvite({ guestName, hostName, title, startTime, endTime, timeZone, acceptUrl, logoUrl, brandName = 'Igani', supportEmail, notes }: BookingInviteProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`${hostName} invited you to ${title} on ${w.date}. One click to confirm.`}
      eyebrow="Meeting invitation"
      title={`${hostName} would like to meet`}
      intro={<>Hi {guestName}, here&apos;s a time that works for us. If it suits you too, confirm with one click.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: acceptUrl, label: 'Confirm this time' }}
      ctaHint="A Google Meet link and calendar invite arrive the moment you confirm. Need a different time? Just reply to this email."
      signature={{ name: hostName, detail: brandName }}
      footerNote={`${hostName} at ${brandName} invited you to this meeting.`}
    >
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} rows={[{ label: 'With', value: `${hostName}, ${brandName}` }, { label: 'Where', value: 'Google Meet (video call)' }]} />
      {notes ? <Quote label={`A note from ${hostName.split(' ')[0]}`}>{notes}</Quote> : null}
    </Shell>
  )
}

export default BookingInvite
