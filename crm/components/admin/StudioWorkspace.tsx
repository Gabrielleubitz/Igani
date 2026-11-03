'use client'

import '@xterm/xterm/css/xterm.css'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

const BRIDGE = 'ws://127.0.0.1:3199'

/** Left: a real terminal running Claude in offers/<slug>/. Right: the offer as the client will see it, live-reloading. */
export function StudioWorkspace({ slug, token, previewUrl }: { slug: string; token: string; previewUrl: string }): React.ReactElement {
  const host = useRef<HTMLDivElement>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [state, setState] = useState<'connecting' | 'open' | 'closed'>('connecting')
  const [device, setDevice] = useState<'desktop' | 'phone'>('desktop')
  const [lang, setLang] = useState<'he' | 'en'>('he')
  const [attempt, setAttempt] = useState(0)
  const restart = useRef(false)

  useEffect(() => {
    let disposed = false
    let cleanup = (): void => {}
    void (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([import('@xterm/xterm'), import('@xterm/addon-fit')])
      if (disposed || !host.current) return
      const term = new Terminal({ cursorBlink: true, fontSize: 13, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', theme: { background: '#0b1220' }, scrollback: 5000, allowProposedApi: true })
      const fit = new FitAddon()
      term.loadAddon(fit)
      term.open(host.current)
      fit.fit()
      const fresh = restart.current
      restart.current = false
      const ws = new WebSocket(`${BRIDGE}/?slug=${encodeURIComponent(slug)}&token=${encodeURIComponent(token)}${fresh ? '&restart=1' : ''}`)
      const send = (m: object): void => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(m))
      }
      ws.onopen = () => {
        setState('open')
        send({ type: 'resize', cols: term.cols, rows: term.rows })
        term.focus()
      }
      ws.onmessage = (e) => term.write(typeof e.data === 'string' ? e.data : '')
      ws.onclose = () => setState('closed')
      const input = term.onData((data) => send({ type: 'input', data }))
      const resize = new ResizeObserver(() => {
        fit.fit()
        send({ type: 'resize', cols: term.cols, rows: term.rows })
      })
      resize.observe(host.current)
      cleanup = () => {
        resize.disconnect()
        input.dispose()
        ws.close()
        term.dispose()
      }
    })()
    return () => {
      disposed = true
      cleanup()
    }
  }, [slug, token, attempt])

  const src = `${previewUrl}?lang=${lang}`
  return (
    <div className="grid h-[calc(100vh-11rem)] min-h-[560px] gap-4 xl:grid-cols-2">
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-[#0b1220]">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-xs text-slate-400">
          <span>
            claude · offers/{slug} ·{' '}
            <span className={state === 'open' ? 'text-emerald-400' : state === 'connecting' ? 'text-amber-400' : 'text-rose-400'}>{state === 'open' ? 'connected' : state === 'connecting' ? 'connecting…' : 'disconnected'}</span>
          </span>
          <span className="flex gap-2">
            {state === 'closed' ? (
              <button type="button" className="hover:text-white" onClick={() => setAttempt((n) => n + 1)}>
                Reconnect
              </button>
            ) : null}
            <button type="button" className="hover:text-white" onClick={() => {
                restart.current = true
                setAttempt((n) => n + 1)
              }} title="Ends this Claude session and starts a fresh one">
              New session
            </button>
          </span>
        </div>
        <div ref={host} className="min-h-0 flex-1 p-2" />
      </div>
      <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-3 py-2 text-xs">
          <a href={src} target="_blank" rel="noreferrer" className="font-mono text-muted-foreground hover:text-foreground">
            {previewUrl.replace('http://', '')}
          </a>
          <span className="ms-auto flex gap-1">
            {(['he', 'en'] as const).map((l) => (
              <Button key={l} size="sm" variant={lang === l ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setLang(l)}>
                {l === 'he' ? 'עברית' : 'English'}
              </Button>
            ))}
            {(['desktop', 'phone'] as const).map((d) => (
              <Button key={d} size="sm" variant={device === d ? 'secondary' : 'ghost'} className="h-7 px-2 text-xs" onClick={() => setDevice(d)}>
                {d === 'desktop' ? 'Desktop' : 'Phone'}
              </Button>
            ))}
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => frame.current?.contentWindow?.location.reload()}>
              Reload
            </Button>
          </span>
        </div>
        <div className="flex min-h-0 flex-1 justify-center overflow-auto bg-[#e9edf3]">
          <iframe ref={frame} key={src} src={src} title="Offer preview" className={device === 'phone' ? 'my-4 h-[760px] w-[390px] rounded-2xl border border-slate-300 bg-white shadow-xl' : 'h-full w-full bg-white'} />
        </div>
      </div>
    </div>
  )
}
