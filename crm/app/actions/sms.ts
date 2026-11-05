'use server'

import { z } from 'zod'
import { requireUser } from '@/lib/auth'
import { identifyNumber } from '@/lib/caller-id'
import { leadName } from '@/lib/format'
import { formatPhone, toE164 } from '@/lib/phone-numbers'
import { prisma } from '@/lib/prisma'
import { sendSms } from '@/lib/sms'
import { SMS_MAX } from '@/lib/sms-core'
import { toActionError, type ActionResult } from './result'

const callers = ['ADMIN', 'SALES'] as const

export interface SmsThread {
  number: string
  display: string
  name: string | null
  /** the business or list under the name */
  subtitle: string | null
  leadId: string | null
  last: { body: string; direction: 'INBOUND' | 'OUTBOUND'; at: string; status: string; media: number }
  unread: number
}

export interface SmsBubble {
  id: string
  direction: 'INBOUND' | 'OUTBOUND'
  body: string
  media: number
  status: string
  error: string | null
  at: string
}

export interface SmsConversation {
  number: string
  display: string
  name: string | null
  subtitle: string | null
  leadId: string | null
  /** another rep's contact: you can read what they sent to your line, but not text back */
  blocked: string | null
  messages: SmsBubble[]
}

/** Your conversations, newest first: one per number, with the last message and how many are unread. */
export async function smsThreads(): Promise<ActionResult<SmsThread[]>> {
  try {
    const user = await requireUser([...callers])
    const latest = await prisma.$queryRaw<{ id: string }[]>`
      SELECT DISTINCT ON ("otherNumber") id FROM "SmsMessage" WHERE "userId" = ${user.id}
      ORDER BY "otherNumber", "createdAt" DESC`
    const [rows, unread] = await Promise.all([
      prisma.smsMessage.findMany({
        where: { id: { in: latest.map((r) => r.id) } },
        orderBy: { createdAt: 'desc' },
        take: 60,
        include: { lead: { select: { id: true, firstName: true, lastName: true, email: true, company: true } } },
      }),
      prisma.smsMessage.groupBy({ by: ['otherNumber'], where: { userId: user.id, direction: 'INBOUND', readAt: null }, _count: { _all: true } }),
    ])
    const unreadBy = new Map(unread.map((u) => [u.otherNumber, u._count._all]))
    const data = await Promise.all(
      rows.map(async (m): Promise<SmsThread> => {
        // a contact's name, else whoever the number belongs to (call list, Google listing); never asks Google here
        const who = m.lead ? null : await identifyNumber(m.otherNumber, user).catch(() => null)
        return {
          number: m.otherNumber,
          display: /^\+\d+$/.test(m.otherNumber) ? formatPhone(m.otherNumber) : m.otherNumber,
          name: m.lead ? leadName(m.lead) : (who?.title ?? null),
          subtitle: m.lead ? ([m.lead.firstName, m.lead.lastName].some(Boolean) ? m.lead.company : null) : (who?.subtitle ?? null),
          leadId: m.lead?.id ?? null,
          last: { body: m.body, direction: m.direction, at: m.createdAt.toISOString(), status: m.status, media: m.media },
          unread: unreadBy.get(m.otherNumber) ?? 0,
        }
      }),
    )
    return { ok: true, data }
  } catch (err) {
    return toActionError(err)
  }
}

/** Unread texts on your line (the badge on the phone button). */
export async function smsUnread(): Promise<ActionResult<number>> {
  try {
    const user = await requireUser([...callers])
    return { ok: true, data: await prisma.smsMessage.count({ where: { userId: user.id, direction: 'INBOUND', readAt: null } }) }
  } catch (err) {
    return toActionError(err)
  }
}

/** One conversation (the last 300 messages, oldest first). Opening it marks its texts read. */
export async function smsConversation(number: string): Promise<ActionResult<SmsConversation>> {
  try {
    const user = await requireUser([...callers])
    const raw = z.string().trim().min(3).max(40).parse(number)
    const other = toE164(raw) ?? raw
    const [rows, who] = await Promise.all([
      prisma.smsMessage.findMany({ where: { userId: user.id, otherNumber: other }, orderBy: { createdAt: 'desc' }, take: 300 }),
      identifyNumber(other, user).catch(() => null),
    ])
    await prisma.smsMessage.updateMany({ where: { userId: user.id, otherNumber: other, direction: 'INBOUND', readAt: null }, data: { readAt: new Date() } })
    return {
      ok: true,
      data: {
        number: other,
        display: /^\+\d+$/.test(other) ? formatPhone(other) : other,
        name: who?.title ?? null,
        subtitle: who?.subtitle ?? null,
        leadId: who?.lead?.id ?? null,
        blocked: who?.lead?.blocked ? (who.lead.owner ?? 'another teammate') : null,
        messages: rows.reverse().map((m) => ({ id: m.id, direction: m.direction, body: m.body, media: m.media, status: m.status, error: m.error, at: m.createdAt.toISOString() })),
      },
    }
  } catch (err) {
    return toActionError(err)
  }
}

const SendInput = z.object({ to: z.string().trim().min(3).max(40), body: z.string().max(SMS_MAX) })

/** Text someone from your own line. A refusal from Twilio comes back as a failed message with the reason. */
export async function sendText(input: z.input<typeof SendInput>): Promise<ActionResult<SmsBubble>> {
  try {
    const user = await requireUser([...callers])
    const data = SendInput.parse(input)
    const m = await sendSms(user, data)
    return { ok: true, data: { id: m.id, direction: m.direction, body: m.body, media: m.media, status: m.status, error: m.error, at: m.createdAt.toISOString() } }
  } catch (err) {
    return toActionError(err)
  }
}
