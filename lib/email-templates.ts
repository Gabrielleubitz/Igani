/**
 * Igani-branded HTML email templates for admin notifications.
 * Uses brand colors: ink #002040, accent #4080E0, surface #204060, text #E0E0E0
 */

const BRAND = {
  ink: '#002040',
  surface: '#204060',
  accent: '#4080E0',
  accentSoft: '#80A0E0',
  text: '#E0E0E0',
  white: '#ffffff'
}

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://igani.co')
const LOGO_URL = `${SITE_URL.replace(/\/$/, '')}/igani-logo.png`

function wrapIganiLayout(innerContent: string, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0; padding:0; background-color:#0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#0f172a; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 560px; background-color:${BRAND.surface}; border-radius: 12px; overflow: hidden; border: 1px solid ${BRAND.accentSoft};">
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, ${BRAND.ink} 0%, ${BRAND.surface} 100%); text-align: center; border-bottom: 2px solid ${BRAND.accent};">
              <img src="${LOGO_URL}" alt="IGANI" width="140" height="44" style="display: inline-block; max-width: 140px; height: auto;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 28px 32px; color: ${BRAND.text}; font-size: 15px; line-height: 1.6;">
              ${innerContent}
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 32px; background-color: ${BRAND.ink}; color: #94a3b8; font-size: 12px; text-align: center;">
              This is an automated notification from IGANI. View in <a href="${SITE_URL}/admin" style="color: ${BRAND.accentSoft};">Admin Panel</a>.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function fieldRow(label: string, value: string): string {
  if (value === undefined || value === null || String(value).trim() === '') return ''
  return `
    <tr>
      <td style="padding: 8px 0 4px; color: ${BRAND.accentSoft}; font-size: 12px; font-weight: 600; text-transform: uppercase;">${escapeHtml(label)}</td>
    </tr>
    <tr>
      <td style="padding: 0 0 12px; color: ${BRAND.text}; font-size: 15px;">${escapeHtml(String(value)).replace(/\n/g, '<br>')}</td>
    </tr>
  `
}

export interface NotificationFields {
  label: string
  value: string
}

/**
 * Build an Igani-styled notification email body.
 */
export function buildIganiNotificationEmail(
  title: string,
  subtitle: string,
  fields: NotificationFields[]
): string {
  const rows = fields
    .filter((f) => f.value !== undefined && f.value !== null && String(f.value).trim() !== '')
    .map((f) => fieldRow(f.label, f.value))
    .join('')

  const inner = `
    <h2 style="margin: 0 0 8px; color: ${BRAND.white}; font-size: 20px; font-weight: 700;">${escapeHtml(title)}</h2>
    <p style="margin: 0 0 20px; color: ${BRAND.accentSoft}; font-size: 14px;">${escapeHtml(subtitle)}</p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      ${rows}
    </table>
  `
  return wrapIganiLayout(inner, title)
}

/** Contact / inquiry submission */
export function buildContactNotificationEmail(data: {
  firstName: string
  lastName: string
  email: string
  projectType: string
  message: string
}): string {
  return buildIganiNotificationEmail(
    'New contact form submission',
    'Someone submitted the contact form on your site.',
    [
      { label: 'Name', value: `${data.firstName} ${data.lastName}`.trim() },
      { label: 'Email', value: data.email },
      { label: 'Project type', value: data.projectType },
      { label: 'Message', value: data.message }
    ]
  )
}

/** Funnel form submission (same shape as contact after transform) */
export function buildFunnelNotificationEmail(data: {
  firstName: string
  lastName: string
  email: string
  projectType: string
  message: string
}): string {
  return buildIganiNotificationEmail(
    'New funnel / landing page lead',
    'A lead was captured from a funnel or landing page.',
    [
      { label: 'Name', value: `${data.firstName} ${data.lastName}`.trim() },
      { label: 'Email', value: data.email },
      { label: 'Project type', value: data.projectType },
      { label: 'Message', value: data.message }
    ]
  )
}

/** Help / support inquiry */
export function buildHelpNotificationEmail(data: {
  name: string
  email: string
  product: string
  productSlug?: string
  productName?: string
  issueType: string
  description: string
  stepsToReproduce?: string
  pageOrFeature?: string
  deviceType?: string
  browser?: string
  source?: string
  attachmentUrl?: string
}): string {
  const fields: NotificationFields[] = [
    { label: 'Name', value: data.name },
    { label: 'Email', value: data.email },
    { label: 'Product', value: data.productName || data.product },
    { label: 'Product slug', value: data.productSlug || '' },
    { label: 'Issue type', value: data.issueType },
    { label: 'Description', value: data.description },
    { label: 'Steps to reproduce', value: data.stepsToReproduce || '' },
    { label: 'Page / feature', value: data.pageOrFeature || '' },
    { label: 'Device', value: data.deviceType || '' },
    { label: 'Browser', value: data.browser || '' },
    { label: 'Source', value: data.source || '' },
    { label: 'Attachment', value: data.attachmentUrl ? 'Yes (view in admin)' : '' }
  ]
  return buildIganiNotificationEmail(
    'New Help & Support inquiry',
    `Product: ${data.productName || data.product}. Issue: ${data.issueType}.`,
    fields
  )
}

/** Lead capture (e.g. from main site or landing) */
export function buildLeadNotificationEmail(data: {
  name: string
  email: string
  phone?: string
  source?: string
  message?: string
  sourceDetails?: Record<string, unknown>
}): string {
  const fields: NotificationFields[] = [
    { label: 'Name', value: data.name },
    { label: 'Email', value: data.email },
    { label: 'Phone', value: data.phone || '' },
    { label: 'Source', value: data.source || 'main_site' },
    { label: 'Message', value: data.message || '' }
  ]
  if (data.sourceDetails && Object.keys(data.sourceDetails).length > 0) {
    fields.push({
      label: 'Source details',
      value: JSON.stringify(data.sourceDetails, null, 2)
    })
  }
  return buildIganiNotificationEmail(
    'New lead captured',
    'A new lead was added from your site or funnel.',
    fields
  )
}
