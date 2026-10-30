import { Body, Button, Container, Head, Hr, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'
import { colors, font, formatWhen } from './theme'

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

export function BookingInvite({
  guestName,
  hostName,
  title,
  startTime,
  endTime,
  timeZone,
  acceptUrl,
  logoUrl,
  brandName = 'Igani',
  supportEmail,
  notes,
}: BookingInviteProps): React.ReactElement {
  const when = formatWhen(startTime, endTime, timeZone)
  return (
    <Html lang="en">
      <Head />
      <Preview>{`${hostName} invited you: ${title}`}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px' }}>
          <Img src={logoUrl} alt={brandName} width={112} height={47} style={{ marginBottom: 32 }} />
          <Section style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 32 }}>
            <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>
              Meeting invitation
            </Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 600, lineHeight: '32px', margin: '8px 0 24px' }}>{title}</Text>
            <Text style={{ color: colors.muted, fontSize: 15, lineHeight: '24px', margin: '0 0 24px' }}>
              Hi {guestName}, {hostName} from {brandName} would like to meet with you:
            </Text>
            <Section style={{ borderLeft: `2px solid ${colors.accent}`, paddingLeft: 16, marginBottom: 28 }}>
              <Text style={{ color: colors.text, fontSize: 16, fontWeight: 600, margin: 0 }}>{when.date}</Text>
              <Text style={{ color: colors.muted, fontSize: 14, margin: '4px 0 0' }}>{when.time}</Text>
            </Section>
            {notes ? <Text style={{ color: colors.muted, fontSize: 14, lineHeight: '22px', margin: '0 0 24px' }}>{notes}</Text> : null}
            <Button
              href={acceptUrl}
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
              Confirm this time
            </Button>
            <Text style={{ color: colors.muted, fontSize: 12, margin: '16px 0 0' }}>
              A Google Meet link is created as soon as you confirm.
            </Text>
          </Section>
          <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
          <Text style={{ color: colors.muted, fontSize: 12, margin: 0 }}>
            {brandName} · <Link href="https://igani.co" style={{ color: colors.muted }}>igani.co</Link>{supportEmail ? ` · ${supportEmail}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default BookingInvite
