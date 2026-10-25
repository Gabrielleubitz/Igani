'use client'

import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import { ElegantButton } from './ElegantButton'

const ease = [0.22, 1, 0.36, 1] as const

/** Counts 0.00 → 0.05 once it scrolls into view. */
function SecondsCounter() {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const reduce = useReducedMotion()
  const [value, setValue] = useState(reduce ? 0.05 : 0)

  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(0, 0.05, { duration: 2, delay: 1.1, ease, onUpdate: setValue })
    return () => controls.stop()
  }, [inView, reduce])

  return <span ref={ref} className="whitespace-nowrap font-cormorant text-3xl italic tabular-nums text-[#1F1C18]">{value.toFixed(2)} seconds</span>
}

/** A refined site, rendered as a framed card that turns slowly in 3D as you scroll. */
function FramedSite() {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const rotY = useSpring(useTransform(scrollYProgress, [0.2, 0.8], [-14, 10]), { stiffness: 60, damping: 20 })
  const rotX = useSpring(useTransform(scrollYProgress, [0.2, 0.8], [6, -4]), { stiffness: 60, damping: 20 })
  const lift = useTransform(scrollYProgress, [0, 1], [30, -30])

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[520px] [perspective:1400px]">
      <motion.div
        style={reduce ? undefined : { rotateY: rotY, rotateX: rotX, y: lift }}
        className="relative w-full border border-[#E2D9CB] bg-[#FBF8F3] p-6 shadow-[0_40px_80px_-30px_rgba(60,45,25,0.35)] sm:p-8"
      >
        <div className="flex items-center justify-between border-b border-[#E2D9CB] pb-4">
          <span className="font-cormorant text-xl italic text-[#1F1C18]">Maison Arden</span>
          <span className="hidden gap-5 text-[9px] uppercase tracking-[0.3em] text-[#6E665C] sm:flex">
            <span>Studio</span>
            <span>Work</span>
            <span>Contact</span>
          </span>
        </div>
        <div className="mt-6 grid grid-cols-[1.1fr_1fr] gap-5">
          <div className="flex flex-col justify-center">
            <span className="text-[9px] uppercase tracking-[0.3em] text-[#A9845A]">Est. 2014</span>
            <span className="mt-3 font-cormorant text-3xl leading-[1.05] text-[#1F1C18] sm:text-4xl">
              Quiet
              <br />
              <em>confidence.</em>
            </span>
            <span className="mt-5 inline-block w-fit border border-[#1F1C18] px-4 py-2 text-[8px] uppercase tracking-[0.3em] text-[#1F1C18]">
              Book a visit
            </span>
          </div>
          <div className="aspect-[3/4] rounded-t-full bg-[radial-gradient(circle_at_40%_30%,#E8D6BC,#C9AE8A_55%,#9C7F5C)]" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#E2D9CB] pt-5">
          {['Craft', 'Service', 'Detail'].map((w) => (
            <div key={w}>
              <span className="font-cormorant text-lg italic text-[#1F1C18]">{w}</span>
              <div className="mt-2 h-px w-10 bg-[#A9845A]" />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

export function Hero({ onCta }: { onCta: () => void }) {
  const lines: { text: string; accent?: boolean }[] = [
    { text: 'Your website' },
    { text: 'is leaking', accent: true },
    { text: 'clients.', accent: true },
  ]

  return (
    <section className="relative px-6 pb-24 pt-10 sm:px-10 lg:pt-16">
      <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.2, ease }}
            className="text-[11px] uppercase tracking-[0.4em] text-[#A9845A]"
          >
            A note on first impressions
          </motion.span>

          <h1 className="group mt-8 font-cormorant text-[15vw] font-normal leading-[0.95] tracking-[-0.01em] text-[#1F1C18] sm:text-7xl lg:text-[5.75rem]">
            {lines.map((l, i) => (
              <span key={l.text} className="block overflow-hidden pb-[0.06em]">
                <motion.span
                  initial={{ y: '105%' }}
                  animate={{ y: '0%' }}
                  transition={{ duration: 1.1, delay: 0.15 + i * 0.12, ease }}
                  className={`inline-block ${l.accent ? 'elegant-shimmer italic' : ''}`}
                >
                  {l.text}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.6, ease }}
            className="!mt-8 max-w-md text-lg leading-relaxed text-[#6E665C]"
          >
            People eat with their eyes. If your site looks like 2018, they assume your service is too.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.85, ease }}
            className="mt-10 flex items-baseline gap-4 border-l border-[#A9845A] pl-5"
          >
            <SecondsCounter />
            <span className="text-sm text-[#6E665C]">is all the mind needs to judge your authority.</span>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 1, ease }} className="mt-12">
            <ElegantButton onClick={onCta}>Fix your front door</ElegantButton>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.4, delay: 0.4, ease }}>
          <FramedSite />
        </motion.div>
      </div>
    </section>
  )
}
