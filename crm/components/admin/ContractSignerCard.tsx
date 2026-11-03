'use client'

import { Eraser } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { saveSettings } from '@/app/actions/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Signer {
  name: string
  title: string
  email: string
  phone: string
}

/** Who signs contracts for Igani, and the signature put on every contract when an admin approves it. */
export function ContractSignerCard({ initial, signature }: { initial: Signer; signature: string }): React.ReactElement {
  const router = useRouter()
  const [s, setS] = useState(initial)
  const [sig, setSig] = useState(signature)
  const [redraw, setRedraw] = useState(!signature)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const c = canvas.current
    if (!c || !redraw) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1b33'
  }, [redraw])

  const pt = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  function save(): void {
    setMsg(null)
    start(async () => {
      const res = await saveSettings({ 'contract.signer': s, 'contract.signature': sig })
      setMsg(res.ok ? { ok: true, text: 'Saved. New approvals use this signature.' } : { ok: false, text: res.error })
      if (res.ok) router.refresh()
    })
  }

  const field = (key: keyof Signer, label: string, type = 'text'): React.ReactElement => (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <Input type={type} value={s[key]} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </label>
  )

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {field('name', 'Name')}
        {field('title', 'Title (e.g. Co-Founder)')}
        {field('email', 'Email', 'email')}
        {field('phone', 'Phone')}
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Signature</span>
          {!redraw ? (
            <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => (setRedraw(true), setSig(''))}>
              Draw again
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
              onClick={() => {
                const c = canvas.current
                c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
                setSig('')
              }}
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
            </button>
          )}
        </div>
        {redraw ? (
          <canvas
            ref={canvas}
            className="h-36 w-full max-w-md touch-none rounded-lg border border-dashed border-border bg-white"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              drawing.current = true
              const ctx = e.currentTarget.getContext('2d')!
              const [x, y] = pt(e)
              ctx.beginPath()
              ctx.moveTo(x, y)
              ctx.lineTo(x + 0.1, y + 0.1)
              ctx.stroke()
            }}
            onPointerMove={(e) => {
              if (!drawing.current) return
              const ctx = e.currentTarget.getContext('2d')!
              const [x, y] = pt(e)
              ctx.lineTo(x, y)
              ctx.stroke()
            }}
            onPointerUp={() => {
              drawing.current = false
              if (canvas.current) setSig(canvas.current.toDataURL('image/png'))
            }}
            aria-label="Draw Igani's signature"
          />
        ) : (
          <div className="flex h-36 w-full max-w-md items-center justify-center rounded-lg border border-border bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
            <img src={sig} alt="Igani's signature" className="max-h-28 object-contain" />
          </div>
        )}
        <p className="text-xs text-muted-foreground">Shown on every approved contract. Signed contracts are saved as PDFs, so changing it later never changes a signed copy.</p>
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending || !s.name.trim() || !sig}>
          {pending ? 'Saving…' : 'Save signer'}
        </Button>
        {msg ? <span className={`text-sm ${msg.ok ? 'text-emerald-400' : 'text-rose-400'}`}>{msg.text}</span> : null}
      </div>
    </div>
  )
}
