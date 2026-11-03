import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { NextResponse } from 'next/server'
import { MAX_BODY_BYTES, MAX_NEW_VISITS_PER_HOUR, TrackBatch, asClicks, asMoves, asSections, mergeVisit, visitStillOpen } from '@/lib/offer-tracking'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ok = (): NextResponse => new NextResponse(null, { status: 204 })

function ipHash(req: Request): string {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown'
  return createHash('sha256').update(`${ip}|${process.env.NEXTAUTH_SECRET ?? ''}`).digest('hex').slice(0, 24)
}

/**
 * Offer page analytics beacon (sendBeacon / fetch keepalive). Public, so it is strict: small bodies, a fixed shape,
 * only live or signed offers, a cap on new visits per IP, and capped lists per visit. It never echoes data back.
 */
export async function POST(req: Request, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const { slug } = await props.params
  const raw = await req.text().catch(() => '')
  if (!raw || raw.length > MAX_BODY_BYTES) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  let json: unknown
  try {
    json = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
  const parsed = TrackBatch.safeParse(json)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  const b = parsed.data

  const offer = await prisma.offer.findUnique({ where: { slug }, select: { id: true, status: true } })
  if (!offer || (offer.status !== 'LIVE' && offer.status !== 'SIGNED')) return ok() // nothing to record; don't reveal why

  const hash = ipHash(req)
  const existing = await prisma.offerVisit.findUnique({ where: { key: b.key } })
  if (existing) {
    if (existing.offerId !== offer.id || existing.ipHash !== hash || !visitStillOpen(existing.startedAt)) return ok()
    const next = mergeVisit({ durationMs: existing.durationMs, maxScrollPct: existing.maxScrollPct, sections: asSections(existing.sections), clicks: asClicks(existing.clicks), moves: asMoves(existing.moves) }, b)
    await prisma.offerVisit.update({
      where: { id: existing.id },
      data: { lastSeenAt: new Date(), durationMs: next.durationMs, maxScrollPct: next.maxScrollPct, sections: next.sections, clicks: next.clicks as Prisma.InputJsonValue, moves: next.moves as Prisma.InputJsonValue },
    })
    return ok()
  }

  // A page that was open for under a second with nothing done on it is not a visit (e.g. an instant bounce or reload)
  if (b.durationMs < 1000 && !b.clicks.length && !b.moves.length && !Object.keys(b.sections).length && b.maxScroll === 0) return ok()
  const recent = await prisma.offerVisit.count({ where: { offerId: offer.id, ipHash: hash, startedAt: { gt: new Date(Date.now() - 3600_000) } } })
  if (recent >= MAX_NEW_VISITS_PER_HOUR) return ok()
  const first = mergeVisit(null, b)
  let referrer: string | null = null
  try {
    referrer = b.ref ? new URL(b.ref).hostname.slice(0, 120) : null // the site they came from, never the full URL
  } catch {
    referrer = null
  }
  await prisma.offerVisit
    .create({
      data: {
        offerId: offer.id,
        key: b.key,
        visitorId: b.visitorId,
        device: b.device,
        viewportW: b.vw,
        viewportH: b.vh,
        lang: b.lang ?? null,
        country: req.headers.get('x-vercel-ip-country')?.slice(0, 2) || null,
        referrer,
        ipHash: hash,
        durationMs: first.durationMs,
        maxScrollPct: first.maxScrollPct,
        sections: first.sections,
        clicks: first.clicks as Prisma.InputJsonValue,
        moves: first.moves as Prisma.InputJsonValue,
      },
    })
    .catch(() => undefined) // two first batches racing on the same key: the other one won, fine
  return ok()
}
