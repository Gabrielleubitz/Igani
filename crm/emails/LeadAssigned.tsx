import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Shell } from './Shell'

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
      <Text style={p}>Hi {repName}, a new lead was assigned to you. Reach out soon.</Text>
      <DetailCard
        rows={[
          { label: 'Name', value: leadName },
          { label: 'Email', value: leadEmail },
          ...(company ? [{ label: 'Company', value: company }] : []),
          { label: 'Source', value: source },
        ]}
      />
    </Shell>
  )
}

export default LeadAssigned
