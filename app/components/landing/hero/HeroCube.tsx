'use client'

import { useEffect, useRef } from 'react'
import { HERO_PALETTES } from './HeroCanvas'

type Axis = 0 | 1 | 2

type Cubie = {
  mesh: import('three').Mesh
  coords: [number, number, number]
}

const SIZE = 0.86
const STEP = 0.98
const RADIUS = 0.16

function rotateCoords(c: [number, number, number], axis: Axis, dir: 1 | -1): [number, number, number] {
  const [x, y, z] = c
  if (axis === 0) return dir === 1 ? [x, -z, y] : [x, z, -y]
  if (axis === 1) return dir === 1 ? [z, y, -x] : [-z, y, x]
  return dir === 1 ? [-y, x, z] : [y, -x, z]
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function makeLogoTexture(THREE: typeof import('three')) {
  const s = 512
  const canvas = document.createElement('canvas')
  canvas.width = s
  canvas.height = s
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2d context')

  ctx.clearRect(0, 0, s, s)

  ctx.save()
  ctx.translate(s / 2, s / 2)
  ctx.scale(s / 120, s / 120)
  ctx.rotate(-0.08)

  ctx.beginPath()
  ctx.ellipse(0, 2, 40, 32, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(20, 48, 96, 0.88)'
  ctx.fill()

  const capsule = (x: number, y: number, w: number, h: number, fill: string) => {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, w / 2)
    ctx.fillStyle = fill
    ctx.fill()
  }

  capsule(-24, -30, 16, 58, '#9ec0f5')
  capsule(2, -34, 16, 64, '#6ea0ee')

  ctx.globalCompositeOperation = 'destination-out'
  capsule(-19.5, -10, 7, 22, '#000')
  capsule(6.5, -12, 7, 24, '#000')
  ctx.restore()

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

function attachFaceLogo(
  THREE: typeof import('three'),
  cubie: import('three').Mesh,
  coords: [number, number, number],
  geometry: import('three').PlaneGeometry,
  material: import('three').Material
) {
  const [x, y, z] = coords
  const lift = SIZE / 2 + 0.012
  const plane = new THREE.Mesh(geometry, material)
  if (x === 1) {
    plane.rotation.y = Math.PI / 2
    plane.position.x = lift
  } else if (x === -1) {
    plane.rotation.y = -Math.PI / 2
    plane.position.x = -lift
  } else if (y === 1) {
    plane.rotation.x = -Math.PI / 2
    plane.position.y = lift
  } else if (y === -1) {
    plane.rotation.x = Math.PI / 2
    plane.position.y = -lift
  } else if (z === 1) {
    plane.position.z = lift
  } else {
    plane.rotation.y = Math.PI
    plane.position.z = -lift
  }
  cubie.add(plane)
}

/**
 * Interactive 3×3 cube for the hero — metallic IGANI navy, drag to spin,
 * occasional layer turns. Original, not a Spline embed.
 */
export function HeroCube({ palette = 0, className = '' }: { palette?: number; className?: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const paletteRef = useRef(palette)

  useEffect(() => {
    paletteRef.current = palette
  }, [palette])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const coarse = window.matchMedia('(pointer: coarse)').matches
    let disposed = false
    let cleanup = () => {}

    const boot = async () => {
      const THREE = await import('three')
      const { RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js')
      const { RoomEnvironment } = await import('three/examples/jsm/environments/RoomEnvironment.js')
      if (disposed || !host) return

      const renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: true,
        powerPreference: 'high-performance',
      })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.12

      const canvas = renderer.domElement
      canvas.className = 'absolute inset-0 h-full w-full cursor-grab touch-none active:cursor-grabbing'
      canvas.setAttribute('aria-hidden', 'true')
      host.appendChild(canvas)

      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40)
      camera.position.set(0, 0.08, 11)

      const pmrem = new THREE.PMREMGenerator(renderer)
      const env = pmrem.fromScene(new RoomEnvironment(), 0.04)
      scene.environment = env.texture
      pmrem.dispose()

      const material = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#102448'),
        metalness: 0.94,
        roughness: 0.2,
        clearcoat: 0.6,
        clearcoatRoughness: 0.16,
        envMapIntensity: 1.2,
      })
      const geometry = new RoundedBoxGeometry(SIZE, SIZE, SIZE, 4, RADIUS)

      const cubeRoot = new THREE.Group()
      cubeRoot.rotation.set(-0.28, 0.48, 0.1)
      scene.add(cubeRoot)

      const cubies: Cubie[] = []
      const logoTex = makeLogoTexture(THREE)
      const logoGeom = new THREE.PlaneGeometry(0.5, 0.5)
      const logoMat = new THREE.MeshBasicMaterial({
        map: logoTex,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      })

      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (let z = -1; z <= 1; z++) {
            const mesh = new THREE.Mesh(geometry, material)
            mesh.position.set(x * STEP, y * STEP, z * STEP)
            cubeRoot.add(mesh)
            cubies.push({ mesh, coords: [x, y, z] })
            if (Math.abs(x) + Math.abs(y) + Math.abs(z) === 1) {
              attachFaceLogo(THREE, mesh, [x, y, z], logoGeom, logoMat)
            }
          }
        }
      }

      const key = new THREE.PointLight('#d6e6ff', 60, 0, 2)
      key.position.set(3.4, 3.2, 5.2)
      scene.add(key)
      const fill = new THREE.PointLight('#4080E0', 36, 0, 2)
      fill.position.set(-4.2, -2.4, 2.2)
      scene.add(fill)
      const rim = new THREE.PointLight('#80A0E0', 28, 0, 2)
      rim.position.set(1.4, -3.6, -4.8)
      scene.add(rim)
      scene.add(new THREE.AmbientLight('#1a2a4a', 0.45))

      const targetAccent = new THREE.Color()
      const targetFill = new THREE.Color()
      const applyPalette = (index: number, snap = false) => {
        const p = HERO_PALETTES[index % HERO_PALETTES.length]
        targetAccent.setRGB(p.c3[0], p.c3[1], p.c3[2])
        targetFill.setRGB(p.c2[0], p.c2[1], p.c2[2])
        if (snap) {
          key.color.copy(targetAccent)
          fill.color.copy(targetFill)
          rim.color.copy(targetFill)
        }
      }
      applyPalette(paletteRef.current, true)

      const resize = () => {
        const w = host.clientWidth
        const h = host.clientHeight
        if (w < 2 || h < 2) return
        renderer.setSize(w, h)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      resize()
      const ro = new ResizeObserver(resize)
      ro.observe(host)

      let visible = true
      const io = new IntersectionObserver(([e]) => {
        visible = e.isIntersecting
      }, { threshold: 0.05 })
      io.observe(host)

      const axisX = new THREE.Vector3(1, 0, 0)
      const axisY = new THREE.Vector3(0, 1, 0)
      const axisZ = new THREE.Vector3(0, 0, 1)

      let dragging = false
      let lastX = 0
      let lastY = 0
      let velX = 0
      let velY = 0
      const onDown = (e: PointerEvent) => {
        dragging = true
        lastX = e.clientX
        lastY = e.clientY
        canvas.setPointerCapture(e.pointerId)
      }
      const onMove = (e: PointerEvent) => {
        if (!dragging) return
        const dx = e.clientX - lastX
        const dy = e.clientY - lastY
        lastX = e.clientX
        lastY = e.clientY
        velX = dx
        velY = dy
        cubeRoot.rotateOnWorldAxis(axisY, dx * 0.008)
        cubeRoot.rotateOnWorldAxis(axisX, dy * 0.008)
      }
      const onUp = (e: PointerEvent) => {
        dragging = false
        try {
          canvas.releasePointerCapture(e.pointerId)
        } catch {
          /* already released */
        }
      }
      canvas.addEventListener('pointerdown', onDown)
      canvas.addEventListener('pointermove', onMove)
      canvas.addEventListener('pointerup', onUp)
      canvas.addEventListener('pointercancel', onUp)

      const twistGroup = new THREE.Group()
      cubeRoot.add(twistGroup)
      let twisting = false
      let twistT = 0
      let twistDur = 0.9
      let twistAxis: Axis = 1
      let twistDir: 1 | -1 = 1
      let twistLayer = 1
      let nextTwist = reduced ? Number.POSITIVE_INFINITY : 2.2

      const startTwist = () => {
        if (twisting || dragging) return
        twistAxis = ([0, 1, 2] as Axis[])[Math.floor(Math.random() * 3)]
        twistLayer = ([-1, 0, 1] as const)[Math.floor(Math.random() * 3)]
        twistDir = Math.random() > 0.5 ? 1 : -1
        cubies
          .filter((c) => Math.round(c.coords[twistAxis]) === twistLayer)
          .forEach((c) => twistGroup.attach(c.mesh))
        twisting = true
        twistT = 0
        twistDur = 0.72 + Math.random() * 0.25
      }

      const finishTwist = () => {
        cubies.forEach((c) => {
          if (c.mesh.parent === twistGroup) cubeRoot.attach(c.mesh)
        })
        twistGroup.rotation.set(0, 0, 0)
        cubies.forEach((c) => {
          if (Math.round(c.coords[twistAxis]) !== twistLayer) return
          const next = rotateCoords(c.coords, twistAxis, twistDir)
          c.coords = [Math.round(next[0]), Math.round(next[1]), Math.round(next[2])] as [number, number, number]
        })
        twisting = false
      }

      let raf = 0
      let last = performance.now()
      const loop = (now: number) => {
        raf = requestAnimationFrame(loop)
        if (!visible || document.hidden) return
        const dt = Math.min(0.05, (now - last) / 1000)
        last = now

        applyPalette(paletteRef.current)
        key.color.lerp(targetAccent, 0.06)
        fill.color.lerp(targetFill, 0.06)
        rim.color.lerp(targetFill, 0.06)

        if (!reduced) {
          if (!dragging) {
            cubeRoot.rotateOnWorldAxis(axisY, 0.22 * dt)
            cubeRoot.rotateOnWorldAxis(axisX, 0.08 * dt)
            velX *= 0.92
            velY *= 0.92
            if (Math.abs(velX) > 0.15 || Math.abs(velY) > 0.15) {
              cubeRoot.rotateOnWorldAxis(axisY, velX * 0.004)
              cubeRoot.rotateOnWorldAxis(axisX, velY * 0.004)
            }
          }
          if (!coarse) {
            nextTwist -= dt
            if (nextTwist <= 0) {
              startTwist()
              nextTwist = 3.6 + Math.random() * 2.4
            }
          }
        }

        if (twisting) {
          const prev = easeOutCubic(Math.min(1, twistT / twistDur))
          twistT += dt
          const next = easeOutCubic(Math.min(1, twistT / twistDur))
          const delta = (next - prev) * twistDir * (Math.PI / 2)
          const axis = twistAxis === 0 ? axisX : twistAxis === 1 ? axisY : axisZ
          twistGroup.rotateOnAxis(axis, delta)
          if (twistT >= twistDur) finishTwist()
        }

        renderer.render(scene, camera)
      }
      raf = requestAnimationFrame(loop)

      cleanup = () => {
        cancelAnimationFrame(raf)
        ro.disconnect()
        io.disconnect()
        canvas.removeEventListener('pointerdown', onDown)
        canvas.removeEventListener('pointermove', onMove)
        canvas.removeEventListener('pointerup', onUp)
        canvas.removeEventListener('pointercancel', onUp)
        geometry.dispose()
        material.dispose()
        logoGeom.dispose()
        logoMat.dispose()
        logoTex.dispose()
        env.texture.dispose()
        renderer.dispose()
        canvas.remove()
      }

      if (disposed) cleanup()
    }

    void boot()

    return () => {
      disposed = true
      cleanup()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      className={`relative h-full w-full ${className}`}
      role="img"
      aria-label="Interactive 3D cube. Drag to turn it."
    />
  )
}
