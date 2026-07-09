import Link from 'next/link'
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
              <Link
                href={`/about/team/${founderSlug(founder.name)}`}
                className="block h-full rounded-2xl border border-slate-700/50 bg-slate-800/60 p-6 transition-colors hover:border-cyan-500/40 hover:bg-slate-800/80"
              >
                <h3 className="text-xl font-bold text-white">{founder.name}</h3>
                <p className="mt-1 text-sm font-medium text-cyan-400">{founder.position}</p>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-slate-300">
                  {founder.bio}
                </p>
                <span className="mt-4 inline-block text-sm font-semibold text-cyan-400">
                  View profile →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
