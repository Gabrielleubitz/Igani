'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteCall } from '@/app/actions/calls'
import { Button } from '@/components/ui/button'

/** Admin: delete this call for good (two clicks). Takes the recording, transcript and review with it. */
export function DeleteCallButton({ callId }: { callId: string }): React.ReactElement {
  const router = useRouter()
  const [sure, setSure] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const run = (): void =>
    start(async () => {
      setError(null)
      const r = await deleteCall(callId)
      if (r.ok) router.push('/sales/calls')
      else {
        setError(r.error)
        setSure(false)
      }
    })
  if (!sure)
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" className="text-red-500 hover:text-red-400" onClick={() => setSure(true)}>
          <Trash2 className="h-4 w-4" aria-hidden /> Delete call
        </Button>
        {error ? <span className="text-xs text-red-500">{error}</span> : null}
      </div>
    )
  return (
    <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-sm">
      <span>Delete this call for good? The recording, transcript and review are removed.</span>
      <Button type="button" size="sm" variant="outline" className="text-red-500" disabled={pending} onClick={run}>
        {pending ? 'Deleting…' : 'Yes, delete'}
      </Button>
      <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={() => setSure(false)}>
        Cancel
      </Button>
    </div>
  )
}
