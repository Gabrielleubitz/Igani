import { Body, Button, Column, Container, Head, Html, Link, Preview, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLogo } from './EmailLogo'
import { colors, font } from './theme'

export interface ShellProps {
  preview: string
  eyebrow: string
  /** Eyebrow pill colour: brand blue (default), green for good news, red for cancellations, amber for reminders */
  tone?: 'brand' | 'success' | 'danger' | 'warning'
  title: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
  cta?: { href: string; label: string }
  /** Optional quieter link shown next to / under the main button */
  secondary?: { href: string; label: string }
  /** Small grey line under the button */
  ctaHint?: string
  /** Sign-off under the content, e.g. { name: 'Gabriel', role: 'Igani' } */
  signature?: { name: string; detail?: string }
  /** Footer reason line; defaults to CRM activity */
  footerNote?: string
  children?: React.ReactNode
}

const TONES = {
  brand: { bg: '#e8f0fc', fg: colors.accent },
  success: { bg: '#e3f6ec', fg: '#16794a' },
  danger: { bg: '#fdeaea', fg: colors.danger },
  warning: { bg: '#fdf3e1', fg: '#a1620a' },
} as const

/**
 * Shared white, branded frame for every Igani email: navy brand bar, bare dark wordmark,
 * eyebrow pill, title, content, button, optional signature and a quiet footer.
 * Table-based via react-email components so it renders the same in Gmail, Outlook and Apple Mail.
 */
export function Shell({ preview, eyebrow, tone = 'brand', title, logoUrl, brandName = 'Igani', supportEmail, cta, secondary, ctaHint, signature, footerNote, children }: ShellProps): React.ReactElement {
  const t = TONES[tone]
  return (
    <Html lang="en">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '32px 0' }}>
        <Container style={{ maxWidth: 560, margin: '0 auto', padding: '0 16px' }}>
          <Section style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ backgroundColor: colors.brand, backgroundImage: `linear-gradient(90deg, ${colors.brand} 0%, ${colors.accent} 100%)`, height: 6, lineHeight: '6px', fontSize: 0 }}>&nbsp;</div>
            <div style={{ padding: '32px 36px 0' }}>
              <EmailLogo src={logoUrl} alt={brandName} />
            </div>
            <div style={{ padding: '28px 36px 36px' }}>
              <Text style={{ display: 'inline-block', backgroundColor: t.bg, color: t.fg, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', borderRadius: 999, padding: '5px 12px', margin: 0 }}>
                {eyebrow}
              </Text>
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: 700, lineHeight: '34px', letterSpacing: -0.3, margin: '14px 0 20px' }}>{title}</Text>
              {children}
              {cta ? (
                <Button
                  href={cta.href}
                  style={{ backgroundColor: colors.accent, color: colors.accentText, borderRadius: 10, fontSize: 15, fontWeight: 600, padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }}
                >
                  {cta.label}
                </Button>
              ) : null}
              {secondary ? (
                <Text style={{ fontSize: 13, lineHeight: '20px', margin: cta ? '14px 0 0' : '0' }}>
                  <Link href={secondary.href} style={{ color: colors.accent, textDecoration: 'underline' }}>
                    {secondary.label}
                  </Link>
                </Text>
              ) : null}
              {ctaHint ? <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: '14px 0 0' }}>{ctaHint}</Text> : null}
              {signature ? (
                <Section style={{ borderTop: `1px solid ${colors.border}`, marginTop: 28, paddingTop: 18 }}>
                  <Text style={{ color: colors.text, fontSize: 15, fontWeight: 600, lineHeight: '22px', margin: 0 }}>{signature.name}</Text>
                  {signature.detail ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '20px', margin: 0 }}>{signature.detail}</Text> : null}
                </Section>
              ) : null}
            </div>
          </Section>
          <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', textAlign: 'center', margin: '22px 0 0' }}>
            <strong style={{ color: colors.text }}>{brandName}</strong> · <Link href="https://igani.co" style={{ color: colors.muted }}>igani.co</Link>
            {supportEmail ? (
              <>
                {' '}
                · <Link href={`mailto:${supportEmail}`} style={{ color: colors.muted }}>{supportEmail}</Link>
              </>
            ) : null}
          </Text>
          <Text style={{ color: '#8a97a8', fontSize: 11, lineHeight: '16px', textAlign: 'center', margin: '6px 0 0' }}>{footerNote ?? `You are receiving this because of activity in the ${brandName} CRM.`}</Text>
        </Container>
      </Body>
    </Html>
  )
}

/** Highlighted details panel (label / value rows) with an accent stripe. */
export function DetailCard({ rows, accent = colors.accent }: { rows: { label: string; value: string }[]; accent?: string }): React.ReactElement {
  return (
    <Section style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: '10px 18px', margin: '0 0 24px' }}>
      {rows.map((r, i) => (
        <Row key={r.label} style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.border}` }}>
          <Column style={{ width: 92, verticalAlign: 'top', padding: '9px 0' }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', lineHeight: '20px', margin: 0 }}>{r.label}</Text>
          </Column>
          <Column style={{ verticalAlign: 'top', padding: '9px 0' }}>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: '20px', margin: 0 }}>{r.value}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

/** A quoted block for a note or message (keeps line breaks). */
export function Quote({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <Text style={{ color: colors.text, fontSize: 14, lineHeight: '22px', whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', border: `1px solid ${colors.border}`, borderRadius: 10, padding: '12px 16px', margin: '0 0 24px' }}>
      {children}
    </Text>
  )
}

export const p = { color: colors.muted, fontSize: 15, lineHeight: '24px', margin: '0 0 24px' } as const
