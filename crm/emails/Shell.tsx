import { Body, Button, Column, Container, Font, Head, Html, Img, Link, Preview, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import { EmailLogo } from './EmailLogo'
import { TONES, colors, font, type Tone } from './theme'

export interface ShellProps {
  preview: string
  /** Small status chip next to the logo, e.g. "Meeting confirmed" */
  eyebrow: string
  tone?: Tone
  /** Round status icon above the title (✓, ✕, ⏰, ★ …). Centres the hero when set. */
  icon?: string
  title: string
  /** One-line subtitle under the title */
  intro?: React.ReactNode
  logoUrl: string
  brandName?: string
  supportEmail?: string
  cta?: { href: string; label: string }
  /** Quiet text links shown under the button, separated by dots */
  links?: { href: string; label: string }[]
  /** Small grey line under the button/links */
  ctaHint?: string
  /** Sign-off with an initial avatar, e.g. { name: 'Gabriel', detail: 'Igani' } */
  signature?: { name: string; detail?: string }
  /** Footer reason line; defaults to CRM activity */
  footerNote?: string
  children?: React.ReactNode
}

/**
 * Shared frame for every Igani email, built from tables (react-email) so it renders the same in Gmail,
 * Apple Mail and Outlook: brand gradient strip, logo + status chip, hero (optional status icon), content,
 * one primary button, quiet secondary links, optional signature, and a calm footer.
 */
export function Shell({ preview, eyebrow, tone = 'brand', icon, title, intro, logoUrl, brandName = 'Igani', supportEmail, cta, links, ctaHint, signature, footerNote, children }: ShellProps): React.ReactElement {
  const t = TONES[tone]
  const center = Boolean(icon)
  return (
    <Html lang="en" dir="ltr">
      <Head>
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <Font fontFamily="Inter" fallbackFontFamily={['Helvetica', 'Arial']} webFont={{ url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', format: 'woff2' }} fontWeight={400} fontStyle="normal" />
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ backgroundColor: colors.bg, fontFamily: font, margin: 0, padding: '40px 0', WebkitFontSmoothing: 'antialiased' }}>
        <Container style={{ maxWidth: 600, width: '100%', margin: '0 auto', padding: '0 12px' }}>
          <Section style={{ backgroundColor: colors.card, border: `1px solid ${colors.border}`, borderRadius: 18, overflow: 'hidden' }}>
            <div style={{ backgroundColor: colors.accent, backgroundImage: `linear-gradient(90deg, ${colors.brand} 0%, ${colors.accent} 60%, #6ea2f0 100%)`, height: 5, lineHeight: '5px', fontSize: 0 }}>&nbsp;</div>

            <Section style={{ padding: '28px 40px 0' }}>
              <Row>
                <Column style={{ verticalAlign: 'middle' }}>
                  <EmailLogo src={logoUrl} alt={brandName} />
                </Column>
                <Column align="right" style={{ verticalAlign: 'middle' }}>
                  <span style={{ display: 'inline-block', backgroundColor: t.bg, color: t.fg, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', borderRadius: 999, padding: '6px 12px', whiteSpace: 'nowrap' }}>{eyebrow}</span>
                </Column>
              </Row>
            </Section>

            <Section style={{ padding: '32px 40px 8px', textAlign: center ? 'center' : 'left' }}>
              {icon ? (
                <table role="presentation" cellPadding={0} cellSpacing={0} align="center" style={{ margin: '0 auto 18px' }}>
                  <tbody>
                    <tr>
                      <td align="center" valign="middle" style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: t.bg, color: t.fg, fontSize: 26, fontWeight: 700, lineHeight: '56px', textAlign: 'center' }}>
                        {icon}
                      </td>
                    </tr>
                  </tbody>
                </table>
              ) : null}
              <Text style={{ color: colors.text, fontSize: 26, fontWeight: 700, lineHeight: '34px', letterSpacing: -0.4, margin: 0 }}>{title}</Text>
              {intro ? <Text style={{ color: colors.body, fontSize: 16, lineHeight: '26px', margin: '12px 0 0' }}>{intro}</Text> : null}
            </Section>

            <Section style={{ padding: '20px 40px 36px' }}>
              {children}
              {cta ? (
                <Section style={{ textAlign: center ? 'center' : 'left', margin: '4px 0 0' }}>
                  <Button
                    href={cta.href}
                    style={{ backgroundColor: colors.accent, color: colors.accentText, borderRadius: 10, fontSize: 15, fontWeight: 600, lineHeight: '20px', padding: '15px 30px', textDecoration: 'none', display: 'inline-block', boxShadow: '0 1px 2px rgba(11,31,58,0.12)' }}
                  >
                    {cta.label} &rarr;
                  </Button>
                </Section>
              ) : null}
              {links?.length ? (
                <Text style={{ fontSize: 13, lineHeight: '20px', color: colors.faint, margin: cta ? '16px 0 0' : '0', textAlign: center ? 'center' : 'left' }}>
                  {links.map((l, i) => (
                    <React.Fragment key={l.href + l.label}>
                      {i > 0 ? <span style={{ color: colors.faint }}>&nbsp;&nbsp;·&nbsp;&nbsp;</span> : null}
                      <Link href={l.href} style={{ color: colors.accent, textDecoration: 'none', fontWeight: 500 }}>
                        {l.label}
                      </Link>
                    </React.Fragment>
                  ))}
                </Text>
              ) : null}
              {ctaHint ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '20px', margin: '16px 0 0', textAlign: center ? 'center' : 'left' }}>{ctaHint}</Text> : null}
              {signature ? <Signature {...signature} /> : null}
            </Section>
          </Section>

          <Section style={{ padding: '24px 20px 0', textAlign: 'center' }}>
            <Img src={logoUrl} alt={brandName} width={64} height={32} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.55, border: 0 }} />
            <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '18px', margin: 0 }}>
              <Link href="https://igani.co" style={{ color: colors.muted, textDecoration: 'none', fontWeight: 600 }}>
                igani.co
              </Link>
              {supportEmail ? (
                <>
                  {'  ·  '}
                  <Link href={`mailto:${supportEmail}`} style={{ color: colors.muted, textDecoration: 'none' }}>
                    {supportEmail}
                  </Link>
                </>
              ) : null}
            </Text>
            <Text style={{ color: colors.faint, fontSize: 11, lineHeight: '17px', margin: '6px auto 0', maxWidth: 420 }}>{footerNote ?? `You're receiving this because of activity with ${brandName}.`}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

function Signature({ name, detail }: { name: string; detail?: string }): React.ReactElement {
  return (
    <Section style={{ borderTop: `1px solid ${colors.hairline}`, marginTop: 32, paddingTop: 20 }}>
      <Row>
        <Column style={{ width: 52, verticalAlign: 'middle' }}>
          <table role="presentation" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td align="center" valign="middle" style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.accentSoft, color: colors.accent, fontSize: 16, fontWeight: 700, lineHeight: '40px', textAlign: 'center' }}>
                  {name.trim()[0]?.toUpperCase() ?? 'I'}
                </td>
              </tr>
            </tbody>
          </table>
        </Column>
        <Column style={{ verticalAlign: 'middle' }}>
          <Text style={{ color: colors.text, fontSize: 15, fontWeight: 600, lineHeight: '20px', margin: 0 }}>{name}</Text>
          {detail ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '19px', margin: 0 }}>{detail}</Text> : null}
        </Column>
      </Row>
    </Section>
  )
}

/** Label / value rows in a soft panel. */
export function DetailCard({ rows, accent = colors.accent }: { rows: { label: string; value: React.ReactNode }[]; accent?: string }): React.ReactElement {
  return (
    <Section style={{ backgroundColor: colors.panel, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${accent}`, borderRadius: 12, padding: '6px 20px', margin: '0 0 28px' }}>
      {rows.map((r, i) => (
        <Row key={r.label} style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.border}` }}>
          <Column style={{ width: 96, verticalAlign: 'top', padding: '11px 0' }}>
            <Text style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', lineHeight: '20px', margin: 0 }}>{r.label}</Text>
          </Column>
          <Column style={{ verticalAlign: 'top', padding: '11px 0' }}>
            <Text style={{ color: colors.text, fontSize: 14, lineHeight: '20px', margin: 0 }}>{r.value}</Text>
          </Column>
        </Row>
      ))}
    </Section>
  )
}

/**
 * Calendar-style meeting summary: a date tile (month strip + big day) beside the title, time and place.
 * The pattern scheduling tools use, readable at a glance and in previews.
 */
export function MeetingCard({ month, day, weekday, title, time, rows = [], tone = 'brand', struck = false }: { month: string; day: string; weekday: string; title: string; time: string; rows?: { label: string; value: string }[]; tone?: Tone; struck?: boolean }): React.ReactElement {
  const t = TONES[tone]
  return (
    <Section style={{ border: `1px solid ${colors.border}`, borderRadius: 14, margin: '0 0 28px', overflow: 'hidden' }}>
      <Section style={{ padding: '18px 20px' }}>
        <Row>
          <Column style={{ width: 76, verticalAlign: 'top' }}>
            <table role="presentation" cellPadding={0} cellSpacing={0} style={{ width: 62, borderRadius: 10, overflow: 'hidden', border: `1px solid ${colors.border}` }}>
              <tbody>
                <tr>
                  <td align="center" style={{ backgroundColor: t.fg, color: '#ffffff', fontSize: 11, fontWeight: 700, letterSpacing: 1.2, lineHeight: '22px' }}>{month}</td>
                </tr>
                <tr>
                  <td align="center" style={{ backgroundColor: '#ffffff', color: colors.text, fontSize: 26, fontWeight: 700, lineHeight: '34px', paddingTop: 2 }}>{day}</td>
                </tr>
                <tr>
                  <td align="center" style={{ backgroundColor: '#ffffff', color: colors.muted, fontSize: 10, fontWeight: 600, letterSpacing: 1, lineHeight: '14px', paddingBottom: 6 }}>{weekday}</td>
                </tr>
              </tbody>
            </table>
          </Column>
          <Column style={{ verticalAlign: 'top' }}>
            <Text style={{ color: colors.text, fontSize: 17, fontWeight: 700, lineHeight: '24px', margin: '2px 0 4px', textDecoration: struck ? 'line-through' : 'none' }}>{title}</Text>
            <Text style={{ color: colors.body, fontSize: 14, lineHeight: '21px', margin: 0, textDecoration: struck ? 'line-through' : 'none' }}>{time}</Text>
          </Column>
        </Row>
      </Section>
      {rows.length ? (
        <Section style={{ backgroundColor: colors.panel, borderTop: `1px solid ${colors.border}`, padding: '6px 20px' }}>
          {rows.map((r, i) => (
            <Row key={r.label} style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.border}` }}>
              <Column style={{ width: 96, padding: '9px 0', verticalAlign: 'top' }}>
                <Text style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', lineHeight: '20px', margin: 0 }}>{r.label}</Text>
              </Column>
              <Column style={{ padding: '9px 0', verticalAlign: 'top' }}>
                <Text style={{ color: colors.text, fontSize: 14, lineHeight: '20px', margin: 0 }}>{r.value}</Text>
              </Column>
            </Row>
          ))}
        </Section>
      ) : null}
    </Section>
  )
}

/** Numbered "what happens next" steps. */
export function Steps({ title, steps }: { title?: string; steps: { title: string; body?: string }[] }): React.ReactElement {
  return (
    <Section style={{ margin: '0 0 28px' }}>
      {title ? <Text style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 12px' }}>{title}</Text> : null}
      {steps.map((s, i) => (
        <Row key={s.title} style={{ marginBottom: 12 }}>
          <Column style={{ width: 40, verticalAlign: 'top' }}>
            <table role="presentation" cellPadding={0} cellSpacing={0}>
              <tbody>
                <tr>
                  <td align="center" valign="middle" style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.accentSoft, color: colors.accent, fontSize: 12, fontWeight: 700, lineHeight: '26px', textAlign: 'center' }}>
                    {i + 1}
                  </td>
                </tr>
              </tbody>
            </table>
          </Column>
          <Column style={{ verticalAlign: 'top' }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 600, lineHeight: '22px', margin: '2px 0 0' }}>{s.title}</Text>
            {s.body ? <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '20px', margin: '2px 0 0' }}>{s.body}</Text> : null}
          </Column>
        </Row>
      ))}
    </Section>
  )
}

/** A quoted block for a note or message (keeps line breaks), with an optional label. */
export function Quote({ children, label }: { children: React.ReactNode; label?: string }): React.ReactElement {
  return (
    <Section style={{ margin: '0 0 28px' }}>
      {label ? <Text style={{ color: colors.muted, fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', margin: '0 0 8px' }}>{label}</Text> : null}
      <Text style={{ color: colors.body, fontSize: 14, lineHeight: '23px', whiteSpace: 'pre-wrap', backgroundColor: '#ffffff', border: `1px solid ${colors.border}`, borderLeft: `3px solid ${colors.faint}`, borderRadius: 10, padding: '14px 18px', margin: 0, fontStyle: 'italic' }}>
        {children}
      </Text>
    </Section>
  )
}

/** Person header: initial avatar + name + secondary line (for lead emails). */
export function PersonHeader({ name, sub }: { name: string; sub?: string }): React.ReactElement {
  return (
    <Section style={{ margin: '0 0 20px' }}>
      <Row>
        <Column style={{ width: 64, verticalAlign: 'middle' }}>
          <table role="presentation" cellPadding={0} cellSpacing={0}>
            <tbody>
              <tr>
                <td align="center" valign="middle" style={{ width: 52, height: 52, borderRadius: 26, background: `linear-gradient(135deg, ${colors.accent}, #6ea2f0)`, backgroundColor: colors.accent, color: '#ffffff', fontSize: 20, fontWeight: 700, lineHeight: '52px', textAlign: 'center' }}>
                  {name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((x) => x[0]?.toUpperCase())
                    .join('')}
                </td>
              </tr>
            </tbody>
          </table>
        </Column>
        <Column style={{ verticalAlign: 'middle' }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: 700, lineHeight: '24px', margin: 0 }}>{name}</Text>
          {sub ? <Text style={{ color: colors.muted, fontSize: 14, lineHeight: '20px', margin: '2px 0 0' }}>{sub}</Text> : null}
        </Column>
      </Row>
    </Section>
  )
}

export const p = { color: colors.body, fontSize: 15, lineHeight: '25px', margin: '0 0 24px' } as const
