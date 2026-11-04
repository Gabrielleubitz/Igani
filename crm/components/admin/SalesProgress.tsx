'use client'

import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { setSalesProgress } from '@/app/actions/videos'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export interface SalesRow {
  userId: string
  name: string
  email: string
  completed: number
}

/** Admin view of the course: how far each salesperson is, with reset / unlock-all. */
export function SalesProgress({ rows, total }: { rows: SalesRow[]; total: number }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const act = (userId: string, mode: 'reset' | 'all'): void => start(async () => void (await setSalesProgress(userId, mode), router.refresh()))
  return (
    <Card>
      <CardHeader>
        <CardTitle>Salesperson progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No salespeople yet.</p> : null}
        {rows.map((r) => (
          <div key={r.userId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <div>
              <p className="font-medium">{r.name || r.email}</p>
              <p className="text-muted-foreground">
                {r.completed} of {total} completed
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={pending || r.completed === 0} onClick={() => confirm(`Reset ${r.name || r.email} to video 1?`) && act(r.userId, 'reset')}>
                Reset
              </Button>
              <Button size="sm" variant="outline" disabled={pending || r.completed >= total} onClick={() => act(r.userId, 'all')}>
                Unlock all
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
