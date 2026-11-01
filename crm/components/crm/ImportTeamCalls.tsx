'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { importTeamMeetingsAction } from '@/app/admin/team-meetings/actions'
import { Button } from '@/components/ui/button'

/** Pulls recent team calls (and their Gemini notes) from the admin's Google Calendar and Meet. */
export function ImportTeamCalls(): React.ReactElement {
  const router = useRouter()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [importing, start] = useTransition()
  const run = (): void =>
    start(async () => {
      setMsg(null)
      const r = await importTeamMeetingsAction()
      if (!r.ok) return setMsg({ ok: false, text: r.error })
      setMsg({ ok: true, text: `Found ${r.data.found} team call(s), ${r.data.imported} new, ${r.data.withNotes} with Gemini notes.${r.data.found === 0 || r.data.diagnostics.some((d) => /missing|failed|Skipped/.test(d)) ? `\n${r.data.diagnostics.join('\n')}` : ''}` })
      router.refresh()
    })
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="outline" onClick={run} disabled={importing}>
        {importing ? 'Importing…' : 'Import from my Google Calendar'}
      </Button>
      {msg ? <span className={`whitespace-pre-line text-sm ${msg.ok ? 'text-success' : 'text-destructive'}`}>{msg.text}</span> : null}
    </div>
  )
}
