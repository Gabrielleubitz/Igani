'use server'

import { z } from 'zod'
import { logActivity } from '@/lib/audit'
import { requireUser, type SessionUser } from '@/lib/auth'
import { BookingError } from '@/lib/bookings'
import { prisma } from '@/lib/prisma'
import { auditSite, normalizeSiteUrl } from '@/lib/site-audit'
import type { SiteReport } from '@/lib/site-audit-core'
import { toActionError, type ActionResult } from './result'

const ACTION = 'site.audit'
const LIMITS = { perUserHour: 30, perUserDay: 120, teamDay: 400 } as const

async function assertAllowed(user: SessionUser): Promise<void> {
  const now = Date.now()
  const [hour, day, team] = await Promise.all([
    prisma.activityLog.count({ where: { action: ACTION, actorId: user.id, createdAt: { gte: new Date(now - 3600_000) } } }),
    prisma.activityLog.count({ where: { action: ACTION, actorId: user.id, createdAt: { gte: new Date(now - 86_400_000) } } }),
    prisma.activityLog.count({ where: { action: ACTION, createdAt: { gte: new Date(now - 86_400_000) } } }),
  ])
  if (hour >= LIMITS.perUserHour || day >= LIMITS.perUserDay || team >= LIMITS.teamDay) throw new BookingError('That’s a lot of site checks. Try again a bit later.', 'INVALID_STATE')
}

const schema = z.object({ url: z.string().trim().min(3, 'Type the website address').max(300) })

/** "See what's wrong with this site": reads one public website and lists what a salesman can raise on the call. */
export async function checkSite(input: z.input<typeof schema>): Promise<ActionResult<SiteReport>> {
  try {
    const user = await requireUser(['ADMIN', 'SALES'])
    const { url } = schema.parse(input)
    const clean = normalizeSiteUrl(url)
    if (!clean) return { ok: false, error: 'That does not look like a website address. Try something like example.com.' }
    await assertAllowed(user)
    await logActivity({ entityType: 'USER', entityId: user.id, actorId: user.id, action: ACTION, metadata: { url: clean } })
    const report = await auditSite(clean)
    if (!report) return { ok: false, error: 'We could not open that site. Check the address, or the site may be blocking visitors like us.' }
    return { ok: true, data: report }
  } catch (err) {
    return toActionError(err)
  }
}
