import { getFounderProfiles, founderSlug } from '@/lib/seo/founders'
import { SITE_NAME } from '@/lib/seo/site'

/** Server-rendered founder copy for search engines (visible to screen readers). */
export async function AboutFoundersSeo() {
  const founders = await getFounderProfiles()

  return (
    <section className="sr-only" aria-label={`${SITE_NAME} co-founders`}>
      <h2>{SITE_NAME} Co-Founders</h2>
      {founders.map((founder) => (
        <article key={founder.name} id={founderSlug(founder.name)}>
          <h3>{founder.name}</h3>
          <p>{founder.position}</p>
          <p>{founder.bio}</p>
        </article>
      ))}
    </section>
  )
}
