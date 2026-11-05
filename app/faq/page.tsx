import { NewSiteShell } from '@/components/newsite/NewSiteShell'
import { FAQ } from '@/lib/faq'
import { SITE_URL } from '@/lib/seo/site'
import { CONTACT_HREF } from '@/lib/contactLink'

export default function FaqPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${SITE_URL}/faq#faq`,
    url: `${SITE_URL}/faq`,
    isPartOf: { '@id': `${SITE_URL}/#website` },
    mainEntity: FAQ.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  }

  return (
    <NewSiteShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <article className="lg lg--wide">
        <p className="crumbs">
          <a href="/">Home</a> <span>/</span> Questions
        </p>
        <h1>Questions about working with us</h1>
        <div className="faq">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
        <a className="bt bt--dark lg__cta" href={CONTACT_HREF}>
          Book a consultation
        </a>
      </article>
    </NewSiteShell>
  )
}
