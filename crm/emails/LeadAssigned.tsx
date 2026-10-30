import { Text } from '@react-email/components'
import * as React from 'react'
import { p, Shell } from './Shell'
import { colors } from './theme'

export interface LeadAssignedProps {
  repName: string
  leadName: string
  leadEmail: string
  company?: string | null
  source: string
  leadUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function LeadAssigned({ repName, leadName, leadEmail, company, source, leadUrl, logoUrl, brandName, supportEmail }: LeadAssignedProps): React.ReactElement {
  return (
    <Shell preview={`New lead assigned: ${leadName}`} eyebrow="New lead" title={`${leadName} is yours`} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: leadUrl, label: 'Open contact' }}>
      <Text style={p}>
        Hi {repName}, a lead was assigned to you: <strong style={{ color: colors.text }}>{leadName}</strong> ({leadEmail}){company ? ` at ${company}` : ''}, source: {source}. Reach out soon.
      </Text>
    </Shell>
  )
}

export default LeadAssigned
