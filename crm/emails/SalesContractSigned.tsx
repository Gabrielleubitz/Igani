import * as React from 'react'
import { DetailCard, Shell } from './Shell'

export interface SalesContractSignedProps {
  /** rep = receipt for the salesman; admin = copy for the Igani admin who created the link */
  audience: 'rep' | 'admin'
  repName: string
  adminName: string
  effectiveDate: string
  signedAt: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function SalesContractSigned(p: SalesContractSignedProps): React.ReactElement {
  const admin = p.audience === 'admin'
  return (
    <Shell
      preview={admin ? `${p.repName} signed the sales commission agreement. Signed PDF attached.` : 'Your sales commission agreement is signed. A copy is attached.'}
      eyebrow="Agreement signed"
      tone="success"
      icon="✓"
      title={admin ? `${p.repName} signed the commission agreement` : `Thank you, ${p.repName.split(' ')[0]}. It's signed.`}
      intro={admin ? 'The signed PDF (both signatures, timestamps and audit trail) is attached. It is not stored on the website, so please keep this email.' : 'The signed agreement is attached. Please keep this email: it is not stored on our website.'}
      logoUrl={p.logoUrl}
      brandName={p.brandName}
      supportEmail={p.supportEmail}
      footerNote="You're receiving this because a sales commission agreement was signed with Igani."
    >
      <DetailCard
        rows={[
          { label: 'Representative', value: p.repName },
          { label: 'Igani signatory', value: p.adminName },
          { label: 'Effective date', value: p.effectiveDate },
          { label: 'Signed', value: p.signedAt },
        ]}
      />
    </Shell>
  )
}

export default SalesContractSigned
