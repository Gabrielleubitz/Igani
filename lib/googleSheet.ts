/**
 * Appends each lead as a row in a Google Sheet, through a small Apps Script
 * web app bound to the sheet (see scripts/google-sheet-leads.gs).
 * Requires GOOGLE_SHEET_WEBHOOK_URL; GOOGLE_SHEET_SECRET must match the script's SECRET.
 * Never throws: a sheet problem must not lose the lead.
 */

const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL
const secret = process.env.GOOGLE_SHEET_SECRET || ''

export type SheetLead = {
  name: string
  email?: string
  phone?: string
  source?: string
  page?: string
  form?: string
  campaign?: string
  message?: string
}

export async function appendLeadToSheet(lead: SheetLead): Promise<boolean> {
  if (!webhookUrl) return false
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, lead: { ...lead, submittedAt: new Date().toISOString() } }),
      // Apps Script answers with a redirect to its response; the row is already written by then
      redirect: 'manual',
      signal: AbortSignal.timeout(8000),
    })
    if (res.status >= 400) {
      console.error('Google Sheet append failed:', res.status, await res.text().catch(() => ''))
      return false
    }
    return true
  } catch (error) {
    console.error('Google Sheet append error:', error)
    return false
  }
}
