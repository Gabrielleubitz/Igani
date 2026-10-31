import * as React from 'react'
import { DetailCard, PersonHeader, Quote, Shell } from './Shell'

export interface NewLeadAlertProps {
  leadName: string
  leadEmail?: string | null
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
      preview={`New lead: ${leadName}${company ? ` from ${company}` : ''}${budget ? ` · ${budget}` : ''}`}
      eyebrow="New inbound lead"
      tone="success"
      title="A new lead just came in"
      intro={owner ? <>Assigned to {owner} automatically.</> : 'Nobody owns it yet, so the first teammate to claim it gets it.'}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: leadUrl, label: owner ? 'Open in CRM' : 'Open & claim' }}
      footerNote={`You get this because your address is in ${brandName} CRM → Settings → Notification emails.`}
    >
      <PersonHeader name={leadName} sub={[company, leadEmail ?? phone].filter(Boolean).join(' · ') || undefined} />
      <DetailCard
        rows={[
          ...(phone ? [{ label: 'Phone', value: phone }] : []),
          ...(budget ? [{ label: 'Budget', value: budget }] : []),
          { label: 'Source', value: campaign ? `${source} · ${campaign}` : source },
          { label: 'Owner', value: owner ?? 'Unassigned' },
        ]}
      />
      {message ? <Quote label="Their message">{message.length > 800 ? `${message.slice(0, 800)}…` : message}</Quote> : null}
    </Shell>
  )
}

export default NewLeadAlert
