/**
 * Mailjet integration for sending admin notification emails.
 * Requires: MAILJET_API_KEY, MAILJET_SECRET_KEY, and a verified sender email (MAILJET_FROM_EMAIL).
 */

const API_BASE = 'https://api.mailjet.com/v3.1'

const apiKey = process.env.MAILJET_API_KEY
const secretKey = process.env.MAILJET_SECRET_KEY
const fromEmail = process.env.MAILJET_FROM_EMAIL || process.env.MAILJET_SENDER_EMAIL || 'noreply@igani.co'
const fromName = process.env.MAILJET_FROM_NAME || 'IGANI'
// Every admin notification (leads, contact, funnels) goes to all of these. ADMIN_NOTIFY_EMAIL may list several, comma-separated.
export const adminEmails = Array.from(
  new Set(
    [...(process.env.ADMIN_NOTIFY_EMAIL || 'gabrielleubitz@gmail.com').split(','), 'iganileubitz@gmail.com']
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  )
)

export const mailjetConfigured = !!(apiKey && secretKey)

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  htmlPart: string
  textPart?: string
}

/**
 * Send an email via Mailjet API.
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!mailjetConfigured) {
    console.warn('Mailjet: MAILJET_API_KEY or MAILJET_SECRET_KEY not set. Skipping email.')
    return false
  }

  const auth = Buffer.from(`${apiKey}:${secretKey}`).toString('base64')

  const body = {
    Messages: [
      {
        From: { Email: fromEmail, Name: fromName },
        To: (Array.isArray(options.to) ? options.to : [options.to]).map((email) => ({ Email: email, Name: 'Admin' })),
        Subject: options.subject,
        HTMLPart: options.htmlPart,
        ...(options.textPart && { TextPart: options.textPart })
      }
    ]
  }

  try {
    const res = await fetch(`${API_BASE}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`
      },
      body: JSON.stringify(body)
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Mailjet send error:', res.status, err)
      return false
    }
    return true
  } catch (error) {
    console.error('Mailjet send error:', error)
    return false
  }
}

/**
 * Send a notification email to the admins (ADMIN_NOTIFY_EMAIL plus iganileubitz@gmail.com).
 */
export async function sendAdminNotification(
  subject: string,
  htmlPart: string,
  textPart?: string
): Promise<boolean> {
  return sendEmail({
    to: adminEmails,
    subject,
    htmlPart,
    textPart
  })
}
