import * as React from 'react'
import { MeetingCard, Shell, Steps } from './Shell'
import { formatWhen } from './theme'

export interface BookingRequestedProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  timeZone: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** Receipt for the guest when a booking page needs approval: "we got it, we'll confirm soon". */
export function BookingRequested({ guestName, hostName, title, startTime, endTime, timeZone, logoUrl, brandName = 'Igani', supportEmail }: BookingRequestedProps): React.ReactElement {
  const w = formatWhen(startTime, endTime, timeZone)
  return (
    <Shell
      preview={`Request received: ${title} on ${w.date}. We'll confirm shortly.`}
      eyebrow="Request received"
      tone="warning"
      icon="⏳"
      title="Your time is on hold"
      intro={<>Thanks {guestName}! We&apos;re holding this slot for you while {hostName} confirms.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      signature={{ name: hostName, detail: brandName }}
      footerNote={`You requested a meeting with ${brandName}.`}
    >
      <MeetingCard month={w.month} day={w.day} weekday={w.weekday} title={title} time={w.time} tone="warning" rows={[{ label: 'With', value: `${hostName}, ${brandName}` }, { label: 'Status', value: 'Waiting for confirmation' }]} />
      <Steps
        title="What happens next"
        steps={[
          { title: `${hostName.split(' ')[0]} reviews your request`, body: 'Usually within one business day.' },
          { title: 'You get a confirmation', body: 'With the Google Meet link and a calendar invite.' },
        ]}
      />
    </Shell>
  )
}

export default BookingRequested
