'use client'

import { useEffect, useState } from 'react'
import { BarChart3, RefreshCcw } from 'lucide-react'

type RangeKey = '7d' | '30d' | '90d'

type AnalyticsResponse = {
  totals: {
    rangeViews: number
    totalViews: number
    trackedDays: number
  }
  dailyViews: Array<{ date: string; views: number }>
}

const ranges: Array<{ key: RangeKey; label: string }> = [
  { key: '7d', label: 'Last 7 days' },
  { key: '30d', label: 'Last 30 days' },
  { key: '90d', label: 'Last 90 days' },
]

export function AnalyticsManager() {
  const [range, setRange] = useState<RangeKey>('30d')
  const [data, setData] = useState<AnalyticsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = async (nextRange = range) => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(
        `/api/admin/analytics/summary?range=${encodeURIComponent(nextRange)}&pageKey=home`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch analytics summary')
      }
      const payload = (await response.json()) as AnalyticsResponse
      setData(payload)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData(range)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 items-center">
        {ranges.map((item) => (
          <button
            key={item.key}
            onClick={() => setRange(item.key)}
            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
              range === item.key
                ? 'bg-cyan-600 border-cyan-500 text-white'
                : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={() => void loadData(range)}
          className="ml-auto inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 transition-colors text-sm"
        >
          <RefreshCcw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {isLoading && (
        <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6 text-slate-300">
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-300">
          {error}
        </div>
      )}

      {!isLoading && !error && data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
              <p className="text-slate-400 text-sm">Homepage views ({range})</p>
              <p className="text-3xl font-bold text-white mt-2">{data.totals.rangeViews}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
              <p className="text-slate-400 text-sm">Total tracked views</p>
              <p className="text-3xl font-bold text-white mt-2">{data.totals.totalViews}</p>
            </div>
            <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
              <p className="text-slate-400 text-sm">Tracked days</p>
              <p className="text-3xl font-bold text-white mt-2">{data.totals.trackedDays}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Daily homepage views</h3>
            </div>
            {data.dailyViews.length === 0 ? (
              <p className="text-slate-400 text-sm">No tracked events yet for this range.</p>
            ) : (
              <div className="space-y-2">
                {data.dailyViews.map((row) => (
                  <div
                    key={row.date}
                    className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2"
                  >
                    <span className="text-slate-300 text-sm">{row.date}</span>
                    <span className="text-white font-semibold">{row.views}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
