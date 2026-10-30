import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'
import { colors, font, formatWhen } from './theme'

export interface BookingConfirmedProps {
  guestName: string
  hostName: string
  title: string
  startTime: Date
  endTime: Date
  /** IANA zone used to display the time, e.g. "Asia/Jerusalem" */
  timeZone: string
  meetUrl: string
  /** Absolute URL of the Igani logo (white wordmark for the dark background) */
  logoUrl: string
  /** Set when an .ics file is attached to the email; shows the "add to calendar" hint */
  icsFileName?: string
  notes?: string | null
}

export function BookingConfirmed({
  guestName,
  hostName,
  title,
  startTime,
  endTime,
  timeZone,
  meetUrl,
  logoUrl,
  icsFileName,
  notes,
}: BookingConfirmedProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Html lang="en">
      <Head />
      <Preview>{`Confirmed: ${title} — ${when.date}`}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px' }}>
          <Img src={logoUrl} alt="Igani" width={96} height={28} style={{ marginBottom: 32 }} />
          <Section
            style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 32 }}
          >
            <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
              Meeting confirmed
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 600, lineHeight: '32px', margin: '8px 0 24px' }}>
              {title}
            </Text>
            <Text style={{ color: colors.text, fontSize: 15, margin: '0 0 4px' }}>Hi {guestName},</Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: '24px', margin: '0 0 24px' }}>
              You&apos;re booked with {hostName} from Igani. Here are the details:
            </Text>
            <Section style={{ borderLeft: `2px solid ${colors.accent}`, paddingLeft: 16, marginBottom: 28 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>{when.date}</Text>
              <Text style={{ color: colors.muted, fontSize: 14, margin: '4px 0 0' }}>{when.time}</Text>
            </Section>
            {notes ? (
              <Text style={{ color: colors.muted, fontSize: 14, lineHeight: '22px', margin: '0 0 24px' }}>{notes}</Text>
            ) : null}
            <Button
              href={meetUrl}
              style={{
                backgroundColor: colors.accent,
                color: colors.accentText,
                borderRadius: 8,
                fontSize: 15,
                fontWeight: 600,
                padding: '14px 24px',
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Join Google Meet
            </Button>
            <Text style={{ color: colors.muted, fontSize: 12, margin: '16px 0 0' }}>
              Or open:{' '}
              <Link href={meetUrl} style={{ color: colors.text }}>
                {meetUrl}
              </Link>
            </Text>
            {icsFileName ? (
              <Text style={{ color: colors.muted, fontSize: 12, margin: '8px 0 0' }}>
                Add it to your calendar with the attached {icsFileName} file.
              </Text>
            ) : null}
          </Section>
          <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
          <Text style={{ color: colors.muted, fontSize: 12, margin: 0 }}>
            Igani · <Link href="https://igani.co" style={{ color: colors.muted }}>igani.co</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

BookingConfirmed.PreviewProps = {
  guestName: 'Dana',
  hostName: 'Gabriel',
  title: 'Igani intro call',
  startTime: new Date('2026-11-02T09:00:00Z'),
  endTime: new Date('2026-11-02T09:30:00Z'),
  timeZone: 'Asia/Jerusalem',
  meetUrl: 'https://meet.google.com/abc-defg-hij',
  logoUrl: 'https://app.igani.co/igani-logo.png',
  icsFileName: 'igani-meeting.ics',
} satisfies BookingConfirmedProps

export default BookingConfirmed
