/**
 * "To" label for an email shown on a lead. A message addressed to several clients is filed under each of them, so when this
 * lead is among the recipients (To or Cc) only the lead's own name is shown, never the other clients' addresses.
 */
export function recipientLabel(lead: { email: string | null; name: string }, e: { toEmails: string[]; ccEmails: string[] }): string {
  const mine = lead.email?.toLowerCase()
  if (mine && [...e.toEmails, ...e.ccEmails].some((x) => x.toLowerCase() === mine)) return lead.name
  return e.toEmails.join(', ') || '—'
}
