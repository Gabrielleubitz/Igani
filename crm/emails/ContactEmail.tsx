import { Text } from '@react-email/components'
import * as React from 'react'
import { Shell } from './Shell'
import { colors } from './theme'

export interface ContactEmailProps {
  subject: string
  body: string
  senderName: string
  senderEmail: string
  cta?: { label: string; href: string }
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/** A personal email a teammate writes from the CRM, wrapped in the Igani brand frame. Replies go to the sender. */
export function ContactEmail({ subject, body, senderName, senderEmail, cta, logoUrl, brandName = 'Igani', supportEmail }: ContactEmailProps): React.ReactElement {
  const paragraphs = body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
  return (
    <Shell
      preview={paragraphs[0]?.slice(0, 120) ?? subject}
      eyebrow={`Message from ${brandName}`}
      title={subject}
      logoUrl={logoUrl}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={cta}
      signature={{ name: senderName, detail: `${brandName} · ${senderEmail}` }}
      footerNote={`Sent by ${senderName} at ${brandName}. Reply to this email to reach them directly.`}
    >
      {paragraphs.map((para, i) => (
        <Text key={i} style={{ color: colors.text, fontSize: 15, lineHeight: '25px', whiteSpace: 'pre-wrap', margin: '0 0 18px' }}>
          {para}
        </Text>
      ))}
      {cta ? <div style={{ height: 6 }} /> : null}
    </Shell>
  )
}

export default ContactEmail
