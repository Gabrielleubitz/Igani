import { Column, Link, Row, Section, Text } from '@react-email/components'
import * as React from 'react'
import { Shell } from './Shell'
import { colors } from './theme'

export interface TaskDigestProps {
  name: string
  tasks: { title: string; due: string; overdue: boolean; url: string; contact?: string }[]
  tasksUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function TaskDigest({ name, tasks, tasksUrl, logoUrl, brandName, supportEmail }: TaskDigestProps): React.ReactElement {
  const n = tasks.length
  const overdue = tasks.filter((t) => t.overdue).length
  const summary = [overdue ? `${overdue} overdue` : '', n - overdue ? `${n - overdue} due today` : ''].filter(Boolean).join(' · ')
  return (
    <Shell
      preview={`${summary}: ${tasks.slice(0, 2).map((t) => t.title).join(', ')}`}
      eyebrow="Task reminder"
      tone={overdue ? 'danger' : 'warning'}
      title={`${n} task${n === 1 ? '' : 's'} need${n === 1 ? 's' : ''} you, ${name}`}
      intro={summary}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: tasksUrl, label: 'Open my tasks' }}
      footerNote={`Task reminders from the ${brandName ?? 'Igani'} CRM. You get one email per task.`}
    >
      <Section style={{ border: `1px solid ${colors.border}`, borderRadius: 12, overflow: 'hidden', margin: '0 0 28px' }}>
        {tasks.map((t, i) => (
          <Row key={t.url + t.title} style={{ borderTop: i === 0 ? 'none' : `1px solid ${colors.border}` }}>
            <Column style={{ width: 6, backgroundColor: t.overdue ? colors.danger : colors.warning }} />
            <Column style={{ padding: '14px 18px', verticalAlign: 'top' }}>
              <Link href={t.url} style={{ color: colors.text, fontSize: 15, fontWeight: 600, lineHeight: '22px', textDecoration: 'none' }}>
                {t.title}
              </Link>
              <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '19px', margin: '3px 0 0' }}>
                {t.contact ? <>{t.contact} · </> : null}
                <span style={{ color: t.overdue ? colors.danger : colors.warning, fontWeight: 600 }}>{t.due}</span>
              </Text>
            </Column>
            <Column align="right" style={{ padding: '14px 18px', verticalAlign: 'middle', width: 70 }}>
              <Link href={t.url} style={{ color: colors.accent, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                Open →
              </Link>
            </Column>
          </Row>
        ))}
      </Section>
    </Shell>
  )
}

export default TaskDigest
