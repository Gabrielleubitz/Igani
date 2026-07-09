import Link from 'next/link'
import { User } from 'lucide-react'
import { getFounderProfiles, founderSlug } from '@/lib/seo/founders'
import { SITE_NAME } from '@/lib/seo/site'

/** Visible founder index — crawlable HTML with links to dedicated profile pages. */
export async function AboutFoundersSeo() {
  const founders = await getFounderProfiles()

  return (
    <section
      className="border-y border-slate-700/50 px-4 py-12"
      aria-labelledby="founders-index-heading"
    >
      <div className="mx-auto max-w-7xl">
        <h2 id="founders-index-heading" className="text-center text-3xl font-bold text-white">
          {SITE_NAME} Co-Founders
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
          Meet the founders behind {SITE_NAME} — web development, design, and product studio.
        </p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {founders.map((founder) => (
            <li key={founder.name}>
              <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/60 shadow-xl shadow-slate-950/40 transition-colors hover:border-cyan-500/40">
                <div className="relative aspect-[3/4] w-full min-h-[220px] bg-slate-900/50">
                  {founder.imageUrl ? (
                    <img
                      src={founder.imageUrl}
                      alt={founder.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500/25 to-blue-500/20">
                      <User className="h-16 w-16 text-cyan-400/80" aria-hidden />
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col border-t border-slate-700/50 p-6">
                  <h3 className="text-xl font-bold text-white">{founder.name}</h3>
                  <p className="mt-1 text-sm font-medium text-cyan-400">{founder.position}</p>
                  <p className="mt-3 line-clamp-4 flex-1 text-sm leading-relaxed text-slate-300">
                    {founder.bio}
                  </p>
                  <Link
                    href={`/about/team/${founderSlug(founder.name)}`}
                    className="mt-5 inline-flex text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
                  >
                    View profile →
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
