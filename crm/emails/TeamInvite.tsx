import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'

const ROLE_TEXT: Record<string, string> = {
  ADMIN: 'Admin: everything, including team and settings',
  SALES: 'Sales: contacts, pipeline, meetings and tasks',
  MARKETING: 'Marketing: lead sources, campaigns and reports',
}
import { colors } from './theme'

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
    <Shell preview={`${inviterName} invited you to the ${brandName} CRM`} eyebrow="Team invitation" title={`Join the ${brandName} CRM`} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: loginUrl, label: 'Accept invitation & sign in' }} ctaHint="Use the Google account for this email address. The link is personal, please don't forward it." footerNote={`You were invited to the ${brandName} team CRM by ${inviterName}.`}>
      <Text style={p}>
        {inviterName} added you to the {brandName} CRM as <strong style={{ color: colors.text }}>{role.toLowerCase()}</strong>. Sign in with this Google account to get started.
      </Text>
      <DetailCard rows={[{ label: 'Role', value: ROLE_TEXT[role] ?? role.toLowerCase() }, { label: 'Invited by', value: inviterName }]} />
    </Shell>
  )
}

export default TeamInvite
