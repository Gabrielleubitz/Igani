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
  /** Live URL of the site we built */
  url?: string
  before: { image?: string; mobileImage?: string; caption: string }
  /** `video`: a recording of the live site (its hero video playing); `image` is its poster */
  after: { image?: string; mobileImage?: string; video?: string; caption: string }
  results: { value: string; label: string }[]
  quote?: { text: string; author: string; role?: string }
}

export const caseStudy: CaseStudy = {
  ready: true,
  client: 'Gabai Real Estate',
  industry: 'Real estate',
  location: 'Jerusalem',
  url: 'https://www.gabairealestate.com',
  before: { image: '/case-studies/gabai-before.jpg', caption: 'Their old site' },
  after: { image: '/case-studies/gabai-after.jpg', video: '/work/gabai-after.mp4', caption: 'The site we built' },
  results: [],
  quote: undefined,
}
