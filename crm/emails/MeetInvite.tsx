import * as React from 'react'
import { DetailCard, Shell, Steps } from './Shell'

export interface MeetInviteProps {
  title: string
  hostName: string
  guestName: string | null
  joinUrl: string
  /** formatted in the host's time zone, or null for "join any time" */
  when: string | null
  logoUrl: string
  brandName?: string
  supportEmail?: string
  hostPhotoUrl?: string | null
}

/** An invite to an Igani Meet video call: one button, no account needed. */
export function MeetInvite({ title, hostName, guestName, joinUrl, when, logoUrl, brandName = 'Igani', supportEmail, hostPhotoUrl }: MeetInviteProps): React.ReactElement {
  return (
    <Shell
      preview={`${hostName} invited you to a video call: ${title}`}
      eyebrow="Igani Meet"
      icon="▶"
      title={title}
      intro={<>{guestName ? `Hi ${guestName.split(' ')[0]}, ` : ''}{hostName} invited you to a video call on Igani Meet.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: joinUrl, label: 'Join the call' }}
      ctaHint="Opens in your browser. No app or account needed. This link is personal, please don't forward it."
      signature={{ name: hostName, detail: brandName, photoUrl: hostPhotoUrl }}
      footerNote={`You were invited to an Igani Meet call by ${hostName}.`}
    >
      <DetailCard rows={[...(when ? [{ label: 'When', value: when }] : [{ label: 'When', value: 'Join any time from the link' }]), { label: 'Host', value: hostName }, { label: 'Where', value: 'Igani Meet (video, in your browser)' }]} />
      <Steps
        title="Before you join"
        steps={[
          { title: 'Use Chrome, Edge, Safari or Firefox', body: 'On a phone, the browser works too.' },
          { title: 'Allow camera and microphone', body: 'Your browser asks once. You can join with them off.' },
        ]}
      />
    </Shell>
  )
}

export default MeetInvite
