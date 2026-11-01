'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { setMeetingTask } from '@/app/sales/actions'

/** One meeting action item with a tick box (owner or admin). */
export function MeetingTaskRow({ ownerId, taskId, title, meeting, done: initial, meta }: { ownerId: string; taskId: string; title: string; meeting: string | null; done: boolean; meta?: string }): React.ReactElement {
  const router = useRouter()
  const [done, setDone] = useState(initial)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div className={`flex items-start gap-3 py-2.5 text-sm ${pending ? 'opacity-60' : ''}`}>
      <input
        type="checkbox"
        aria-label={done ? `Reopen ${title}` : `Complete ${title}`}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[hsl(var(--primary))]"
        checked={done}
        disabled={pending}
        onChange={() => {
          const was = done
          setDone(!was)
          start(async () => {
            const res = await setMeetingTask(ownerId, taskId, !was)
            if (!res.ok) {
              setDone(was)
              setError(res.error)
            } else router.refresh()
          })
        }}
      />
      <div className="min-w-0 flex-1">
        <div className={`font-medium ${done ? 'text-muted-foreground line-through' : ''}`}>
          {title}
          <span className="ml-2 rounded-full border px-1.5 py-px text-[10px] uppercase tracking-wide text-muted-foreground">from meeting</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {meeting ?? 'Team meeting'}
          {meta ? ` · ${meta}` : ''}
        </div>
        {error ? <div className="text-xs text-red-400">{error}</div> : null}
      </div>
    </div>
  )
}
