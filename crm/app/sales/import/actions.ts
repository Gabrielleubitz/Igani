'use server'

import { z } from 'zod'
import { toActionError, type ActionResult } from '@/app/actions/result'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { findExistingLead, ingestLead, leadPayloadSchema } from '@/lib/leads'
import { canSeeLead } from '@/lib/lead-access'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

const MAX_ROWS = 2000
const rowsSchema = z.array(z.object({ email: z.string().optional(), phone: z.string().optional() }).passthrough()).max(MAX_ROWS)

type Row = z.infer<typeof leadPayloadSchema>

export interface ImportPreview {
  total: number
  fresh: number
  /** Rows matching contacts you can see (by email or phone): row keys = email or phone as written in the file */
  duplicates: string[]
  /** Rows matching contacts owned by a teammate: these are skipped and not shown */
  hidden: number
  invalid: { email: string; reason: string }[]
}

const rowKey = (r: { email?: string; phone?: string }): string => r.email ?? r.phone ?? ''

function parse(rows: unknown): { ok: Row[]; invalid: { email: string; reason: string }[] } {
  const ok: Row[] = []
  const invalid: { email: string; reason: string }[] = []
  for (const r of rowsSchema.parse(rows)) {
    const p = leadPayloadSchema.safeParse({ ...r, source: (r as { source?: string }).source ?? 'CSV import' })
    if (p.success) ok.push(p.data)
    else invalid.push({ email: rowKey(r), reason: p.error.issues[0]?.message ?? 'Invalid' })
  }
  return { ok, invalid }
}

/** Match every row the same way the website forms do (email, else phone), and note whether the user may see the match. */
async function classify(ok: Row[], user: SessionUser): Promise<{ row: Row; match: { id: string; assignedToId: string | null } | null; visible: boolean }[]> {
  const out = []
  for (const row of ok) {
    const match = await findExistingLead(prisma, row.email, row.phone)
    out.push({ row, match, visible: match ? canSeeLead(user, match) : true })
  }
  return out
}

/** Dry run: report how many rows are new vs. already in the CRM. Writes nothing. Never reveals teammates' contacts. */
export async function previewLeadImport(rows: unknown): Promise<ActionResult<ImportPreview>> {
  try {
    const user = await requireUser()
    const { ok, invalid } = parse(rows)
    const c = await classify(ok, user)
    return {
      ok: true,
      data: {
        total: ok.length + invalid.length,
        fresh: c.filter((x) => !x.match).length,
        duplicates: c.filter((x) => x.match && x.visible).map((x) => rowKey(x.row)),
        hidden: c.filter((x) => x.match && !x.visible).length,
        invalid,
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

/** Commit. Rows matching a contact are skipped, or merged (blanks filled, message appended) when mode = 'merge' — only for contacts you can see. */
export async function commitLeadImport(rows: unknown, mode: 'skip' | 'merge'): Promise<ActionResult<{ created: number; merged: number; skipped: number }>> {
  try {
    const user = await requireUser()
    const { ok } = parse(rows)
    const c = await classify(ok, user)
    let created = 0
    let merged = 0
    let skipped = 0
    for (const { row, match, visible } of c) {
      if (match && (mode === 'skip' || !visible)) {
        skipped++
        continue
      }
      const res = await ingestLead(row)
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
