/**
 * The real client site shown in the funnels' before/after slider.
 *
 * Fill this in with a real project, put the two screenshots in
 * /public/case-studies/, then set `ready: true` to show it to visitors.
 * Until then it only appears with ?preview=case-study on a funnel URL.
 *
 * Screenshots: same size for both, ideally 1600×900 (16:9) desktop
 * captures from the top of the homepage. Optional phone captures
 * (1080×1350, 4:5) are used on small screens; without them the desktop
 * shot is cropped from the top-left. `results` and `quote` are
 * optional — leave them empty rather than guessing numbers.
 */
export type CaseStudy = {
  ready: boolean
  client: string
  industry: string
  location?: string
  /** Keep the client unnamed in the comparison: the card shows the industry, with no location, link or quote */
  anonymous?: boolean
  /** Live URL of the site we built */
  url?: string
  before: { image?: string; mobileImage?: string; caption: string }
  /** `video`: a recording of the live site (its hero video playing); `image` is its poster */
  after: { image?: string; mobileImage?: string; video?: string; caption: string }
  /** The back-end tab: a screenshot of the old admin, against our dashboard mock-up (drawn in code) */
  backend?: { before: { image: string; caption: string }; after: { caption: string } }
  results: { value: string; label: string }[]
  quote?: { text: string; author: string; role?: string }
}

export const caseStudy: CaseStudy = {
  ready: true,
  client: 'Gabai Real Estate',
  anonymous: true,
  industry: 'Real estate agency',
  location: 'Jerusalem',
  url: 'https://www.gabairealestate.com',
  before: { image: '/case-studies/old-site.jpg', caption: 'Their old site' },
  after: { image: '/case-studies/new-site.jpg', video: '/work/new-site.mp4', caption: 'The site we built' },
  backend: {
    before: { image: '/case-studies/backend-before.jpg', caption: 'A typical WordPress admin' },
    after: { caption: 'Your own dashboard' },
  },
  results: [],
  quote: undefined,
}
