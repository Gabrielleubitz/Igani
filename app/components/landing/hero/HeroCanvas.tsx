'use client'

import { useEffect, useRef } from 'react'
import { Mesh, Program, Renderer, Triangle } from 'ogl'

const VERT = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

// Domain-warped FBM "liquid aurora" in IGANI blues, with a cursor-driven bloom.
const FRAG = /* glsl */ `
precision highp float;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uMouseStrength;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  vec2 p = vec2(uv.x * aspect, uv.y) * 1.6;
  float t = uTime * 0.07;

  vec2 m = vec2(uMouse.x * aspect, uMouse.y) * 1.6;
  float d = length(p - m);
  float bloom = exp(-d * d * 3.2) * uMouseStrength;

  // Cursor gently bends the field
  p += normalize(p - m + 1e-4) * bloom * 0.25;

  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t * 0.8));
  vec2 r = vec2(
    fbm(p + 3.6 * q + vec2(1.7, 9.2) + 0.15 * t),
    fbm(p + 3.6 * q + vec2(8.3, 2.8) + 0.126 * t)
  );
  float f = fbm(p + 3.2 * r);
  f += bloom * 0.55;

  vec3 c0 = vec3(0.004, 0.024, 0.075);   // deep navy base
  vec3 c1 = uC1;
  vec3 c2 = uC2;
  vec3 c3 = uC3;
  vec3 c4 = vec3(0.86, 0.92, 1.0);       // highlight

  vec3 col = mix(c0, c1, smoothstep(0.15, 0.55, f));
  col = mix(col, c2, smoothstep(0.50, 0.82, f) * 0.95);
  col = mix(col, c3, smoothstep(0.74, 0.98, f) * 0.75);
  col = mix(col, c4, smoothstep(0.92, 1.15, f) * 0.5);

  // Subtle scanline shimmer
  col += 0.015 * sin(uv.y * uRes.y * 0.9 + uTime * 2.0);

  // Vignette
  float vig = smoothstep(1.25, 0.35, length(uv - 0.5) * 1.5);
  col *= 0.25 + 0.75 * vig;

  gl_FragColor = vec4(col, 1.0);
}
`

/** Colour stops (mid, accent, light) per palette. Index 0 is the brand default. */
export const HERO_PALETTES: { name: string; c1: [number, number, number]; c2: [number, number, number]; c3: [number, number, number] }[] = [
  { name: 'igani blue', c1: [0.02, 0.09, 0.26], c2: [0.251, 0.502, 0.878], c3: [0.502, 0.627, 0.878] },
  { name: 'after hours', c1: [0.09, 0.04, 0.22], c2: [0.48, 0.28, 0.9], c3: [0.78, 0.6, 1.0] },
  { name: 'sea glass', c1: [0.02, 0.14, 0.16], c2: [0.14, 0.72, 0.62], c3: [0.6, 0.95, 0.85] },
  { name: 'darkroom', c1: [0.22, 0.05, 0.05], c2: [0.95, 0.35, 0.3], c3: [1.0, 0.72, 0.55] },
]

/**
 * Full-bleed WebGL shader background. Pauses when off-screen or tab hidden.
 * Falls back to a static gradient for reduced motion / no WebGL.
 */
export function HeroCanvas({ className = '', palette = 0 }: { className?: string; palette?: number }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const programRef = useRef<Program | null>(null)
  // Smoothly interpolated colour targets
  const colorRef = useRef({
    cur: HERO_PALETTES[0],
    target: HERO_PALETTES[0],
  })

  useEffect(() => {
    colorRef.current.target = HERO_PALETTES[palette % HERO_PALETTES.length]
  }, [palette])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let renderer: Renderer
    try {
      renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio || 1, 1.5),
        alpha: false,
        antialias: false,
        powerPreference: 'high-performance',
      })
    } catch {
      return
    }
    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.position = 'absolute'
    canvas.style.inset = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    host.appendChild(canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: VERT,
      fragment: FRAG,
      uniforms: {
        uTime: { value: 0 },
        uRes: { value: [1, 1] },
        uMouse: { value: [0.5, 0.5] },
        uMouseStrength: { value: 0 },
        uC1: { value: [...HERO_PALETTES[0].c1] },
        uC2: { value: [...HERO_PALETTES[0].c2] },
        uC3: { value: [...HERO_PALETTES[0].c3] },
      },
    })
    programRef.current = program
    const mesh = new Mesh(gl, { geometry, program })
    const cur = {
      c1: [...HERO_PALETTES[0].c1] as number[],
      c2: [...HERO_PALETTES[0].c2] as number[],
      c3: [...HERO_PALETTES[0].c3] as number[],
    }
    const lerpTo = (a: number[], b: readonly number[], k: number) => {
      for (let i = 0; i < 3; i++) a[i] += (b[i] - a[i]) * k
    }

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = host
      renderer.setSize(w, h)
      program.uniforms.uRes.value = [gl.canvas.width, gl.canvas.height]
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(host)

    // Pointer → uv, smoothed in the loop
    let targetX = 0.5
    let targetY = 0.5
    let mx = 0.5
    let my = 0.5
    let targetStrength = 0
    let strength = 0
    const coarse = window.matchMedia('(pointer: coarse)').matches

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect()
      targetX = (e.clientX - r.left) / r.width
      targetY = 1 - (e.clientY - r.top) / r.height
      targetStrength = 1
    }
    const onLeave = () => {
      targetStrength = 0
    }
    if (!coarse) {
      window.addEventListener('pointermove', onMove, { passive: true })
      document.documentElement.addEventListener('pointerleave', onLeave)
    } else {
      // On touch, drift the bloom slowly on its own
      targetStrength = 0.6
    }

    let visible = true
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
      },
      { threshold: 0.01 }
    )
    io.observe(host)

    let raf = 0
    const start = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      if (!visible || document.hidden) return
      const t = (now - start) / 1000
      if (coarse) {
        targetX = 0.5 + Math.sin(t * 0.35) * 0.3
        targetY = 0.5 + Math.cos(t * 0.27) * 0.25
      }
      mx += (targetX - mx) * 0.06
      my += (targetY - my) * 0.06
      strength += (targetStrength - strength) * 0.05
      program.uniforms.uTime.value = t
      program.uniforms.uMouse.value = [mx, my]
      program.uniforms.uMouseStrength.value = strength
      const target = colorRef.current.target
      lerpTo(cur.c1, target.c1, 0.035)
      lerpTo(cur.c2, target.c2, 0.035)
      lerpTo(cur.c3, target.c3, 0.035)
      program.uniforms.uC1.value = cur.c1
      program.uniforms.uC2.value = cur.c2
      program.uniforms.uC3.value = cur.c3
      renderer.render({ scene: mesh })
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      const ext = gl.getExtension('WEBGL_lose_context')
      ext?.loseContext()
      canvas.remove()
    }
  }, [])

  return (
    <div
      ref={hostRef}
      aria-hidden
      className={`absolute inset-0 overflow-hidden bg-[radial-gradient(120%_90%_at_50%_10%,#0a2a6a_0%,#041027_45%,#020812_100%)] ${className}`}
    />
  )
}
