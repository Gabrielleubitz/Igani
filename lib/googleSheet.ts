/**
 * Adds each lead as a row in the "IGANI Leads" Google Sheet by submitting it,
 * server-side, to a Google Form linked to that sheet. Visitors never see the form.
 * Never throws: a sheet problem must not lose the lead.
 */

const FORM_ID = process.env.GOOGLE_LEADS_FORM_ID || '1FAIpQLSdBAlaT9KPfwft8ZdPIMDU9IkNpNhzozG4QdjbaIbKNdaekMA'

// Field ids of the form's questions (Google calls them entry.<id>)
const FIELDS = {
  name: 'entry.439823023',
  phone: 'entry.1799558708',
  email: 'entry.881516090',
  source: 'entry.1074676136',
  page: 'entry.241847088',
  form: 'entry.1336673172',
  campaign: 'entry.1132561936',
  details: 'entry.28042727',
}

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

async function submit(values: Record<string, string | undefined>) {
  const body = new URLSearchParams()
  for (const [key, value] of Object.entries(values)) if (value) body.set(key, value)
  return fetch(`https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`, {
    method: 'POST',
    body,
    redirect: 'manual',
    signal: AbortSignal.timeout(8000),
  })
}

export async function appendLeadToSheet(lead: SheetLead): Promise<boolean> {
  if (!FORM_ID) return false
  const base = {
    [FIELDS.name]: lead.name,
    // Leading apostrophe keeps "+972…" as text in the sheet
    [FIELDS.phone]: lead.phone ? `'${lead.phone}` : undefined,
    [FIELDS.email]: lead.email,
    [FIELDS.details]: lead.message,
  }
  try {
    let res = await submit({
      ...base,
      [FIELDS.page]: lead.page,
      [FIELDS.source]: lead.source,
      [FIELDS.form]: lead.form,
      [FIELDS.campaign]: lead.campaign,
    })
    // Multiple-choice questions reject values that aren't one of their options:
    // resend with that information folded into the free-text Page field
    if (res.status === 400) {
      res = await submit({
        ...base,
        [FIELDS.page]: [lead.page, lead.form, lead.campaign, lead.source].filter(Boolean).join(' · '),
      })
    }
    if (res.status >= 400) {
      console.error('Google Sheet append failed:', res.status)
      return false
    }
    return true
  } catch (error) {
    console.error('Google Sheet append error:', error)
    return false
  }
}
