import { Text } from '@react-email/components'
import * as React from 'react'
import { Shell } from './Shell'
import { colors } from './theme'

export interface ContactEmailProps {
  subject: string
  body: string
  senderName: string
  senderEmail: string
  /** the sender's photo (public URL); initials when absent */
  senderPhotoUrl?: string | null
  cta?: { label: string; href: string }
  /** The email being replied to, shown quoted under the message */
  quote?: { from: string; sentAt: string; text: string }
  /** 'he' sends the email right-to-left in Hebrew */
  lang?: 'en' | 'he'
  logoUrl: string
  brandName?: string
  supportEmail?: string
}

/**
 * A personal email a teammate writes from the CRM. Deliberately letter-like (no status chip noise, no icon):
 * personal emails read best when they look written by a person, framed lightly by the brand.
 */
export function ContactEmail({ subject, body, senderName, senderEmail, senderPhotoUrl, cta, quote, lang = 'en', logoUrl, brandName = 'Igani', supportEmail }: ContactEmailProps): React.ReactElement {
  const he = lang === 'he'
  const paragraphs = body.split(/\n{2,}/).map((x) => x.trim()).filter(Boolean)
  return (
    <Shell
      preview={paragraphs.find((x) => !/^(hi|hello|hey)\b/i.test(x))?.slice(0, 140) ?? subject}
      eyebrow={brandName}
      title={subject}
      logoUrl={logoUrl}
      lang={lang}
      brandName={brandName}
      supportEmail={supportEmail}
      cta={cta}
      signature={{ name: senderName, detail: `${brandName} · ${senderEmail}`, photoUrl: senderPhotoUrl }}
      footerNote={he ? `נשלח על ידי ${senderName} מ-${brandName}. אפשר להשיב להודעה זו כדי ליצור קשר ישיר.` : `Sent by ${senderName} at ${brandName}. Reply to this email to reach them directly.`}
    >
      {paragraphs.map((para, i) => (
        <Text key={i} style={{ color: colors.text, fontSize: 16, lineHeight: '27px', whiteSpace: 'pre-wrap', margin: '0 0 18px' }}>
          {para}
        </Text>
      ))}
      {cta ? <div style={{ height: 8 }} /> : null}
      {quote ? (
        <Text style={{ color: colors.muted, fontSize: 13, lineHeight: '20px', whiteSpace: 'pre-wrap', ...(he ? { borderRight: `3px solid ${colors.border}`, padding: '4px 14px 4px 0' } : { borderLeft: `3px solid ${colors.border}`, padding: '4px 0 4px 14px' }), margin: '8px 0 0' }}>
          {he ? `ב-${quote.sentAt}, ${quote.from} כתב/ה:` : `On ${quote.sentAt}, ${quote.from} wrote:`}
          {'\n'}
          {quote.text.length > 1500 ? `${quote.text.slice(0, 1500)}…` : quote.text}
        </Text>
      ) : null}
    </Shell>
  )
}

export default ContactEmail
