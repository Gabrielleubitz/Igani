'use client'

import { useEffect, useRef } from 'react'

const CYAN = '#00F0FF'
const VIOLET = '#7000FF'

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
}

/** Main "modern site" window: nav, gradient headline, CTA, card row. */
function drawWindow(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  rounded(ctx, 4, 4, w - 8, h - 8, 36)
  ctx.fillStyle = 'rgba(16, 16, 22, 0.94)'
  ctx.fill()
  const edge = ctx.createLinearGradient(0, 0, w, h)
  edge.addColorStop(0, CYAN)
  edge.addColorStop(1, VIOLET)
  ctx.lineWidth = 4
  ctx.strokeStyle = edge
  ctx.stroke()

  // Title bar
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath()
    ctx.arc(52 + i * 34, 50, 10, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  })
  rounded(ctx, w / 2 - 170, 34, 340, 32, 16)
  ctx.fillStyle = 'rgba(255,255,255,0.06)'
  ctx.fill()

  // Nav
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  rounded(ctx, 60, 120, 120, 22, 11)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  for (let i = 0; i < 4; i++) {
    rounded(ctx, w - 470 + i * 100, 124, 70, 14, 7)
    ctx.fill()
  }

  // Headline
  const head = ctx.createLinearGradient(60, 0, w - 200, 0)
  head.addColorStop(0, '#ffffff')
  head.addColorStop(0.6, CYAN)
  head.addColorStop(1, VIOLET)
  ctx.fillStyle = head
  rounded(ctx, 60, 210, w - 260, 56, 18)
  ctx.fill()
  rounded(ctx, 60, 286, w - 420, 56, 18)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  rounded(ctx, 60, 374, w - 380, 16, 8)
  ctx.fill()
  rounded(ctx, 60, 402, w - 520, 16, 8)
  ctx.fill()

  // CTA
  const cta = ctx.createLinearGradient(60, 0, 300, 0)
  cta.addColorStop(0, CYAN)
  cta.addColorStop(1, VIOLET)
  ctx.fillStyle = cta
  rounded(ctx, 60, 450, 230, 58, 29)
  ctx.fill()

  // Cards
  const cw = (w - 120 - 40) / 3
  for (let i = 0; i < 3; i++) {
    const x = 60 + i * (cw + 20)
    rounded(ctx, x, 550, cw, h - 610, 22)
    ctx.fillStyle = 'rgba(255,255,255,0.05)'
    ctx.fill()
    ctx.lineWidth = 2
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.stroke()
    ctx.fillStyle = i === 1 ? CYAN : 'rgba(255,255,255,0.35)'
    rounded(ctx, x + 22, 576, 44, 44, 12)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    rounded(ctx, x + 22, 640, cw - 60, 12, 6)
    ctx.fill()
    rounded(ctx, x + 22, 662, cw - 100, 12, 6)
    ctx.fill()
  }
}

/** Small floating stat chip. */
function drawChip(ctx: CanvasRenderingContext2D, w: number, h: number, accent: string, bars: number) {
  ctx.clearRect(0, 0, w, h)
  rounded(ctx, 3, 3, w - 6, h - 6, 28)
  ctx.fillStyle = 'rgba(18, 18, 26, 0.92)'
  ctx.fill()
  ctx.lineWidth = 3
  ctx.strokeStyle = accent
  ctx.stroke()
  ctx.fillStyle = accent
  rounded(ctx, 30, 30, 120, 40, 12)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  rounded(ctx, 30, 88, w - 60, 12, 6)
  ctx.fill()
  const bw = (w - 60 - (bars - 1) * 10) / bars
  for (let i = 0; i < bars; i++) {
    const bh = 30 + ((i * 37) % 70)
    ctx.fillStyle = i === bars - 1 ? accent : 'rgba(255,255,255,0.18)'
    rounded(ctx, 30 + i * (bw + 10), h - 30 - bh, bw, bh, 6)
    ctx.fill()
  }
}

/**
 * Sleek floating interface rendered with three.js. Rotates with scroll and
 * leans toward the pointer; pauses offscreen; renders a single still frame
 * when the visitor prefers reduced motion.
 */
export function HeroScene() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let disposed = false
    let cleanup = () => {}

    import('three').then((THREE) => {
      if (disposed) return
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const coarse = window.matchMedia('(pointer: coarse)').matches

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, coarse ? 1.5 : 2))
      renderer.outputColorSpace = THREE.SRGBColorSpace
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
      camera.position.set(0, 0, 9)

      const group = new THREE.Group()
      scene.add(group)

      const textures: import('three').Texture[] = []
      const geometries: import('three').BufferGeometry[] = []
      const materials: import('three').Material[] = []

      const makePanel = (cw: number, ch: number, draw: (ctx: CanvasRenderingContext2D) => void, width: number) => {
        const canvas = document.createElement('canvas')
        canvas.width = cw
        canvas.height = ch
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('2d context')
        draw(ctx)
        const tex = new THREE.CanvasTexture(canvas)
        tex.colorSpace = THREE.SRGBColorSpace
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
        const geo = new THREE.PlaneGeometry(width, (width * ch) / cw)
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false })
        textures.push(tex)
        geometries.push(geo)
        materials.push(mat)
        return new THREE.Mesh(geo, mat)
      }

      const main = makePanel(1280, 860, (c) => drawWindow(c, 1280, 860), 4.6)
      group.add(main)

      const chipA = makePanel(420, 260, (c) => drawChip(c, 420, 260, CYAN, 6), 1.4)
      chipA.position.set(2.35, 1.25, 0.9)
      group.add(chipA)

      const chipB = makePanel(420, 260, (c) => drawChip(c, 420, 260, VIOLET, 5), 1.3)
      chipB.position.set(-2.4, -1.15, 1.1)
      group.add(chipB)

      const resize = () => {
        const w = mount.clientWidth
        const h = mount.clientHeight
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.position.z = w / h < 1 ? 11.5 : 9
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(mount)

      let px = 0
      let py = 0
      const onPointer = (e: PointerEvent) => {
        px = (e.clientX / window.innerWidth) * 2 - 1
        py = (e.clientY / window.innerHeight) * 2 - 1
      }

      let rx = 0
      let ry = 0
      const clock = new THREE.Clock()
      const frame = () => {
        const t = clock.getElapsedTime()
        const rect = mount.getBoundingClientRect()
        const scroll = Math.min(Math.max(-rect.top / Math.max(rect.height, 1), -0.5), 1.5)
        const targetY = -0.45 + scroll * 1.1 + px * 0.18
        const targetX = 0.12 - scroll * 0.25 + py * 0.12
        ry += (targetY - ry) * 0.08
        rx += (targetX - rx) * 0.08
        group.rotation.set(rx, ry + Math.sin(t * 0.6) * 0.04, 0)
        group.position.y = Math.sin(t * 0.9) * 0.06
        chipA.position.y = 1.25 + Math.sin(t * 1.3) * 0.08
        chipB.position.y = -1.15 + Math.cos(t * 1.1) * 0.08
        renderer.render(scene, camera)
      }

      if (reduced) {
        group.rotation.set(0.1, -0.35, 0)
        renderer.render(scene, camera)
      } else {
        window.addEventListener('pointermove', onPointer, { passive: true })
        const io = new IntersectionObserver(([entry]) => {
          renderer.setAnimationLoop(entry.isIntersecting ? frame : null)
        })
        io.observe(mount)
        renderer.setAnimationLoop(frame)
        cleanup = () => {
          io.disconnect()
          window.removeEventListener('pointermove', onPointer)
        }
      }

      const prevCleanup = cleanup
      cleanup = () => {
        prevCleanup()
        ro.disconnect()
        renderer.setAnimationLoop(null)
        textures.forEach((t) => t.dispose())
        geometries.forEach((g) => g.dispose())
        materials.forEach((m) => m.dispose())
        renderer.dispose()
        renderer.domElement.remove()
      }
    })

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return <div ref={mountRef} aria-hidden className="relative h-full w-full [&>canvas]:h-full [&>canvas]:w-full" />
}
