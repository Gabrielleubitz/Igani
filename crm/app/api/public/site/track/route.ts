import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { MAX_BODY_BYTES, MAX_NEW_VISITS_PER_HOUR, TrackBatch, asClicks, asMoves, asSections, mergeVisit, visitStillOpen } from '@/lib/offer-tracking'
import { prisma } from '@/lib/prisma'
import { getSetting } from '@/lib/settings'
import { isSiteOrigin, isSitePage, type SitePage } from '@/lib/site-pages'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const Body = TrackBatch.extend({ page: z.string().max(40), utmSource: z.string().max(80).optional(), utmCampaign: z.string().max(80).optional() })
const ok = (): NextResponse => new NextResponse(null, { status: 204 })

function ipHash(req: Request): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${ip}|${process.env.NEXTAUTH_SECRET ?? ''}`).digest('hex').slice(0, 24)
}

/**
 * Visitor analytics beacon for the main website (igani.co). Sent as a "simple" no-cors request (text/plain), so only
 * the Origin header tells us where it came from: anything not from igani.co is dropped. Same limits as the offer beacon.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const origin = req.headers.get('origin') ?? ''
  if (!isSiteOrigin(origin)) return ok()
  const raw = await req.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = Body.safeParse(json)
  if (!parsed.success || !isSitePage(parsed.data.page)) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const b = parsed.data
  const page = b.page as SitePage
  if (!(await getSetting('website.tracking'))[page]) return ok() // switched off under Admin → Website

  const hash = ipHash(req)
  const existing = await prisma.siteVisit.findUnique({ where: { key: b.key } })
  if (existing) {
    if (existing.page !== b.page || existing.ipHash !== hash || !visitStillOpen(existing.startedAt)) return ok()
    const next = mergeVisit({ durationMs: existing.durationMs, maxScrollPct: existing.maxScrollPct, sections: asSections(existing.sections), clicks: asClicks(existing.clicks), moves: asMoves(existing.moves) }, b)
    await prisma.siteVisit.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), durationMs: next.durationMs, maxScrollPct: next.maxScrollPct, sections: next.sections, clicks: next.clicks as Prisma.InputJsonValue, moves: next.moves as Prisma.InputJsonValue },
    })
    return ok()
  }
  if (b.durationMs < 1000 && !b.clicks.length && !b.moves.length && !Object.keys(b.sections).length && b.maxScroll === 0) return ok()
  const recent = await prisma.siteVisit.count({ where: { page: b.page, ipHash: hash, startedAt: { gt: new Date(Date.now() - 3600_000) } } })
  if (recent >= MAX_NEW_VISITS_PER_HOUR) return ok()
  const first = mergeVisit(null, b)
  let referrer: string | null = null
  try {
    referrer = b.ref ? new URL(b.ref).hostname.slice(0, 120) : null
  } catch {
    referrer = null
  }
  await prisma.siteVisit
    .create({
      data: {
        page: b.page,
        key: b.key,
        visitorId: b.visitorId,
        device: b.device,
        viewportW: b.vw,
        viewportH: b.vh,
        lang: b.lang ?? null,
        country: req.headers.get('x-vercel-ip-country')?.slice(0, 2) || null,
        referrer,
        utmSource: b.utmSource ?? null,
        utmCampaign: b.utmCampaign ?? null,
        ipHash: hash,
        durationMs: first.durationMs,
        maxScrollPct: first.maxScrollPct,
        sections: first.sections,
        clicks: first.clicks as Prisma.InputJsonValue,
        moves: first.moves as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined)
  return ok()
}
