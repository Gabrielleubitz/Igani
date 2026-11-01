import * as React from 'react'
import { DetailCard, Shell, Steps } from './Shell'

const ROLE_TEXT: Record<string, string> = {
  ADMIN: 'Admin: everything, including team and settings',
  SALES: 'Sales: contacts, pipeline, meetings and tasks',
  MARKETING: 'Marketing: lead sources, campaigns and reports',
}

const ROLE_NAME: Record<string, string> = { ADMIN: 'admin', SALES: 'sales', MARKETING: 'marketing' }

export interface TeamInviteProps {
  role: string
  inviterName: string
  loginUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function TeamInvite({ role, inviterName, loginUrl, logoUrl, brandName = 'Igani', supportEmail }: TeamInviteProps): React.ReactElement {
  return (
    <Shell
      preview={`${inviterName} invited you to the ${brandName} CRM`}
      eyebrow="Team invitation"
      icon="★"
      title={`Join the ${brandName} team CRM`}
      intro={<>{inviterName} added you to the team with <strong>{ROLE_NAME[role] ?? role.toLowerCase()}</strong> access. It takes about a minute to get set up.</>}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: loginUrl, label: 'Accept & sign in with Google' }}
      ctaHint="Use the Google account for this email address. This link is personal, please don't forward it."
      footerNote={`You were invited to the ${brandName} team CRM by ${inviterName}.`}
    >
      <DetailCard rows={[{ label: 'Role', value: ROLE_TEXT[role] ?? role.toLowerCase() }, { label: 'Invited by', value: inviterName }]} />
      <Steps
        title="Getting started"
        steps={[
          { title: 'Sign in with Google', body: 'One click, no new password to remember.' },
          ...(role === 'MARKETING' ? [] : [{ title: 'Set your working hours', body: 'So people can book meetings with you.' }]),
          { title: 'Open Today', body: 'Your daily list of tasks, meetings and leads to follow up.' },
        ]}
      />
    </Shell>
  )
}

export default TeamInvite
