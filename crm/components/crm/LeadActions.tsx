'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { archiveLeads, deleteLeads } from '@/app/actions/leads'
import { Button } from '@/components/ui/button'

/** Archive / restore (owner or admin) and permanent delete (admin) from the contact page. */
export function LeadActions({ leadId, archived, canArchive, isAdmin, name }: { leadId: string; archived: boolean; canArchive: boolean; isAdmin: boolean; name: string }): React.ReactElement | null {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  if (!canArchive && !isAdmin) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {canArchive ? (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await archiveLeads([leadId], !archived)
              setError(res.ok ? null : res.error)
              router.refresh()
            })
          }
        >
          {archived ? 'Restore' : 'Archive'}
        </Button>
      ) : null}
      {isAdmin ? (
        <Button
          size="sm"
          variant="outline"
          className="text-red-400 hover:text-red-300"
          disabled={pending}
          onClick={() =>
            window.confirm(`Permanently delete ${name}? Notes and history stay in the audit log, but the contact is gone for good.`) &&
            start(async () => {
              const res = await deleteLeads([leadId])
              if (res.ok) router.push('/sales/leads')
              else setError(res.error)
            })
          }
        >
          Delete
        </Button>
      ) : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
    </div>
  )
}
