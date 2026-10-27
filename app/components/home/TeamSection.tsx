'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, User } from 'lucide-react'
import { TeamMember } from '@/types'
import { ChapterBody, ChapterOpener } from '@/app/components/landing/fx/ChapterOpener'

function slug(name: string) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

/** "Our main team": the founders, with their faces, roles and a link to each profile. */
export function TeamSection({ team, loading }: { team: TeamMember[]; loading: boolean }) {
  const people = team.slice(0, 3)
  return (
    <section id="team" className="relative scroll-mt-20">
      <ChapterOpener
        index="03"
        label="Our main team"
        aside="you talk to us, not an account manager."
        title="The people *doing the work*."
        sub="Three founders who design, build and run products of our own. The same people you meet on the first call build your site."
      />
      <ChapterBody className="bg-[#030814] pb-24 pt-14 sm:pb-32 sm:pt-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {loading && people.length === 0
              ? [0, 1, 2].map((i) => (
                  <div key={i} className="aspect-[3/4] animate-pulse rounded-[28px] border border-white/[0.06] bg-white/[0.02]" />
                ))
              : people.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ y: 30 }}
                    whileInView={{ y: 0 }}
                    viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                    transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Link
                      href={`/about/team/${slug(m.name)}`}
                      className="group block overflow-hidden rounded-[28px] border border-white/[0.08] bg-[#061225]/80 transition-colors hover:border-white/20"
                    >
                      <div className="aspect-[4/5] w-full overflow-hidden bg-[#081833]">
                        {m.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={m.imageUrl}
                            alt={m.name}
                            loading="lazy"
                            className="h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <User className="h-20 w-20 text-[#9ec0f5]/70" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-end justify-between gap-4 p-6">
                        <div>
                          <h3 className="text-2xl font-semibold tracking-[-0.02em] text-white">{m.name}</h3>
                          <p className="font-display !mt-1 text-lg leading-snug text-[#dbe6ff]">{m.position}</p>
                        </div>
                        <ArrowRight className="mb-1 h-5 w-5 shrink-0 text-white/40 transition-transform group-hover:translate-x-0.5 group-hover:text-white" />
                      </div>
                    </Link>
                  </motion.div>
                ))}
          </div>
        </div>
      </ChapterBody>
    </section>
  )
}
