'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'

/** Confirm-then-run destructive action button. */
export function DangerButton({ label, confirm, action }: { label: string; confirm: string; action: () => Promise<{ ok: boolean; error?: string }> }): React.ReactElement {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  return (
    <span className="inline-flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          window.confirm(confirm) &&
          start(async () => {
            const res = await action()
            setErr(res.ok ? null : (res.error ?? 'Failed'))
            router.refresh()
          })
        }
      >
        {label}
      </Button>
      {err ? <span className="text-xs text-red-400">{err}</span> : null}
    </span>
  )
}
