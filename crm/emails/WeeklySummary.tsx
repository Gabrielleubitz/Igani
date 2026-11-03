import { Column, Link, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import { Shell } from './Shell'
import { colors } from './theme'

export interface WeeklySummaryProps {
  name: string
  range: string
  stats: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }[]
  signed: { title: string; client: string; total: string }[]
  hotOffers: { title: string; client: string; detail: string; url: string }[]
  tasks: { name: string; open: number; overdue: number }[]
  sources: string
  quiet: number
  dashboardUrl: string
  tasksUrl: string
  todayUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

const h = (text: string): React.ReactElement => <Text style={{ color: colors.text, fontSize: 15, fontWeight: 700, margin: '28px 0 10px' }}>{text}</Text>
const box = { border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden' } as const

/** Sunday email for admins: last week in numbers, what was signed, offers the client is reading, and who is behind. */
export function WeeklySummary({ name, range, stats, signed, hotOffers, tasks, sources, quiet, dashboardUrl, tasksUrl, todayUrl, logoUrl, brandName, supportEmail }: WeeklySummaryProps): React.ReactElement {
  const rows: (typeof stats)[] = []
  for (let i = 0; i < stats.length; i += 2) rows.push(stats.slice(i, i + 2))
  return (
    <Shell
      preview={`${stats.map((s) => `${s.value} ${s.label.toLowerCase()}`).slice(0, 3).join(' · ')}`}
      eyebrow="Weekly summary"
      title={`Your week at ${brandName ?? 'Igani'}, ${name}`}
      intro={range}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: dashboardUrl, label: 'Open the overview' }}
      footerNote={`Sent every Sunday morning to admins. Turn it off in ${brandName ?? 'Igani'} CRM → Settings → Notifications.`}
    >
      <Section style={{ margin: '0 0 8px' }}>
        {rows.map((pair, i) => (
          <Row key={i}>
            {pair.map((s) => (
              <Column key={s.label} style={{ width: '50%', padding: '0 6px 12px 0', verticalAlign: 'top' }}>
                <div style={{ border: `1px solid ${colors.border}`, borderRadius: 12, padding: '14px 16px', backgroundColor: colors.panel }}>
                  <Text style={{ color: colors.text, fontSize: 24, fontWeight: 700, lineHeight: '28px', margin: 0 }}>{s.value}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12, lineHeight: '16px', margin: '4px 0 0' }}>{s.label}</Text>
                  {s.sub ? <Text style={{ color: s.tone === 'good' ? colors.success : s.tone === 'bad' ? colors.danger : colors.faint, fontSize: 12, lineHeight: '16px', margin: '2px 0 0', fontWeight: 600 }}>{s.sub}</Text> : null}
                </div>
              </Column>
            ))}
          </Row>
        ))}
      </Section>
      {sources ? <Text style={{ color: colors.muted, fontSize: 13, margin: '0 0 4px' }}>New leads came from {sources}.</Text> : null}

      {signed.length ? (
        <>
          {h(`Signed this week (${signed.length})`)}
          <Section style={box}>
            {signed.map((s, i) => (
              <Row key={i} style={{ borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <Column style={{ width: 6, backgroundColor: colors.success }} />
                <Column style={{ padding: '12px 16px' }}>
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: 600, margin: 0 }}>{s.client}</Text>
                  <Text style={{ color: colors.muted, fontSize: 13, margin: '2px 0 0' }}>{s.title}</Text>
                </Column>
                <Column align="right" style={{ padding: '12px 16px', color: colors.success, fontSize: 14, fontWeight: 700 }}>
                  {s.total}
                </Column>
              </Row>
            ))}
          </Section>
        </>
      ) : null}

      {hotOffers.length ? (
        <>
          {h('Offers clients are reading: call them')}
          <Section style={box}>
            {hotOffers.map((o, i) => (
              <Row key={o.url} style={{ borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <Column style={{ width: 6, backgroundColor: colors.accent }} />
                <Column style={{ padding: '12px 16px' }}>
                  <Link href={o.url} style={{ color: colors.text, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                    {o.client}
                  </Link>
                  <Text style={{ color: colors.muted, fontSize: 13, margin: '2px 0 0' }}>
                    {o.title} · {o.detail}
                  </Text>
                </Column>
                <Column align="right" style={{ padding: '12px 16px', width: 70 }}>
                  <Link href={o.url} style={{ color: colors.link, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    Visits →
                  </Link>
                </Column>
              </Row>
            ))}
          </Section>
        </>
      ) : null}

      {tasks.length ? (
        <>
          {h('Open tasks by teammate')}
          <Section style={box}>
            {tasks.map((t, i) => (
              <Row key={t.name} style={{ borderTop: i ? `1px solid ${colors.border}` : 'none' }}>
                <Column style={{ padding: '10px 16px', color: colors.text, fontSize: 14 }}>{t.name}</Column>
                <Column align="right" style={{ padding: '10px 16px', fontSize: 13, color: colors.muted }}>
                  {t.open} open
                  {t.overdue ? <span style={{ color: colors.danger, fontWeight: 700 }}> · {t.overdue} overdue</span> : null}
                </Column>
              </Row>
            ))}
          </Section>
          <Text style={{ margin: '8px 0 0', fontSize: 13 }}>
            <Link href={tasksUrl} style={{ color: colors.link }}>
              See every task →
            </Link>
          </Text>
        </>
      ) : null}

      {quiet ? (
        <Text style={{ color: colors.warning, fontSize: 13, fontWeight: 600, margin: '20px 0 0' }}>
          {quiet} open deal{quiet === 1 ? ' has' : 's have'} had no activity for a week.{' '}
          <Link href={todayUrl} style={{ color: colors.link, fontWeight: 600 }}>
            See who to follow up →
          </Link>
        </Text>
      ) : null}
      <div style={{ height: 24 }} />
    </Shell>
  )
}

export default WeeklySummary
