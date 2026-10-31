import * as React from 'react'
import { DetailCard, Shell } from './Shell'

export interface LeadsImportedProps {
  addedBy: string
  count: number
  /** First few new leads, for a glance. */
  sample: { name: string; detail?: string | null }[]
  leadsUrl: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** Admin alert when a teammate imports several leads at once: one summary, not one email per lead. */
export function LeadsImported({ addedBy, count, sample, leadsUrl, logoUrl, brandName = 'Igani', supportEmail }: LeadsImportedProps): React.ReactElement {
  const more = count - sample.length
  return (
    <Shell
      preview={`${addedBy} imported ${count} new lead${count === 1 ? '' : 's'}`}
      eyebrow="New leads from your team"
      tone="success"
      title={`${addedBy} imported ${count} new lead${count === 1 ? '' : 's'}`}
      intro="They're in the CRM now. Leads that already existed were skipped or merged and aren't counted here."
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={{ href: leadsUrl, label: 'Open leads' }}
      footerNote={`You get this because you're an admin of ${brandName} CRM, or your address is under Settings → Notification emails.`}
    >
      <DetailCard
        rows={[
          { label: 'Added by', value: addedBy },
          { label: 'New leads', value: String(count) },
          ...sample.map((s) => ({ label: s.name, value: s.detail || '—' })),
          ...(more > 0 ? [{ label: `…and ${more} more`, value: '' }] : []),
        ]}
      />
    </Shell>
  )
}

export default LeadsImported
