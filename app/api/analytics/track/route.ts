import { NextResponse } from 'next/server'
import { doc, runTransaction, serverTimestamp, increment } from 'firebase/firestore'
import { z } from 'zod'
import { db } from '@/lib/firebase'

const trackSchema = z.object({
  pageKey: z.string().trim().min(1).max(64),
  sessionId: z.string().trim().min(1).max(128),
  compositeId: z.string().trim().min(1).max(256),
  timestamp: z.string().datetime(),
  userAgent: z.string().trim().max(1024).optional().default(''),
  referrer: z.string().trim().max(2048).nullable().optional().default(null),
})

function getDatePart(isoTimestamp: string) {
  return isoTimestamp.slice(0, 10)
}

function isMatchingCompositeId(
  pageKey: string,
  sessionId: string,
  timestamp: string,
  compositeId: string
) {
  const expected = `${pageKey}_${sessionId}_${getDatePart(timestamp)}`
  return compositeId === expected
}

export async function POST(request: Request) {
  let parsed: z.infer<typeof trackSchema>
  try {
    const body = await request.json()
    parsed = trackSchema.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid tracking payload' }, { status: 400 })
  }

  if (
    !isMatchingCompositeId(
      parsed.pageKey,
      parsed.sessionId,
      parsed.timestamp,
      parsed.compositeId
    )
  ) {
    return NextResponse.json({ error: 'Invalid composite ID' }, { status: 400 })
  }

  const viewDate = getDatePart(parsed.timestamp)
  const timestampDate = new Date(parsed.timestamp)

  const viewRef = doc(db, 'analytics_page_views', parsed.compositeId)
  const dailyRef = doc(db, 'analytics_page_daily', `${parsed.pageKey}_${viewDate}`)
  const metaRef = doc(db, 'analytics_metadata', 'global')

  try {
    await runTransaction(db, async (tx) => {
      const existing = await tx.get(viewRef)
      if (!existing.exists()) {
        tx.set(
          viewRef,
          {
            pageKey: parsed.pageKey,
            sessionId: parsed.sessionId,
            compositeId: parsed.compositeId,
            timestamp: timestampDate,
            viewDate,
            userAgent: parsed.userAgent,
            referrer: parsed.referrer ?? null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        tx.set(
          metaRef,
          {
            totalViews: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        tx.set(
          dailyRef,
          {
            pageKey: parsed.pageKey,
            viewDate,
            views: increment(1),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        )
        return
      }

      tx.set(
        viewRef,
        {
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error tracking analytics event:', error)
    return NextResponse.json(
      { error: 'Failed to track analytics event' },
      { status: 500 }
    )
  }
}
