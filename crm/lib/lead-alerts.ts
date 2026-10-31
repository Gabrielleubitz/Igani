// Pure helpers for the "new lead" alert emails (no server-only/prisma imports, so they're unit-testable).

/**
 * Who hears about a new lead: every active admin plus any extra addresses in Settings → Notifications,
 * minus the person who added it (they already know). De-duplicated, case-insensitive.
 */
export function newLeadRecipients(args: { adminEmails: string[]; extraEmails: string[]; exceptEmail?: string | null }): string[] {
  const skip = args.exceptEmail?.trim().toLowerCase()
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of [...args.adminEmails, ...args.extraEmails]) {
    const email = raw.trim().toLowerCase()
    if (!email.includes('@') || email === skip || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

/** Subject of the alert: "New lead from Dana" when a teammate added it, otherwise the lead's own name. */
export function newLeadSubject(a: { addedBy?: string | null; leadName: string; company?: string | null }): string {
  return a.addedBy ? `New lead from ${a.addedBy}` : `New lead: ${a.leadName}${a.company ? ` (${a.company})` : ''}`
}

/** Subject when a teammate imports several leads at once: one email, not one per lead. */
export function importedLeadsSubject(a: { addedBy: string; count: number }): string {
  return a.count === 1 ? `New lead from ${a.addedBy}` : `${a.count} new leads from ${a.addedBy}`
}
