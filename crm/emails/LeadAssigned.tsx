import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Quote, Shell } from './Shell'

export interface LeadAssignedProps {
  repName: string
  leadName: string
  leadEmail: string
  company?: string | null
  source: string
  phone?: string | null
  message?: string | null
  leadUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function LeadAssigned({ repName, leadName, leadEmail, company, source, phone, message, leadUrl, logoUrl, brandName, supportEmail }: LeadAssignedProps): React.ReactElement {
  return (
    <Shell preview={`New lead assigned: ${leadName}`} eyebrow="New lead" tone="success" title={`${leadName} is yours`} logoUrl={logoUrl} brandName={brandName} supportEmail={supportEmail} cta={{ href: leadUrl, label: 'Open contact' }} ctaHint="Leads contacted within the first hour are far more likely to convert.">
      <Text style={p}>Hi {repName}, a new lead was just assigned to you. Here is what we know so far:</Text>
      <DetailCard
        rows={[
          { label: 'Name', value: leadName },
          { label: 'Email', value: leadEmail },
          ...(phone ? [{ label: 'Phone', value: phone }] : []),
          ...(company ? [{ label: 'Company', value: company }] : []),
          { label: 'Source', value: source },
        ]}
      />
      {message ? <Quote>{message.length > 600 ? `${message.slice(0, 600)}…` : message}</Quote> : null}
    </Shell>
  )
}

export default LeadAssigned
