import { CaseStudy, caseStudy } from './funnelCaseStudy'

/**
 * Before/after projects for the home page's "Our work" section.
 *
 * For each real project: put the two screenshots in /public/case-studies/
 * (same size, ideally 1600×900 desktop captures from the top of the
 * homepage; optional 1080×1350 phone captures), fill in the fields, and
 * set `ready: true`. Ready entries are shown first; until there are two,
 * the home page fills the gap with the samples below, marked as samples.
 */
export const caseStudies: CaseStudy[] = [
  // The same project the funnels show
  caseStudy,
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
