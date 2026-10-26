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
  after: { image?: string; mobileImage?: string; caption: string }
  results: { value: string; label: string }[]
  quote?: { text: string; author: string; role?: string }
}

export const caseStudy: CaseStudy = {
  ready: false,
  client: 'Smith & Co.',
  industry: 'Home services',
  location: 'Netanya',
  url: undefined,
  before: { image: undefined, caption: 'Their old site' },
  after: { image: undefined, caption: 'The site we built' },
  results: [],
  quote: undefined,
}
