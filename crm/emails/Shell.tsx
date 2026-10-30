import { Body, Button, Container, Head, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLogo } from './EmailLogo'
import { colors, font } from './theme'

export interface ShellProps {
  preview: string
  eyebrow: string
  title: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  cta?: { href: string; label: string }
  children?: React.ReactNode
}

/** Shared dark/light-safe frame for the transactional emails (same look as BookingInvite). */
export function Shell({ preview, eyebrow, title, logoUrl, brandName = 'Igani', supportEmail, cta, children }: ShellProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '40px 0' }}>
        <Container style={{ maxWidth: 520, margin: '0 auto', padding: '0 20px' }}>
          <EmailLogo src={logoUrl} alt={brandName} />
          <Section style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 32 }}>
            <Text style={{ color: colors.muted, fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', margin: 0 }}>{eyebrow}</Text>
            <Text style={{ color: colors.text, fontSize: 24, fontWeight: 600, lineHeight: '32px', margin: '8px 0 24px' }}>{title}</Text>
            {children}
            {cta ? (
              <Button
                href={cta.href}
                style={{ backgroundColor: colors.accent, color: colors.accentText, borderRadius: 8, fontSize: 15, fontWeight: 600, padding: '14px 24px', textDecoration: 'none', display: 'inline-block' }}
              >
                {cta.label}
              </Button>
            ) : null}
          </Section>
          <Hr style={{ borderColor: colors.border, margin: '32px 0 16px' }} />
          <Text style={{ color: colors.muted, fontSize: 12, margin: 0 }}>
            {brandName} · <Link href="https://igani.co" style={{ color: colors.muted }}>igani.co</Link>
            {supportEmail ? ` · ${supportEmail}` : ''}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const p = { color: colors.muted, fontSize: 15, lineHeight: '24px', margin: '0 0 24px' } as const
