'use server'

import type { ProspectStatus } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { OPEN_PROSPECT, assertCanUseList, assertCanUseProspect, convertProspect, listScope } from '@/lib/call-lists'
import { formatPhone } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { allPhones, asDetails, askFor, enrichProspect } from '@/lib/prospect-details'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

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
