import * as React from 'react'
import { DetailCard, PersonHeader, Quote, Shell } from './Shell'

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
    <Shell
      preview={`${leadName}${company ? ` (${company})` : ''} is yours. Reach out while they're warm.`}
      eyebrow="New lead"
      tone="success"
      title={`You have a new lead, ${repName.split(' ')[0]}`}
      intro="They were just assigned to you. Leads contacted within the first hour are far more likely to convert."
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: leadUrl, label: 'Open contact' }}
      links={[{ href: `mailto:${leadEmail}`, label: 'Email them' }, ...(phone ? [{ href: `tel:${phone.replace(/[^\d+]/g, '')}`, label: 'Call them' }] : [])]}
      footerNote={`You're on the ${brandName ?? 'Igani'} sales team, so new leads are routed to you.`}
    >
      <PersonHeader name={leadName} sub={company ?? leadEmail} />
      <DetailCard
        rows={[
          { label: 'Email', value: leadEmail },
          ...(phone ? [{ label: 'Phone', value: phone }] : []),
          ...(company ? [{ label: 'Company', value: company }] : []),
          { label: 'Source', value: source },
        ]}
      />
      {message ? <Quote label="Their message">{message.length > 600 ? `${message.slice(0, 600)}…` : message}</Quote> : null}
    </Shell>
  )
}

export default LeadAssigned
