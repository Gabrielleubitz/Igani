/**
 * Projects shown in the funnels' "Our work" gallery, in display order.
 *
 * Screenshots live in /public/work/: `desktop` is 1200px wide and `mobile`
 * 600px wide (390pt phone at 2x). Full-page captures scroll by themselves
 * inside their frames. Sites whose content only appears as you scroll get a
 * `video` instead: a recording of scrolling through the page, with the
 * screenshot as its poster.
 * `accent` tints the glow behind the project while it's on screen.
 * Keep `line` to what we built: no invented numbers.
 */
type Shot = { src: string; height: number; video?: string }

export type WorkProject = {
  id: string
  client: string
  kind: string
  location?: string
  line: string
  /** Live site; concept designs have none */
  url?: string
  /** A design we made to show a style, not a client's site */
  concept?: boolean
  /** Shown in the browser frame's address bar */
  domain: string
  desktop: Shot
  mobile: Shot
  thumb: string
  accent: string
}

const shot = (id: string, desktopHeight: number, mobileHeight: number, video = false) => ({
  desktop: { src: `/work/${id}-desktop.webp`, height: desktopHeight, ...(video && { video: `/work/${id}-desktop.mp4` }) },
  mobile: { src: `/work/${id}-mobile.webp`, height: mobileHeight, ...(video && { video: `/work/${id}-mobile.mp4` }) },
  thumb: `/work/${id}-thumb.webp`,
})

export const workProjects: WorkProject[] = [
  {
    id: 'gabai',
    client: 'Gabai Real Estate',
    kind: 'Real estate',
    location: 'Jerusalem',
    line: 'From a dated template to a premium showcase for high-end properties.',
    url: 'https://www.gabairealestate.com/',
    domain: 'gabairealestate.com',
    ...shot('gabai', 3750, 5193),
    accent: '#5b6bd6',
  },
  {
    id: 'nogi',
    client: 'Nogilates',
    kind: 'Pilates studio',
    line: 'A custom brand and site that feels like walking into the studio.',
    url: 'https://nogilates.co',
    domain: 'nogilates.co',
    ...shot('nogi', 3750, 5193),
    accent: '#d9b89a',
  },
  {
    id: 'callmap',
    client: 'Callmap.ai',
    kind: 'AI software',
    line: 'The product site for an AI that turns every call into decisions and next steps.',
    url: 'https://callmap.ai',
    domain: 'callmap.ai',
    ...shot('callmap', 3750, 5193),
    accent: '#14c4e4',
  },
  {
    id: 'cryo',
    client: 'Cryotherapy Rejuvenate',
    kind: 'Wellness clinic',
    location: 'Dickson City, PA',
    line: 'A bold, booking-first site: address, phone and “Book now” before you scroll.',
    url: 'https://www.cryotherapyrejuvenate.com/',
    domain: 'cryotherapyrejuvenate.com',
    ...shot('cryo', 750, 1298, true),
    accent: '#2f6fff',
  },
  {
    id: 'caleno',
    client: 'Caleno',
    kind: 'Booking & business platform',
    line: 'Appointments, clients and websites for small businesses, in one system.',
    url: 'https://caleno.co',
    domain: 'caleno.co',
    ...shot('caleno', 750, 1298, true),
    accent: '#2fa3b8',
  },
]

/** Real estate funnel: the real-estate client first, then concept agent sites in three styles. */
export const realEstateProjects: WorkProject[] = [
  {
    ...workProjects.find((p) => p.id === 'gabai')!,
    kind: 'Boutique brokerage',
    line: 'From a dated template to a premium showcase for high-end Jerusalem properties.',
  },
  {
    id: 'lux',
    client: 'Elena Marlowe',
    kind: 'Luxury agent',
    location: 'Malibu to Bel Air',
    line: 'Listing-first and editorial: home search on the first screen, featured homes, neighborhood pages and a private valuation form.',
    domain: 'igani.co/concepts/luxury',
    concept: true,
    ...shot('lux', 2973, 5193),
    accent: '#b89b6a',
  },
  {
    id: 'urb',
    client: 'Kai Mercer',
    kind: 'Condo specialist',
    location: 'Manhattan',
    line: 'Data-forward and bold: a live market ticker, building-by-building price per foot, and comps “from your line, not your zip code”.',
    domain: 'igani.co/concepts/urban',
    concept: true,
    ...shot('urb', 2820, 5193),
    accent: '#c6f03a',
  },
  {
    id: 'cst',
    client: 'Coral & Co.',
    kind: 'Coastal agent',
    location: 'Miami Beach',
    line: 'Art-deco sunshine: arched listings, a neon after-dark neighborhood guide, and a valuation form you actually want to fill in.',
    domain: 'igani.co/concepts/coastal',
    concept: true,
    ...shot('cst', 2917, 5193),
    accent: '#ff6f61',
  },
]

/** The rest of our work, shown small as credibility on the real estate funnel. */
export const alsoTrustedBy: WorkProject[] = workProjects.filter((p) => p.id !== 'gabai')
