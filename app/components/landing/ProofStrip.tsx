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
}

/** Stats + a continuously scrolling stack marquee. */
export function ProofStrip({ projectsLive }: ProofStripProps) {
  const { language } = useLanguage()
  const c = landingContent.proof

  const stats = [
    { value: projectsLive > 0 ? `${projectsLive}+` : '—', label: c.projectsLive[language] },
    { value: '3', label: c.founders[language] },
    { value: '1', label: c.ownProducts[language] },
    { value: c.replyValue[language], label: c.reply[language] },
  ]

  return (
    <section className="relative border-y border-white/[0.06] bg-[#030814]">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-white/[0.06] px-4 sm:px-6 md:grid-cols-4 md:divide-x lg:px-8">
        {stats.map((s) => (
          <div key={s.label} className="py-8 md:px-8 md:py-10 md:first:pl-0 md:last:pr-0">
            <p className="font-mono text-3xl font-semibold tracking-tight text-white sm:text-4xl">{s.value}</p>
            <p className="!mt-1 text-sm text-white/55">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="relative overflow-hidden border-t border-white/[0.06] py-4">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[#030814] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[#030814] to-transparent" />
        <div className="landing-marquee flex w-max gap-10 pr-10">
          {[...STACK, ...STACK].map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="flex items-center gap-10 font-mono text-xs uppercase tracking-[0.25em] text-white/45"
            >
              {item}
              <span className="h-1 w-1 rounded-full bg-[#4080E0]/70" />
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
