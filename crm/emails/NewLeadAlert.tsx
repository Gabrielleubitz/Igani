import { Text } from '@react-email/components'
import * as React from 'react'
import { DetailCard, p, Quote, Shell } from './Shell'

export interface NewLeadAlertProps {
  leadName: string
  leadEmail: string
  phone?: string | null
  company?: string | null
  budget?: string | null
  source: string
  campaign?: string | null
  message?: string | null
  owner?: string | null
  leadUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** Team notification for a fresh inbound lead (sent to the "notification emails" in Settings). */
export function NewLeadAlert({ leadName, leadEmail, phone, company, budget, source, campaign, message, owner, leadUrl, logoUrl, brandName = 'Igani', supportEmail }: NewLeadAlertProps): React.ReactElement {
  return (
    <Shell
      preview={`New lead: ${leadName}${company ? ` (${company})` : ''}`}
      eyebrow="New inbound lead"
      tone="success"
      title={`${leadName}${company ? ` from ${company}` : ''}`}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: leadUrl, label: 'Open in CRM' }}
      footerNote={`You get this because your address is in ${brandName} CRM → Settings → Notification emails.`}
    >
      <Text style={p}>A new lead just came in{owner ? ` and was assigned to ${owner}` : ' and is waiting to be claimed'}.</Text>
      <DetailCard
        rows={[
          { label: 'Email', value: leadEmail },
          ...(phone ? [{ label: 'Phone', value: phone }] : []),
          ...(budget ? [{ label: 'Budget', value: budget }] : []),
          { label: 'Source', value: campaign ? `${source} · ${campaign}` : source },
        ]}
      />
      {message ? <Quote>{message.length > 800 ? `${message.slice(0, 800)}…` : message}</Quote> : null}
    </Shell>
  )
}

export default NewLeadAlert
