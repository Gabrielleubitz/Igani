import { Text } from '@react-email/components'
import * as React from 'react'
import { p, Shell } from './Shell'
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
    <Shell preview={`${inviterName} invited you to the ${brandName} CRM`} eyebrow="Team invitation" title={`Join the ${brandName} CRM`} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: loginUrl, label: 'Accept invitation & sign in' }}>
      <Text style={p}>
        {inviterName} added you to the {brandName} CRM as <strong style={{ color: colors.text }}>{role.toLowerCase()}</strong>. Sign in with this Google account to get started.
      </Text>
    </Shell>
  )
}

export default TeamInvite
