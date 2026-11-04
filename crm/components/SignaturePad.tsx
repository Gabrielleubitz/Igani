'use client'

import { Eraser } from 'lucide-react'
import { useEffect, useRef } from 'react'

/** Draw-to-sign canvas. onChange gets a PNG data URL (downscaled to keep it small) or '' when empty. */
export function SignaturePad({ onChange, label, maxWidth = 360 }: { onChange: (png: string) => void; label: string; maxWidth?: number }): React.ReactElement {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    c.width = c.clientWidth * ratio
    c.height = c.clientHeight * ratio
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0b1b33'
  }, [])

  const pt = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  function emit(): void {
    const c = canvas.current
    if (!c) return
    const w = Math.min(maxWidth, c.width)
    const h = Math.round((c.height * w) / c.width)
    const o = document.createElement('canvas')
    o.width = w
    o.height = h
    o.getContext('2d')!.drawImage(c, 0, 0, w, h)
    onChange(o.toDataURL('image/png'))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-neutral-500 hover:text-neutral-900"
          onClick={() => {
            const c = canvas.current
            c?.getContext('2d')?.clearRect(0, 0, c.width, c.height)
            onChange('')
          }}
        >
          <Eraser className="h-3.5 w-3.5" aria-hidden /> Clear
        </button>
      </div>
      <canvas
        ref={canvas}
        className="h-36 w-full max-w-md touch-none rounded-lg border border-dashed border-neutral-400 bg-white"
        aria-label={label}
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
          emit()
        }}
      />
    </div>
  )
}
