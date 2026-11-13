import { ArrayBufferTarget, Muxer } from 'mp4-muxer'
import type { SocialDraft } from '@/lib/social-draft'

/**
 * Draws Igani's 7-second post video in the browser (the dark CRM look from the igani-social-posts skill) and encodes it
 * to an H.264 MP4 with WebCodecs. 540×675 css units drawn at 2× = 1080×1350, 30 fps, no sound. Every name and number
 * on it is made up and fixed here, never from the AI.
 */
export const VIDEO = { width: 1080, height: 1350, fps: 30, seconds: 7 } as const
const W = 540
const H = 675
const C = { bg: '#0e0e0e', card1: '#181818', card2: '#111111', border: '#242424', text: '#ededed', text2: 'rgba(237,237,237,.62)', text3: 'rgba(237,237,237,.38)', accent: '#ec5c13', accent2: '#f07832', ok: '#6fe3a0', bad: '#ff8f84' }

export type VideoFonts = { display: string; mono: string; body: string }
export type VideoAssets = { logo: HTMLImageElement; fonts: VideoFonts }

const clamp = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))
/** 0→1 progress of `t` through [start, end], eased out. */
const ease = (t: number, start: number, end: number): number => {
  const p = clamp((t - start) / (end - start))
  return 1 - Math.pow(1 - p, 3)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 18): void {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, C.card1)
  g.addColorStop(1, C.card2)
  roundRect(ctx, x, y, w, h, r)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = C.border
  ctx.lineWidth = 1
  ctx.stroke()
  // the faint white highlight along the top edge
  ctx.save()
  roundRect(ctx, x, y, w, h, r)
  ctx.clip()
  ctx.fillStyle = 'rgba(255,255,255,.07)'
  ctx.fillRect(x, y, w, 1)
  ctx.restore()
}

/** Splits text into lines that fit `max` px with the current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > max && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

function avatar(ctx: CanvasRenderingContext2D, f: VideoFonts, x: number, y: number, initials: string, orange: boolean, r = 17): void {
  const g = ctx.createLinearGradient(x - r, y - r, x + r, y + r)
  g.addColorStop(0, orange ? '#ff9a62' : '#4a4a4a')
  g.addColorStop(1, orange ? C.accent : '#2a2a2a')
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = `700 ${Math.round(r * 0.66)}px ${f.body}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, x, y + 0.5)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function pill(ctx: CanvasRenderingContext2D, f: VideoFonts, xRight: number, yMid: number, text: string, bg: string, fg: string): void {
  ctx.font = `700 11px ${f.body}`
  const w = ctx.measureText(text).width + 22
  roundRect(ctx, xRight - w, yMid - 12, w, 24, 12)
  ctx.fillStyle = bg
  ctx.fill()
  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.fillText(text, xRight - w + 11, yMid + 0.5)
  ctx.textBaseline = 'alphabetic'
}

// ---- the four feature cards (x, y, w, h is the card; t is seconds since the card appeared) ----

function pipelineCard(ctx: CanvasRenderingContext2D, f: VideoFonts, x: number, y: number, w: number, h: number, t: number): void {
  ctx.font = `700 11px ${f.display}`
  ctx.fillStyle = C.accent2
  ctx.fillText('LEADS', x + 18, y + 28)
  ctx.font = `400 11px ${f.mono}`
  ctx.fillStyle = C.text3
  ctx.textAlign = 'right'
  ctx.fillText('12 open', x + w - 18, y + 28)
  ctx.textAlign = 'left'
  const rows: [string, string, string, string, boolean][] = [
    ['DL', 'Dana Levi', 'Acme Studio', 'New lead', true],
    ['YC', 'Yoni Cohen', 'Bluebird', 'Contacted', false],
    ['ML', 'Maya Levin', 'Studio M', 'Demo booked', false],
  ]
  const rh = (h - 52) / 3
  rows.forEach(([ini, name, co, stage0, orange], i) => {
    const a = ease(t, 0.15 * i, 0.15 * i + 0.5)
    const ry = y + 42 + i * rh + (1 - a) * 14
    ctx.globalAlpha = a
    roundRect(ctx, x + 14, ry, w - 28, rh - 8, 14)
    ctx.fillStyle = '#151515'
    ctx.fill()
    ctx.strokeStyle = C.border
    ctx.stroke()
    const mid = ry + (rh - 8) / 2
    avatar(ctx, f, x + 40, mid, ini, orange)
    ctx.fillStyle = C.text
    ctx.font = `700 14px ${f.body}`
    ctx.fillText(name, x + 66, mid - 2)
    ctx.fillStyle = C.text2
    ctx.font = `400 11.5px ${f.body}`
    ctx.fillText(co, x + 66, mid + 14)
    // Maya moves along the pipeline: Demo booked → Won
    const won = i === 2 && t > 2.4
    const stage = won ? 'Won' : stage0
    const [bg, fg] = stage === 'New lead' ? ['rgba(236,92,19,.16)', '#ff9357'] : stage === 'Contacted' ? ['#242424', C.text2] : ['rgba(111,227,160,.13)', C.ok]
    pill(ctx, f, x + w - 28, mid, stage, bg, fg)
    ctx.globalAlpha = 1
  })
}

function recordingCard(ctx: CanvasRenderingContext2D, f: VideoFonts, x: number, y: number, w: number, h: number, t: number): void {
  avatar(ctx, f, x + 38, y + 38, 'DL', true, 19)
  ctx.fillStyle = C.text
  ctx.font = `700 15px ${f.body}`
  ctx.fillText('Dana Levi', x + 66, y + 35)
  ctx.fillStyle = C.text2
  ctx.font = `400 11.5px ${f.body}`
  ctx.fillText('Cold call · Noa', x + 66, y + 51)
  // REC badge with a pulsing dot
  const bx = x + w - 92
  roundRect(ctx, bx, y + 26, 74, 24, 12)
  ctx.fillStyle = 'rgba(255,80,60,.13)'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(bx + 14, y + 38, 3.2, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(255,90,71,${0.55 + 0.45 * Math.abs(Math.sin(t * 3))})`
  ctx.fill()
  ctx.fillStyle = C.bad
  ctx.font = `700 10px ${f.body}`
  ctx.fillText('REC', bx + 24, y + 42)
  // timer and waveform
  const secs = Math.floor(t * 9) + 41
  ctx.fillStyle = '#fff'
  ctx.font = `500 22px ${f.mono}`
  ctx.fillText(`0${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, x + 20, y + h / 2 + 40)
  const wx = x + 104
  const ww = w - 124
  const bars = 34
  const bw = ww / bars
  const played = clamp(t / 4) * bars
  for (let i = 0; i < bars; i++) {
    const amp = 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.6 + 1))
    const live = 0.85 + 0.15 * Math.sin(t * 8 + i)
    const bh = Math.max(4, amp * live * 56)
    const cy = y + h / 2 + 33
    roundRect(ctx, wx + i * bw + 1, cy - bh / 2, bw - 3, bh, 2)
    if (i < played) {
      const g = ctx.createLinearGradient(0, cy - bh / 2, 0, cy + bh / 2)
      g.addColorStop(0, '#ff9357')
      g.addColorStop(1, C.accent)
      ctx.fillStyle = g
    } else ctx.fillStyle = '#303030'
    ctx.fill()
  }
  ctx.fillStyle = C.text3
  ctx.font = `400 11px ${f.mono}`
  ctx.fillText('Recorded and saved to the lead', x + 20, y + h - 20)
}

function analysisCard(ctx: CanvasRenderingContext2D, f: VideoFonts, x: number, y: number, w: number, h: number, t: number): void {
  const cx = x + 84
  const cy = y + h / 2
  const r = 56
  const p = ease(t, 0.2, 2.0)
  ctx.lineCap = 'round'
  ctx.lineWidth = 10
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.strokeStyle = '#262626'
  ctx.stroke()
  ctx.save()
  ctx.shadowColor = 'rgba(236,92,19,.45)'
  ctx.shadowBlur = 16
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  g.addColorStop(0, '#ff9a62')
  g.addColorStop(1, C.accent)
  ctx.beginPath()
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.74 * p)
  ctx.strokeStyle = g
  ctx.stroke()
  ctx.restore()
  ctx.lineCap = 'butt'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#fff'
  ctx.font = `800 38px ${f.display}`
  ctx.fillText(String(Math.round(74 * p)), cx, cy + 12)
  ctx.fillStyle = C.text2
  ctx.font = `400 10.5px ${f.body}`
  ctx.fillText('Call score', cx, cy + 30)
  ctx.textAlign = 'left'
  const notes: [string, string, string, boolean][] = [
    ['+', 'Strong opening', 'Clear reason for the call', true],
    ['+', 'Booked the next step', 'Demo on Thursday', true],
    ['−', 'Talked over the client', 'Twice, at 03:12 and 05:40', false],
  ]
  const nx = x + 162
  const nw = w - 180
  const nh = (h - 40) / 3
  notes.forEach(([sign, title, sub, good], i) => {
    const a = ease(t, 0.6 + i * 0.35, 1.1 + i * 0.35)
    const ny = y + 20 + i * nh + (1 - a) * 10
    ctx.globalAlpha = a
    roundRect(ctx, nx, ny, nw, nh - 8, 12)
    ctx.fillStyle = '#171717'
    ctx.fill()
    ctx.strokeStyle = C.border
    ctx.stroke()
    ctx.fillStyle = good ? C.ok : C.bad
    ctx.font = `500 12px ${f.mono}`
    ctx.fillText(sign, nx + 12, ny + 22)
    ctx.fillStyle = C.text
    ctx.font = `700 12.5px ${f.body}`
    ctx.fillText(title, nx + 28, ny + 22)
    ctx.fillStyle = C.text2
    ctx.font = `400 11px ${f.body}`
    ctx.fillText(sub, nx + 28, ny + 38)
    ctx.globalAlpha = 1
  })
}

function managerCard(ctx: CanvasRenderingContext2D, f: VideoFonts, x: number, y: number, w: number, h: number, t: number): void {
  ctx.font = `700 11px ${f.display}`
  ctx.fillStyle = C.accent2
  ctx.fillText('TEAM', x + 18, y + 28)
  ctx.font = `400 11px ${f.mono}`
  ctx.fillStyle = C.text3
  ctx.textAlign = 'right'
  ctx.fillText(`team average ${Math.round(68 * ease(t, 0.2, 2))}`, x + w - 18, y + 28)
  ctx.textAlign = 'left'
  const team: [string, string, number, boolean][] = [
    ['NO', 'Noa', 81, true],
    ['EL', 'Eli', 74, false],
    ['AR', 'Ari', 66, false],
    ['DA', 'Dana', 52, false],
  ]
  const rh = (h - 46) / 4
  team.forEach(([ini, name, score, orange], i) => {
    const a = ease(t, 0.15 * i, 0.15 * i + 1.6)
    const ry = y + 44 + i * rh
    const mid = ry + rh / 2 - 2
    if (i) {
      ctx.fillStyle = '#1f1f1f'
      ctx.fillRect(x + 16, ry - 2, w - 32, 1)
    }
    avatar(ctx, f, x + 36, mid, ini, orange, 14)
    ctx.fillStyle = C.text
    ctx.font = `700 13.5px ${f.body}`
    ctx.fillText(name, x + 60, mid + 5)
    const bx = x + 120
    const bw = w - 200
    roundRect(ctx, bx, mid - 3, bw, 6, 3)
    ctx.fillStyle = '#262626'
    ctx.fill()
    const g = ctx.createLinearGradient(bx, 0, bx + bw, 0)
    g.addColorStop(0, C.accent)
    g.addColorStop(1, '#ff9a62')
    roundRect(ctx, bx, mid - 3, Math.max(6, (bw * score * a) / 100), 6, 3)
    ctx.fillStyle = g
    ctx.fill()
    ctx.fillStyle = '#fff'
    ctx.font = `800 19px ${f.display}`
    ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(score * a)), x + w - 20, mid + 8)
    ctx.textAlign = 'left'
  })
}

const CARDS = { pipeline: pipelineCard, recording: recordingCard, analysis: analysisCard, manager: managerCard }

/** Draws the frame at second `t` (0 to 7). The canvas is 1080×1350. */
export function drawFrame(ctx: CanvasRenderingContext2D, t: number, d: SocialDraft, a: VideoAssets): void {
  const f = a.fonts
  ctx.setTransform(VIDEO.width / W, 0, 0, VIDEO.height / H, 0, 0)
  ctx.fillStyle = C.bg
  ctx.fillRect(0, 0, W, H)
  // soft orange glows in the corners, breathing slowly
  const glow = (gx: number, gy: number, r: number, alpha: number): void => {
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, r)
    g.addColorStop(0, `rgba(236,92,19,${alpha})`)
    g.addColorStop(1, 'rgba(236,92,19,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }
  glow(W + 30, -40, 330, 0.2 + 0.03 * Math.sin(t * 1.3))
  glow(-60, H + 40, 300, 0.13 + 0.03 * Math.cos(t * 1.1))

  // logo and label
  const lh = 32
  ctx.drawImage(a.logo, 26, 26, (a.logo.naturalWidth / a.logo.naturalHeight) * lh, lh)
  ctx.fillStyle = C.text3
  ctx.font = `400 11px ${f.mono}`
  ctx.textAlign = 'right'
  ctx.fillText('IGANI CRM', W - 28, 44)
  ctx.textAlign = 'left'

  // headline: League Spartan, uppercase, last word in orange, lines slide up one after the other
  const hook = d.hook.toUpperCase()
  let size = 46
  let lines: string[] = []
  for (; size >= 30; size -= 2) {
    ctx.font = `800 ${size}px ${f.display}`
    lines = wrap(ctx, hook, W - 64)
    if (lines.length <= 3) break
  }
  const lineH = size * 1.02
  const top = 98
  lines.forEach((line, i) => {
    const p = ease(t, 0.05 + i * 0.16, 0.6 + i * 0.16)
    ctx.globalAlpha = p
    const ly = top + i * lineH + size * 0.8 + (1 - p) * 18
    if (i === lines.length - 1 && line.includes(' ')) {
      const cut = line.lastIndexOf(' ')
      const head = line.slice(0, cut + 1)
      ctx.fillStyle = C.text
      ctx.fillText(head, 32, ly)
      ctx.fillStyle = C.accent2
      ctx.fillText(line.slice(cut + 1), 32 + ctx.measureText(head).width, ly)
    } else {
      ctx.fillStyle = i === lines.length - 1 && lines.length > 1 ? C.accent2 : C.text
      ctx.fillText(line, 32, ly)
    }
  })
  ctx.globalAlpha = 1
  let y = top + lines.length * lineH + 8

  // the line under it
  ctx.font = `400 16px ${f.body}`
  const subLines = wrap(ctx, d.sub, W - 64).slice(0, 2)
  ctx.globalAlpha = ease(t, 0.6, 1.1)
  ctx.fillStyle = C.text2
  subLines.forEach((l, i) => ctx.fillText(l, 32, y + 16 + i * 21))
  ctx.globalAlpha = 1
  y += subLines.length * 21 + 22

  // the feature card
  const cardH = 214
  const cy = Math.min(y, 300)
  const cp = ease(t, 0.9, 1.5)
  ctx.globalAlpha = cp
  ctx.save()
  ctx.translate(0, (1 - cp) * 24)
  card(ctx, 24, cy, W - 48, cardH)
  CARDS[d.visual](ctx, f, 24, cy, W - 48, cardH, Math.max(0, t - 1.2))
  ctx.restore()
  ctx.globalAlpha = 1

  // three benefit lines
  const py = cy + cardH + 30
  d.points.slice(0, 3).forEach((pt, i) => {
    const p = ease(t, 3.0 + i * 0.35, 3.5 + i * 0.35)
    ctx.globalAlpha = p
    const ly = py + i * 30
    ctx.beginPath()
    ctx.arc(40 + (1 - p) * -8, ly - 5, 4, 0, Math.PI * 2)
    ctx.fillStyle = C.accent
    ctx.fill()
    ctx.fillStyle = C.text
    ctx.font = `700 16px ${f.body}`
    ctx.fillText(pt, 54 + (1 - p) * -8, ly)
  })
  ctx.globalAlpha = 1

  // call to action
  const cta = ease(t, 5.0, 5.6)
  ctx.globalAlpha = cta
  ctx.font = `800 17px ${f.display}`
  const label = d.cta.toUpperCase()
  const cw = ctx.measureText(label).width + 48
  const ctaY = H - 62 + (1 - cta) * 12
  roundRect(ctx, (W - cw) / 2, ctaY, cw, 40, 20)
  const g = ctx.createLinearGradient((W - cw) / 2, 0, (W + cw) / 2, 0)
  g.addColorStop(0, C.accent)
  g.addColorStop(1, C.accent2)
  ctx.fillStyle = g
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.textAlign = 'center'
  ctx.fillText(label, W / 2, ctaY + 26)
  ctx.textAlign = 'left'
  ctx.globalAlpha = 1
}

export async function loadAssets(fonts: VideoFonts): Promise<VideoAssets> {
  const logo = new Image()
  logo.src = '/brand/igani-logo-white.png'
  await Promise.all([
    logo.decode(),
    document.fonts.load(`800 40px ${fonts.display}`),
    document.fonts.load(`400 12px ${fonts.mono}`),
    document.fonts.load(`500 12px ${fonts.mono}`),
  ])
  return { logo, fonts }
}

/** The first H.264 profile this browser can encode at 1080×1350, or null. */
async function pickCodec(): Promise<string | null> {
  if (typeof VideoEncoder === 'undefined') return null
  for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42002a']) {
    const s = await VideoEncoder.isConfigSupported({ codec, width: VIDEO.width, height: VIDEO.height, bitrate: 8_000_000, framerate: VIDEO.fps }).catch(() => null)
    if (s?.supported) return codec
  }
  return null
}

/** Renders all frames and encodes them to an MP4 (H.264, 1080×1350, 30 fps, 7 s, no sound). */
export async function renderMp4(d: SocialDraft, a: VideoAssets, onProgress?: (pct: number) => void): Promise<Blob> {
  const codec = await pickCodec()
  if (!codec) throw new Error('This browser cannot make MP4 videos. Use a recent Chrome, Edge or Safari.')
  const canvas = document.createElement('canvas')
  canvas.width = VIDEO.width
  canvas.height = VIDEO.height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not draw the video.')
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: 'avc', width: VIDEO.width, height: VIDEO.height, frameRate: VIDEO.fps }, fastStart: 'in-memory' })
  let failure: Error | null = null
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { failure = e instanceof Error ? e : new Error(String(e)) },
  })
  encoder.configure({ codec, width: VIDEO.width, height: VIDEO.height, bitrate: 8_000_000, framerate: VIDEO.fps, avc: { format: 'avc' } })
  const total = VIDEO.fps * VIDEO.seconds
  const step = 1_000_000 / VIDEO.fps
  for (let i = 0; i < total; i++) {
    if (failure) throw failure
    drawFrame(ctx, i / VIDEO.fps, d, a)
    const frame = new VideoFrame(canvas, { timestamp: Math.round(i * step), duration: Math.round(step) })
    encoder.encode(frame, { keyFrame: i % VIDEO.fps === 0 })
    frame.close()
    while (encoder.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 4))
    if (i % 10 === 0) onProgress?.(Math.round((i / total) * 100))
  }
  await encoder.flush()
  encoder.close()
  if (failure) throw failure
  muxer.finalize()
  onProgress?.(100)
  return new Blob([muxer.target.buffer], { type: 'video/mp4' })
}
