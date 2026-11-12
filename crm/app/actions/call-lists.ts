'use server'

import type { ProspectStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { IMPORT_MAX_CHARS, ImportFileError, prepareImport } from '@/lib/call-list-import'
import { OPEN_PROSPECT, assertCanUseList, assertCanUseProspect, convertProspect, listScope } from '@/lib/call-lists'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { allPhones, asDetails, askFor, enrichProspect } from '@/lib/prospect-details'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

async function allowedCountries(): Promise<readonly ('IL' | 'US')[]> {
  return getSetting('voice.countries')
}

const refresh = (listId?: string): void => {
  revalidatePath('/sales/call-lists')
  if (listId) revalidatePath(`/sales/call-lists/${listId}`)
}

export interface DialerList {
  id: string
  name: string
  toCall: number
  total: number
  owner: string | null
}

/** The dialer's "Lists" tab: your lists (admins: every list), with how many are left to call. */
export async function dialerCallLists(): Promise<ActionResult<DialerList[]>> {
  try {
    const user = await requireUser([...callers])
    const lists = await prisma.callList.findMany({
      where: listScope(user),
      orderBy: { updatedAt: 'desc' },
      take: 50,
      select: { id: true, name: true, ownerId: true, owner: { select: { name: true, email: true } }, prospects: { select: { status: true } } },
    })
    return {
      ok: true,
      data: lists
        .map((l) => ({
          id: l.id,
          name: l.name,
          total: l.prospects.length,
          toCall: l.prospects.filter((p) => OPEN_PROSPECT.includes(p.status)).length,
          owner: l.ownerId === user.id ? null : l.owner ? (l.owner.name ?? l.owner.email) : 'Nobody',
        }))
        // your own lists with calls left come first
        .sort((a, b) => Number(a.owner !== null) - Number(b.owner !== null) || Number(b.toCall > 0) - Number(a.toCall > 0)),
    }
  } catch (err) {
    return toActionError(err)
  }
}

export interface DialerProspect {
  id: string
  name: string
  phone: string
  display: string
  category: string | null
  status: ProspectStatus
  attempts: number
  lastOutcome: string | null
  /** the person to ask for, from their website */
  askFor: string | null
  /** other numbers we found (direct lines, WhatsApp) */
  otherPhones: { e164: string; display: string; label: string | null }[]
}

/** One list in the dialer: who's left to call. Call-backs first, then the ones tried least. */
export async function dialerProspects(listId: string): Promise<ActionResult<{ name: string; prospects: DialerProspect[]; done: number }>> {
  try {
    const user = await requireUser([...callers])
    const list = await assertCanUseList(z.string().cuid().parse(listId), user)
    const [rows, done] = await Promise.all([
      prisma.prospect.findMany({ where: { listId: list.id, status: { in: OPEN_PROSPECT } }, orderBy: [{ status: 'desc' }, { attempts: 'asc' }, { createdAt: 'asc' }], take: 200 }),
      prisma.prospect.count({ where: { listId: list.id, status: { notIn: OPEN_PROSPECT } } }),
    ])
    return {
      ok: true,
      data: {
        name: list.name,
        done,
        prospects: rows.map((p) => {
          const d = asDetails(p.details)
          return { id: p.id, name: p.name, phone: p.phone, display: formatPhone(p.phone), category: p.category, status: p.status, attempts: p.attempts, lastOutcome: p.lastOutcome, askFor: askFor(d), otherPhones: allPhones(p.phone, d).slice(1, 6) }
        }),
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

export interface ListChoice {
  lists: { id: string; name: string; owner: string | null }[]
  /** Admins can make a list for a teammate */
  teammates: { id: string; name: string }[]
  me: string
}

/** For "Find businesses": the lists you can add to, and (admins) who a new list can be for. */
export async function callListChoices(): Promise<ActionResult<ListChoice>> {
  try {
    const user = await requireUser([...callers])
    const [lists, team] = await Promise.all([
      prisma.callList.findMany({ where: listScope(user), orderBy: { updatedAt: 'desc' }, take: 50, select: { id: true, name: true, ownerId: true, owner: { select: { name: true, email: true } } } }),
      user.role === 'ADMIN' ? prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SALES'] } }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
    ])
    return {
      ok: true,
      data: {
        me: user.id,
        lists: lists.map((l) => ({ id: l.id, name: l.name, owner: l.ownerId === user.id ? null : l.owner ? (l.owner.name ?? l.owner.email) : 'Nobody' })),
        teammates: team.map((t) => ({ id: t.id, name: t.name ?? t.email ?? 'Teammate' })),
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

/** "Make lead" on the list (without a call, e.g. they replied by email). */
export async function makeProspectLead(prospectId: string): Promise<ActionResult<{ leadId: string; created: boolean }>> {
  try {
    const user = await requireUser([...callers])
    const id = z.string().cuid().parse(prospectId)
    const r = await convertProspect(id, user)
    const p = await prisma.prospect.findUnique({ where: { id }, select: { listId: true } })
    refresh(p?.listId)
    revalidatePath('/sales', 'layout')
    return { ok: true, data: r }
  } catch (err) {
    return toActionError(err)
  }
}

const StatusInput = z.object({ prospectId: z.string().cuid(), status: z.enum(['TO_CALL', 'CALLBACK', 'NOT_INTERESTED', 'BAD_NUMBER']) })

/** Mark by hand (skip it, put it back, call back later). Becoming a lead goes through makeProspectLead. */
export async function setProspectStatus(input: z.input<typeof StatusInput>): Promise<ActionResult> {
  try {
    const user = await requireUser([...callers])
    const data = StatusInput.parse(input)
    const p = await assertCanUseProspect(data.prospectId, user)
    if (p.status === 'CONVERTED') throw new BookingError('This one is already a lead.', 'INVALID_STATE')
    await prisma.prospect.update({ where: { id: p.id }, data: { status: data.status } })
    refresh(p.listId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

export async function removeProspect(prospectId: string): Promise<ActionResult> {
  try {
    const user = await requireUser([...callers])
    const p = await assertCanUseProspect(z.string().cuid().parse(prospectId), user)
    await prisma.prospect.delete({ where: { id: p.id } })
    refresh(p.listId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

const ListEdit = z.object({ listId: z.string().cuid(), name: z.string().trim().min(1).max(120).optional(), ownerId: z.string().cuid().optional() })

/** Rename a list; admins can also hand it to another teammate. */
export async function updateCallList(input: z.input<typeof ListEdit>): Promise<ActionResult> {
  try {
    const user = await requireUser([...callers])
    const data = ListEdit.parse(input)
    await assertCanUseList(data.listId, user)
    if (data.ownerId) {
      if (user.role !== 'ADMIN') throw new BookingError('Only admins can hand a list to someone else.', 'FORBIDDEN')
      const owner = await prisma.user.findUnique({ where: { id: data.ownerId }, select: { role: true } })
      if (!owner || owner.role === 'MARKETING') throw new BookingError('Pick a salesperson or admin.', 'INVALID_STATE')
    }
    await prisma.callList.update({ where: { id: data.listId }, data: { ...(data.name ? { name: data.name } : {}), ...(data.ownerId ? { ownerId: data.ownerId } : {}) } })
    refresh(data.listId)
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Delete a list and the businesses on it. Leads it already made stay. */
export async function deleteCallList(listId: string): Promise<ActionResult> {
  try {
    const user = await requireUser([...callers])
    const list = await assertCanUseList(z.string().cuid().parse(listId), user)
    await prisma.callList.delete({ where: { id: list.id } })
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: 'call_list.deleted', metadata: { listId: list.id, name: list.name } })
    refresh()
    return { ok: true, data: undefined }
  } catch (err) {
    return toActionError(err)
  }
}

/** Read the business's website again (new contacts, numbers, emails). Runs now, up to about a minute. */
export async function refreshProspectDetails(prospectId: string): Promise<ActionResult<{ status: string | null }>> {
  try {
    const user = await requireUser([...callers])
    const p = await assertCanUseProspect(z.string().cuid().parse(prospectId), user)
    if (!p.website) throw new BookingError('This business has no website to read.', 'INVALID_STATE')
    if (p.enrichStatus === 'processing' && p.updatedAt > new Date(Date.now() - 2 * 60_000)) throw new BookingError('Already looking. Give it a minute.', 'INVALID_STATE')
    await prisma.prospect.update({ where: { id: p.id }, data: { enrichStatus: 'pending' } })
    await enrichProspect(p.id)
    const after = await prisma.prospect.findUnique({ where: { id: p.id }, select: { enrichStatus: true } })
    refresh(p.listId)
    return { ok: true, data: { status: after?.enrichStatus ?? null } }
  } catch (err) {
    return toActionError(err)
  }
}

/* ------------------------------------------------------------------------------------------------------------
 * Import a CSV of people to call
 * ---------------------------------------------------------------------------------------------------------- */

const importSchema = z
  .object({
    text: z.string().min(1).max(IMPORT_MAX_CHARS),
    /** add to one of your lists… */
    listId: z.string().cuid().optional(),
    /** …or start a new one (admins can make it for a teammate) */
    newList: z.object({ name: z.string().trim().min(1).max(120), ownerId: z.string().cuid().optional() }).optional(),
  })
  .refine((d) => Boolean(d.listId) !== Boolean(d.newList), { message: 'Pick a call list or name a new one', path: ['listId'] })

export interface CsvImportResult {
  listId: string
  listName: string
  added: number
  /** the number is already a lead */
  alreadyLead: number
  /** the number is already on a call list */
  alreadyOnList: number
  duplicatesInFile: number
  rejected: { line: number; reason: string }[]
  rejectedCount: number
}

/**
 * Put the people in a CSV on a call list. Skipped: numbers we can't dial, numbers that are already a lead or already on a
 * call list (anyone's), and repeats inside the file. A list given to a salesperson is visible to them (and admins) only.
 */
export async function importCsvToCallList(input: z.input<typeof importSchema>): Promise<ActionResult<CsvImportResult>> {
  try {
    const user = await requireUser([...callers])
    const data = importSchema.parse(input)
    let prepared
    try {
      prepared = prepareImport(data.text, await allowedCountries())
    } catch (err) {
      if (err instanceof ImportFileError) throw new BookingError(err.message, 'INVALID_STATE')
      throw err
    }
    if (!prepared.rows.length) throw new BookingError(`None of the ${prepared.total} rows has a number we can call.${prepared.rejected[0] ? ` For example, line ${prepared.rejected[0].line}: ${prepared.rejected[0].reason}` : ''}`, 'INVALID_STATE')

    let ownerId = user.id
    if (data.newList?.ownerId && data.newList.ownerId !== user.id) {
      if (user.role !== 'ADMIN') throw new BookingError('Only admins can make a list for someone else.', 'FORBIDDEN')
      const owner = await prisma.user.findUnique({ where: { id: data.newList.ownerId }, select: { role: true } })
      if (!owner || owner.role === 'MARKETING') throw new BookingError('Pick a salesperson or admin.', 'INVALID_STATE')
      ownerId = data.newList.ownerId
    }
    if (data.listId) await assertCanUseList(data.listId, user)

    const keys = [...new Set(prepared.rows.map((r) => r.phone.replace(/\D/g, '').slice(-8)))]
    const result = await prisma.$transaction(
      async (tx) => {
        // One import at a time, so two uploads of the same file can't both add a number.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('places.import'))`
        const [leads, prospects] = await Promise.all([
          tx.$queryRaw<{ pkey: string }[]>`
            SELECT DISTINCT right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) AS pkey FROM "Lead"
            WHERE phone IS NOT NULL AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ANY(${keys}::text[])`,
          tx.$queryRaw<{ pkey: string }[]>`
            SELECT DISTINCT right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) AS pkey FROM "Prospect"
            WHERE status <> 'CONVERTED' AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 8) = ANY(${keys}::text[])`,
        ])
        const leadKeys = new Set(leads.map((r) => r.pkey))
        const listKeys = new Set(prospects.map((r) => r.pkey))
        const fresh = prepared.rows.filter((r) => {
          const k = r.phone.replace(/\D/g, '').slice(-8)
          return !leadKeys.has(k) && !listKeys.has(k)
        })
        const alreadyLead = prepared.rows.filter((r) => leadKeys.has(r.phone.replace(/\D/g, '').slice(-8))).length
        const alreadyOnList = prepared.rows.length - fresh.length - alreadyLead
        const list = data.listId
          ? await tx.callList.update({ where: { id: data.listId }, data: { updatedAt: new Date() }, select: { id: true, name: true } })
          : await tx.callList.create({ data: { name: data.newList!.name, ownerId }, select: { id: true, name: true } })
        const created = fresh.length
          ? await tx.prospect.createMany({ data: fresh.map((r) => ({ listId: list.id, name: r.name, phone: r.phone, website: r.website, enrichStatus: 'none' })) })
          : { count: 0 }
        return { listId: list.id, listName: list.name, added: created.count, alreadyLead, alreadyOnList }
      },
      { timeout: 30_000 },
    )
    const out: CsvImportResult = {
      ...result,
      duplicatesInFile: prepared.duplicatesInFile,
      rejected: prepared.rejected.slice(0, 20),
      rejectedCount: prepared.rejected.length,
    }
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: 'call_list.csv_import', metadata: { ...result, rows: prepared.total, rejected: prepared.rejected.length, duplicatesInFile: prepared.duplicatesInFile } })
    refresh(result.listId)
    return { ok: true, data: out }
  } catch (err) {
    return toActionError(err)
  }
}
