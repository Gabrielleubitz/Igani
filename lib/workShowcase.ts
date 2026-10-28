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
  url: string
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
    id: 'cryo',
    client: 'Cryotherapy Rejuvenate',
    kind: 'Wellness clinic',
    location: 'Dickson City, PA',
    line: 'A bold, booking-first site: address, phone and “Book now” before you scroll.',
    url: 'https://www.cryotherapyrejuvenate.com/',
    domain: 'cryotherapyrejuvenate.com',
    ...shot('cryo', 750, 1298),
    accent: '#2f6fff',
  },
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
    id: 'caleno',
    client: 'Caleno',
    kind: 'Booking & business platform',
    line: 'Appointments, clients and websites for small businesses, in one system.',
    url: 'https://caleno.co',
    domain: 'caleno.co',
    ...shot('caleno', 750, 1298),
    accent: '#2fa3b8',
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
]
