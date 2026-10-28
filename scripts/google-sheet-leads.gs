/**
 * IGANI leads → Google Sheet
 *
 * Setup (once):
 * 1. Create a Google Sheet. Extensions → Apps Script. Replace the code with this file.
 * 2. Change SECRET below to any long random text.
 * 3. Deploy → New deployment → type "Web app". Execute as: Me. Who has access: Anyone. Deploy, allow access.
 * 4. Copy the web app URL. In Vercel add GOOGLE_SHEET_WEBHOOK_URL (that URL) and
 *    GOOGLE_SHEET_SECRET (the same SECRET), then redeploy.
 */

const SECRET = 'change-me'
const HEADERS = ['Date', 'Name', 'Phone', 'Email', 'Source', 'Page', 'Form', 'Campaign', 'Details']

function doPost(e) {
  const body = JSON.parse(e.postData.contents || '{}')
  if (body.secret !== SECRET) return json({ ok: false, error: 'unauthorized' })

  const lock = LockService.getScriptLock()
  lock.waitLock(10000)
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0]
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS)
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold')
      sheet.setFrozenRows(1)
    }
    const l = body.lead || {}
    sheet.appendRow([
      l.submittedAt ? new Date(l.submittedAt) : new Date(),
      l.name || '',
      // Leading apostrophe keeps "+972…" as text instead of a formula/number
      l.phone ? "'" + l.phone : '',
      l.email || '',
      l.source || '',
      l.page || '',
      l.form || '',
      l.campaign || '',
      l.message || '',
    ])
  } finally {
    lock.releaseLock()
  }
  return json({ ok: true })
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON)
}
