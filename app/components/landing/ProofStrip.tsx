'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { landingContent } from '@/lib/landingContent'

const STACK = [
  'Next.js',
  'React',
  'TypeScript',
  'Tailwind',
  'Framer Motion',
  'WebGL',
  'Firebase',
  'Stripe',
  'OpenAI',
  'Vercel Edge',
  'Prisma',
  'Cloudinary',
]

type ProofStripProps = {
  projectsLive: number
  founders: number
}

/** A few honest numbers + a continuously scrolling stack marquee. */
export function ProofStrip({ projectsLive, founders }: ProofStripProps) {
  const { language } = useLanguage()
  const c = landingContent.proof

  const stats = [
    { value: projectsLive > 0 ? String(projectsLive) : '—', label: c.projectsLive[language], mark: true },
    { value: String(founders || 3), label: c.founders[language] },
    { value: '1', label: c.ownProducts[language] },
    { value: c.replyValue[language], label: c.reply[language] },
  ]

  return (
    <section className="relative border-y border-white/[0.06] bg-[#030814]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 divide-white/[0.06] md:grid-cols-4 md:divide-x">
          {stats.map((s) => (
            <div key={s.label} className="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0">
              <p className="!mt-0 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
                {s.value}
                {s.mark && <sup className="font-display ml-1 text-lg text-[#9ec0f5]">*</sup>}
              </p>
              <p className="!mt-1 text-sm text-white/55">{s.label}</p>
            </div>
          ))}
        </div>
        <p className="font-display !mt-0 pb-5 text-[15px] text-white/45">
          <span className="text-[#9ec0f5]">*</span> {c.footnote[language]}
        </p>
      </div>

      <div className="relative overflow-hidden border-t border-white/[0.06] py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#030814] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#030814] to-transparent" />
        <div className="landing-marquee flex w-max gap-10 pr-10">
          {[...STACK, ...STACK].map((item, i) => (
            <span key={`${item}-${i}`} className="flex items-center gap-10 text-sm text-white/45">
              {item}
              <span className="h-1 w-1 rounded-full bg-white/25" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
