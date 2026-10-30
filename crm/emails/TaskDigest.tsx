import { Link, Text } from '@react-email/components'
import * as React from 'react'
import { p, Shell } from './Shell'
import { colors } from './theme'

export interface TaskDigestProps {
  name: string
  tasks: { title: string; due: string; overdue: boolean; url: string }[]
  tasksUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function TaskDigest({ name, tasks, tasksUrl, logoUrl, brandName, supportEmail }: TaskDigestProps): React.ReactElement {
  const n = tasks.length
  return (
    <Shell preview={`${n} task${n === 1 ? '' : 's'} need attention`} eyebrow="Daily reminder" title={`${n} task${n === 1 ? '' : 's'} need attention`} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: tasksUrl, label: 'Open tasks' }}>
      <Text style={p}>Hi {name},</Text>
      {tasks.map((t) => (
        <Text key={t.url + t.title} style={{ ...p, backgroundColor: colors.panel, border: `1px solid ${colors.border}`, borderLeft: `4px solid ${t.overdue ? colors.danger : colors.accent}`, borderRadius: 10, padding: '10px 14px', margin: '0 0 10px' }}>
          <Link href={t.url} style={{ color: colors.text, fontWeight: 600 }}>{t.title}</Link>
          <br />
          <span style={{ color: t.overdue ? colors.danger : colors.muted }}>{t.due}</span>
        </Text>
      ))}
      <Text style={{ ...p, margin: '0 0 8px' }} />
    </Shell>
  )
}

export default TaskDigest
