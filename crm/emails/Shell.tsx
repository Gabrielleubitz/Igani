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
  /** Small grey line under the button */
  ctaHint?: string
  children?: React.ReactNode
}

/** Shared white, branded frame for every CRM email: navy brand bar, bare dark logo, eyebrow pill, title, content, button, footer. */
export function Shell({ preview, eyebrow, title, logoUrl, brandName = 'Igani', supportEmail, cta, ctaHint, children }: ShellProps): React.ReactElement {
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '32px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
          <Section style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ backgroundColor: colors.brand, height: 6, lineHeight: '6px', fontSize: 0 }}>&nbsp;</div>
            <div style={{ padding: '32px 36px 0' }}>
              <EmailLogo src={logoUrl} alt={brandName} />
            </div>
            <div style={{ padding: '28px 36px 36px' }}>
              <Text
                style={{ display: 'inline-block', backgroundColor: '#e8f0fc', color: colors.accent, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderRadius: 999, padding: '5px 12px', margin: 0 }}
              >
                {eyebrow}
              </Text>
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: 700, lineHeight: '34px', margin: '14px 0 20px' }}>{title}</Text>
              {children}
              {cta ? (
                <Button
                  href={cta.href}
                  style={{ backgroundColor: colors.accent, color: colors.accentText, borderRadius: 10, fontSize: 15, fontWeight: 600, padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }}
                >
                  {cta.label}
                </Button>
              ) : null}
              {ctaHint ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: '14px 0 0' }}>{ctaHint}</Text> : null}
            </div>
          </Section>
          <Hr style={{ borderColor: 'transparent', margin: '20px 0 0' }} />
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', textAlign: 'center', margin: 0 }}>
            <strong style={{ color: colors.text }}>{brandName}</strong> · <Link href="https://igani.co" style={{ color: colors.muted }}>igani.co</Link>
            {supportEmail ? <> · <Link href={`mailto:${supportEmail}`} style={{ color: colors.muted }}>{supportEmail}</Link></> : null}
          </Text>
          <Text style={{ color: '#8a97a8', fontSize: 11, textAlign: 'center', margin: '6px 0 0' }}>You are receiving this because of activity in the {brandName} CRM.</Text>
        </Container>
      </Body>
    </Html>
  )
}

/** Highlighted details panel (date, time, who, etc.) with an accent stripe. */
export function DetailCard({ rows }: { rows: { label: string; value: string }[] }): React.ReactElement {
  return (
    <Section style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${colors.accent}`, borderRadius: 10, padding: '14px 18px', margin: '0 0 24px' }}>
      {rows.map((r) => (
        <Text key={r.label} style={{ margin: '4px 0', fontSize: 14, lineHeight: '20px', color: colors.text }}>
          <span style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'block' }}>{r.label}</span>
          {r.value}
        </Text>
      ))}
    </Section>
  )
}

export const p = { color: colors.muted, fontSize: 15, lineHeight: '24px', margin: '0 0 24px' } as const
