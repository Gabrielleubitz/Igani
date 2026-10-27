import { CaseStudy } from './funnelCaseStudy'

/**
 * Before/after projects for the home page's "Our work" section.
 *
 * For each real project: put the two screenshots in /public/case-studies/
 * (same size, ideally 1600×900 desktop captures from the top of the
 * homepage; optional 1080×1350 phone captures), fill in the fields, and
 * set `ready: true`. Only ready entries are shown to visitors; the
 * samples below appear only on /home-preview, marked as samples.
 */
export const caseStudies: CaseStudy[] = [
  {
    ready: false,
    client: 'Sample project A',
    industry: 'Home services',
    location: 'Netanya',
    before: { caption: 'Their old site' },
    after: { caption: 'The site we built' },
    results: [],
  },
  {
    ready: false,
    client: 'Sample project B',
    industry: 'Clinic',
    location: 'Tel Aviv',
    before: { caption: 'Their old site' },
    after: { caption: 'The site we built' },
    results: [],
  },
  {
    ready: false,
    client: 'Sample project C',
    industry: 'Law firm',
    location: 'Haifa',
    before: { caption: 'Their old site' },
    after: { caption: 'The site we built' },
    results: [],
  },
]
