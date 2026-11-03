'use client'

import { Loader2, MonitorSmartphone, TerminalSquare } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { StudioAssets } from './StudioAssets'
import { StudioWorkspace } from './StudioWorkspace'

/** The studio helper on the admin's Mac (studio/launcher.mjs, installed once with `npm run studio:install`). */
export const STUDIO_HELPER = 'http://127.0.0.1:3198'
const INSTALL = 'cd ~/Downloads/Projects/igani/crm && npm run studio:install'

type State =
  | { kind: 'checking' }
  | { kind: 'missing' }
  | { kind: 'starting' }
  | { kind: 'ready'; token: string; preview: string }
  | { kind: 'error'; message: string }

/**
 * Lovable-style studio inside the live CRM: connects to the helper on this Mac, which starts Claude's terminal and the
 * offer preview on demand. Nothing has to be started by hand once the helper is installed.
 */
export function StudioConnect({ slug }: { slug: string }): React.ReactElement {
  const [state, setState] = useState<State>({ kind: 'checking' })

  const connect = useCallback(async () => {
    setState({ kind: 'checking' })
    try {
      const st = await fetch(`${STUDIO_HELPER}/status`, { signal: AbortSignal.timeout(3000) })
      if (!st.ok) throw new Error('helper')
    } catch {
      return setState({ kind: 'missing' })
    }
    setState({ kind: 'starting' })
    try {
      const r = await fetch(`${STUDIO_HELPER}/session`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ slug }) })
      const data = (await r.json().catch(() => ({}))) as { token?: string; preview?: string; error?: string }
      if (!r.ok || !data.token || !data.preview) throw new Error(data.error ?? `The studio answered ${r.status}`)
      setState({ kind: 'ready', token: data.token, preview: data.preview })
    } catch (err) {
      setState({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }, [slug])

  useEffect(() => {
    void connect()
  }, [connect])

  if (state.kind === 'ready') {
    return (
      <div className="space-y-3">
        <StudioAssets slug={slug} api={`${STUDIO_HELPER}/assets/${slug}`} />
        <StudioWorkspace slug={slug} token={state.token} previewUrl={state.preview} />
      </div>
    )
  }

  return (
    <div className="flex min-h-[420px] items-center justify-center rounded-xl border border-border bg-card p-8">
      {state.kind === 'checking' || state.kind === 'starting' ? (
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <div className="font-medium">{state.kind === 'checking' ? 'Connecting to the studio on this Mac…' : 'Starting the studio…'}</div>
          {state.kind === 'starting' ? <div className="max-w-sm text-sm text-muted-foreground">The first start takes up to a minute (it opens Claude and prepares the preview). After that it is instant.</div> : null}
        </div>
      ) : state.kind === 'missing' ? (
        <div className="max-w-lg space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <TerminalSquare className="h-5 w-5" aria-hidden />
            </span>
            <div>
              <div className="font-semibold">One-time setup on this Mac</div>
              <div className="text-sm text-muted-foreground">Claude runs on your computer. Install the small studio helper once; after that this page starts everything by itself.</div>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted p-3 font-mono text-xs">
            <span className="flex-1 break-all">{INSTALL}</span>
            <CopyButton text={INSTALL} label="Copy" />
          </div>
          <ol className="list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
            <li>Open Terminal, paste the command, press Enter.</li>
            <li>Come back here and press “Check again”.</li>
          </ol>
          <Button onClick={() => void connect()}>Check again</Button>
          <p className="text-xs text-muted-foreground">Works in Chrome on the Mac where the Igani repo is. The helper starts at login, answers only app.igani.co, and starts the studio only when you open it.</p>
        </div>
      ) : (
        <div className="max-w-lg space-y-3 text-center">
          <MonitorSmartphone className="mx-auto h-6 w-6 text-rose-400" aria-hidden />
          <div className="font-semibold">The studio could not start</div>
          <p className="text-sm text-muted-foreground">{state.message}</p>
          <Button onClick={() => void connect()}>Try again</Button>
        </div>
      )}
    </div>
  )
}
