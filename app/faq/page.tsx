import Link from 'next/link'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { FAQ } from '@/lib/faq'
import { SITE_NAME, SITE_URL } from '@/lib/seo/site'
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
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Header showBackButton backButtonText="Home" backButtonHref="/" />

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-32 sm:px-6">
        <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.3em] text-[#80A0E0]">{SITE_NAME} · Questions</p>
        <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Questions about working with us</h1>

        <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map((f) => (
            <section key={f.q} className="py-7">
              <h2 className="border-0 pb-0 text-xl font-semibold text-white">{f.q}</h2>
              <p className="mt-3 text-lg leading-relaxed text-white/75">{f.a}</p>
            </section>
          ))}
        </div>

        <div className="mt-12">
          <Link
            href={CONTACT_HREF}
            className="inline-flex items-center rounded-full bg-[#4080E0] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#5090F0]"
          >
            Start a project
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
