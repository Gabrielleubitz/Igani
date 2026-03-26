import { NextResponse } from 'next/server'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RangeKey = '7d' | '30d' | '90d'

const rangeMap: Record<RangeKey, number> = {
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10)
}

function dateDaysAgo(days: number) {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() - days + 1)
  return now
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const range = (searchParams.get('range') ?? '30d') as RangeKey
    const pageKey = (searchParams.get('pageKey') ?? 'home').trim() || 'home'
    const days = rangeMap[range] ?? 30

    const startISO = toISODate(dateDaysAgo(days))
    const endISO = toISODate(new Date())

    const q = query(
      collection(db, 'analytics_page_daily'),
      where('pageKey', '==', pageKey),
      where('viewDate', '>=', startISO),
      where('viewDate', '<=', endISO)
    )
    const dailySnap = await getDocs(q)

    const dailyViews = dailySnap.docs
      .map((row) => {
        const data = row.data() as { viewDate?: string; views?: number }
        return {
          date: String(data.viewDate ?? ''),
          views: Number(data.views ?? 0),
        }
      })
      .filter((row) => row.date)
      .sort((a, b) => a.date.localeCompare(b.date))

    const rangeViews = dailyViews.reduce((sum, row) => sum + row.views, 0)

    const metaSnap = await getDoc(doc(db, 'analytics_metadata', 'global'))
    const totalViews = Number(metaSnap.data()?.totalViews ?? 0)

    return NextResponse.json({
      range,
      pageKey,
      totals: {
        rangeViews,
        totalViews,
        trackedDays: dailyViews.length,
      },
      dailyViews,
    })
  } catch (error) {
    console.error('Error loading analytics summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics summary' },
      { status: 500 }
    )
  }
}
