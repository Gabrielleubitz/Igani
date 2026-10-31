'use server'

import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { ingestLead, leadPayloadSchema } from '@/lib/leads'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const MAX_ROWS = 2000
const rowsSchema = z.array(z.object({ email: z.string() }).passthrough()).max(MAX_ROWS)
/** CSV rows must have an email (it is how duplicates are matched). */
const csvLeadSchema = leadPayloadSchema.and(z.object({ email: z.string().email() }))

export interface ImportPreview {
  total: number
  fresh: number
  duplicates: string[] // emails already in the CRM
  invalid: { email: string; reason: string }[]
}

function parse(rows: unknown): { ok: (z.infer<typeof leadPayloadSchema> & { email: string })[]; invalid: { email: string; reason: string }[] } {
  const ok: (z.infer<typeof leadPayloadSchema> & { email: string })[] = []
  const invalid: { email: string; reason: string }[] = []
  for (const r of rowsSchema.parse(rows)) {
    const p = csvLeadSchema.safeParse({ ...r, source: (r as { source?: string }).source ?? 'csv-import' })
    if (p.success) ok.push(p.data)
    else invalid.push({ email: r.email, reason: p.error.issues[0]?.message ?? 'Invalid' })
  }
  return { ok, invalid }
}

/** Dry run: report how many rows are new vs. already in the CRM. Writes nothing. */
export async function previewLeadImport(rows: unknown): Promise<ActionResult<ImportPreview>> {
  try {
    await requireUser()
    const { ok, invalid } = parse(rows)
    const existing = await prisma.lead.findMany({ where: { email: { in: ok.map((o) => o.email) } }, select: { email: true } })
    const have = new Set(existing.flatMap((e) => (e.email ? [e.email] : [])))
    return { ok: true, data: { total: ok.length + invalid.length, fresh: ok.filter((o) => !have.has(o.email)).length, duplicates: [...have], invalid } }
  } catch (err) {
    return toActionError(err)
  }
}

/** Commit. Duplicates (by email) are skipped, or merged (blanks filled, message appended) when mode = 'merge'. */
export async function commitLeadImport(rows: unknown, mode: 'skip' | 'merge'): Promise<ActionResult<{ created: number; merged: number; skipped: number }>> {
  try {
    const user = await requireUser()
    const { ok } = parse(rows)
    const existing = await prisma.lead.findMany({ where: { email: { in: ok.map((o) => o.email) } }, select: { email: true } })
    const have = new Set(existing.flatMap((e) => (e.email ? [e.email] : [])))
    let created = 0
    let merged = 0
    let skipped = 0
    for (const p of ok) {
      if (have.has(p.email) && mode === 'skip') {
        skipped++
        continue
      }
      const res = await ingestLead(p)
      // A rep's own import belongs to them; admin/marketing imports stay unassigned for routing.
      if (res.created && user.role === 'SALES') await prisma.lead.update({ where: { id: res.leadId }, data: { assignedToId: user.id } })
      if (res.created) created++
      else merged++
    }
    await logActivity({ entityType: 'LEAD', entityId: 'import', actorId: user.id, action: 'leads.imported', metadata: { created, merged, skipped, mode } })
    revalidatePath('/sales', 'layout')
    return { ok: true, data: { created, merged, skipped } }
  } catch (err) {
    return toActionError(err)
  }
}
