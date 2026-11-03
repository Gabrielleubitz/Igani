import * as React from 'react'
import { DetailCard, Shell } from './Shell'

export interface OfferSignedProps {
  /** client = receipt for the person who signed; team = alert for Igani */
  audience: 'client' | 'team'
  lang: 'en' | 'he'
  signerName: string
  clientName: string
  offerTitle: string
  total: string
  monthly: string | null
  yearly?: string | null
  signedAt: string
  offerUrl: string
  /** Team only: the lead in the CRM */
  leadUrl?: string
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

export function OfferSigned(p: OfferSignedProps): React.ReactElement {
  const he = p.lang === 'he'
  if (p.audience === 'team') {
    return (
      <Shell
        preview={`${p.clientName} signed ${p.offerTitle} (${p.total}). Send the down-payment invoice.`}
        eyebrow="Offer signed"
        tone="success"
        icon="✓"
        title={`${p.clientName} signed the offer`}
        intro="The signed PDF is attached and saved on the lead. A task to send the down-payment invoice is waiting for you."
        logoUrl={p.logoUrl}
        brandName={p.brandName}
        supportEmail={p.supportEmail}
        cta={p.leadUrl ? { href: p.leadUrl, label: 'Open the lead' } : undefined}
        links={[{ href: p.offerUrl, label: 'View the offer' }]}
        footerNote="You're receiving this because an Igani offer was signed."
      >
        <DetailCard
          rows={[
            { label: 'Offer', value: p.offerTitle },
            { label: 'Signed by', value: p.signerName },
            { label: 'One-time total', value: p.total },
            ...(p.monthly ? [{ label: 'Monthly', value: `${p.monthly} / month` }] : []),
            ...(p.yearly ? [{ label: 'Yearly', value: `${p.yearly} / year` }] : []),
            { label: 'Signed', value: p.signedAt },
          ]}
        />
      </Shell>
    )
  }
  return (
    <Shell
      lang={p.lang}
      preview={he ? `ההסכם נחתם. עותק חתום מצורף.` : `Your agreement is signed. A signed copy is attached.`}
      eyebrow={he ? 'ההסכם נחתם' : 'Agreement signed'}
      tone="success"
      icon="✓"
      title={he ? `תודה ${p.signerName.split(' ')[0]}, ההסכם נחתם` : `Thank you, ${p.signerName.split(' ')[0]}. It's signed.`}
      intro={he ? 'מצורף עותק חתום של ההסכם. בשלב הבא נשלח אליכם חשבונית למקדמה, ואז מתחילים לעבוד.' : "A signed copy of the agreement is attached. Next we'll send the down-payment invoice, and then we start building."}
      logoUrl={p.logoUrl}
      brandName={p.brandName}
      supportEmail={p.supportEmail}
      cta={{ href: p.offerUrl, label: he ? 'לצפייה בהצעה' : 'View the offer' }}
      footerNote={he ? 'קיבלת הודעה זו כי חתמת על הצעה של Igani.' : "You're receiving this because you signed an Igani offer."}
    >
      <DetailCard
        rows={[
          { label: he ? 'הצעה' : 'Offer', value: p.offerTitle },
          { label: he ? 'סה״כ הקמה' : 'One-time total', value: p.total },
          ...(p.monthly ? [{ label: he ? 'חודשי' : 'Monthly', value: he ? `${p.monthly} לחודש` : `${p.monthly} / month` }] : []),
          ...(p.yearly ? [{ label: he ? 'שנתי' : 'Yearly', value: he ? `${p.yearly} לשנה` : `${p.yearly} / year` }] : []),
          { label: he ? 'נחתם' : 'Signed', value: p.signedAt },
        ]}
      />
    </Shell>
  )
}

export default OfferSigned
