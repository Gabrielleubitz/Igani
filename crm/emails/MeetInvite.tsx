import { Body, Button, Container, Head, Html, Img, Link, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'
import { colors, font } from './theme'

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

const p: React.CSSProperties = { fontSize: 15, lineHeight: '24px', color: colors.text, margin: '0 0 14px' }
const small: React.CSSProperties = { fontSize: 13, lineHeight: '20px', color: colors.muted, margin: '0 0 8px' }

/**
 * An invite to an Igani Meet call, written like a personal note from the host (not a designed newsletter): a short
 * greeting, the time, one button and the plain link, and the host's signature. Gmail files mail like this in the
 * main inbox; big branded layouts with banners and panels tend to land in Promotions.
 */
export function MeetInvite({ title, hostName, guestName, joinUrl, when, brandName = 'Igani', hostPhotoUrl }: MeetInviteProps): React.ReactElement {
  const first = guestName?.trim().split(/\s+/)[0]
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
      </Head>
      <Preview>{when ? `${when}: ${title}` : `Join ${hostName} on a video call: ${title}`}</Preview>
      <Body style={{ backgroundColor: '#ffffff', fontFamily: font, margin: 0, padding: '24px 0' }}>
        <Container style={{ maxWidth: 560, width: '100%', margin: '0 auto', padding: '0 20px' }}>
          <Text style={p}>{first ? `Hi ${first},` : 'Hi,'}</Text>
          <Text style={p}>
            {hostName} invited you to a video call: <strong>{title}</strong>.
          </Text>
          <Text style={p}>{when ? <>When: {when}</> : 'You can join any time from the link below.'}</Text>
          <Section style={{ margin: '22px 0 18px' }}>
            <Button href={joinUrl} style={{ backgroundColor: colors.accent, color: '#ffffff', fontSize: 15, fontWeight: 600, borderRadius: 10, padding: '12px 22px', textDecoration: 'none' }}>
              Join the call
            </Button>
          </Section>
          <Text style={small}>
            Or open this link: <Link href={joinUrl} style={{ color: colors.link, wordBreak: 'break-all' }}>{joinUrl}</Link>
          </Text>
          <Text style={small}>It opens in your browser (Chrome, Safari, Edge or Firefox, on a computer or phone). No app or account needed. The link is just for you, so please don’t forward it.</Text>
          <Text style={{ ...p, margin: '22px 0 4px' }}>See you there,</Text>
          <table cellPadding={0} cellSpacing={0} role="presentation" style={{ marginTop: 6 }}>
            <tbody>
              <tr>
                {hostPhotoUrl ? (
                  <td style={{ paddingRight: 10, verticalAlign: 'middle' }}>
                    <Img src={hostPhotoUrl} width={36} height={36} alt="" style={{ borderRadius: 18, display: 'block' }} />
                  </td>
                ) : null}
                <td style={{ verticalAlign: 'middle' }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: colors.text, lineHeight: '20px' }}>{hostName}</div>
                  <div style={{ fontSize: 13, color: colors.muted, lineHeight: '18px' }}>
                    {brandName} · <span style={{ color: colors.accent, fontWeight: 600 }}>{brandName} Meet</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <Text style={{ ...small, marginTop: 26, fontSize: 12, color: colors.faint }}>Questions? Just reply to this email and it goes to {hostName}.</Text>
        </Container>
      </Body>
    </Html>
  )
}

/** The plain-text version, written as a normal note (not generated from the HTML). */
export function meetInviteText({ title, hostName, guestName, joinUrl, when, brandName = 'Igani' }: MeetInviteProps): string {
  const first = guestName?.trim().split(/\s+/)[0]
  return [
    first ? `Hi ${first},` : 'Hi,',
    '',
    `${hostName} invited you to a video call: ${title}.`,
    when ? `When: ${when}` : 'You can join any time from the link below.',
    '',
    `Join the call: ${joinUrl}`,
    '',
    'It opens in your browser. No app or account needed. The link is just for you, so please don’t forward it.',
    '',
    'See you there,',
    hostName,
    `${brandName} Meet`,
  ].join('\n')
}

export default MeetInvite
