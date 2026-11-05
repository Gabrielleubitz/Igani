import Image from 'next/image'
import type { Screen } from '../types'

/**
 * Screens for Cryotherapy Rejuvenate. The product already runs, so these are real screenshots and
 * screen recordings (live landing page at cryotherapyrejuvenate.com + the booking app), not block mockups.
 *
 * Every screen has a phone capture and a desktop capture. The offer page lets viewers switch any flow
 * between a phone frame and a desktop frame, so each screen shows the capture that matches the frame:
 * a CSS container query on the frame's shape (portrait = phone, landscape = desktop) picks one.
 * Admin captures use demo appointments and demo guest names; no real client data.
 */

const DIR = '/offers/cryotherapy-rejuvenate'

type Media =
  /** Fills the frame from the top (captured at the frame's own aspect ratio). */
  | { img: string; alt: string }
  /** A full-length page: the frame scrolls through it. */
  | { page: string; w: number; h: number; alt: string }
  /** A muted, looping screen recording. */
  | { clip: string }

const CSS =
  '.cr-dual{container-type:size;width:100%;height:100%;overflow-y:auto;scrollbar-width:none}' +
  '.cr-dual::-webkit-scrollbar{display:none}' +
  '.cr-p,.cr-d{position:relative;width:100%;min-height:100%}.cr-d{display:none}' +
  '@container (orientation: landscape){.cr-p{display:none}.cr-d{display:block}}'

function Show({ m, sizes, bg }: { m: Media; sizes: string; bg: string }): React.ReactElement {
  if ('clip' in m) {
    return (
      <div className="absolute inset-0" style={{ background: bg }}>
        <video src={`${DIR}/${m.clip}.mp4`} poster={`${DIR}/${m.clip}-poster.webp`} autoPlay muted loop playsInline preload="metadata" className="h-full w-full object-cover object-top" />
      </div>
    )
  }
  if ('page' in m) {
    return (
      <div style={{ background: bg }}>
        <Image src={`${DIR}/${m.page}`} alt={m.alt} width={m.w} height={m.h} sizes={sizes} className="block h-auto w-full" />
      </div>
    )
  }
  return (
    <div className="absolute inset-0" style={{ background: bg }}>
      <Image src={`${DIR}/${m.img}`} alt={m.alt} fill sizes={sizes} className="object-cover object-top" />
    </div>
  )
}

/** One screen, two captures: `phone` in a phone frame, `desktop` in a desktop frame. */
function dual(phone: Media, desktop: Media, bg = '#0b0d12'): Screen {
  const S: Screen = () => (
    <div className="cr-dual">
      <style>{CSS}</style>
      <div className="cr-p">
        <Show m={phone} sizes="300px" bg={bg} />
      </div>
      <div className="cr-d">
        <Show m={desktop} sizes="(min-width: 1024px) 1100px, 100vw" bg={bg} />
      </div>
    </div>
  )
  return S
}

/** The narrated walkthrough (from cryo-booking/video), with sound and controls. Letterboxed in a phone frame. */
const Walkthrough: Screen = () => (
  <div className="flex h-full min-h-full w-full items-center bg-black">
    <video src={`${DIR}/walkthrough.mp4`} poster={`${DIR}/walkthrough-poster.webp`} controls playsInline preload="none" className="h-full w-full object-contain" />
  </div>
)

const site = (id: string, alt: string): Screen => dual({ img: `site-${id}-p.webp`, alt }, { img: `site-${id}-d.webp`, alt })

export const screens = {
  // Client booking (booking app)
  bookClip: dual({ clip: 'clip-book-phone' }, { clip: 'clip-book-desktop' }),
  bookTreatments: dual({ page: 'book-1-treatments.webp', w: 600, h: 3425, alt: 'Choose a treatment' }, { page: 'book-1-treatments-d.webp', w: 1440, h: 1699, alt: 'Choose a treatment' }),
  bookTime: dual({ page: 'book-2-time.webp', w: 600, h: 2150, alt: 'Pick a time' }, { page: 'book-2-time-d.webp', w: 1440, h: 1154, alt: 'Pick a time' }),
  bookReview: dual({ page: 'book-3-review.webp', w: 600, h: 2522, alt: 'Review the booking' }, { page: 'book-3-review-d.webp', w: 1440, h: 1437, alt: 'Review the booking' }),
  bookWaiver: dual({ page: 'book-6-waiver.webp', w: 600, h: 2550, alt: 'Sign the waiver' }, { page: 'book-6-waiver-d.webp', w: 1440, h: 1435, alt: 'Sign the waiver' }),
  bookPackages: dual({ page: 'book-4-packages.webp', w: 600, h: 6427, alt: 'Packages' }, { page: 'book-4-packages-d.webp', w: 1440, h: 3245, alt: 'Packages' }),
  // Landing page (live site)
  siteClip: dual({ clip: 'clip-site-phone' }, { clip: 'clip-site-desktop' }),
  siteHero: site('hero', 'Recover. Rejuvenate. Perform.'),
  siteSession: site('session', 'Three minutes. In, frozen, out.'),
  siteServices: site('data', 'Numbers and services'),
  siteNeighbors: site('operators', 'Rooted in NEPA'),
  siteReviews: site('reviews', 'Google reviews'),
  // Staff console (booking app admin)
  adminDay: dual({ img: 'admin-cal-day-p.webp', alt: 'Calendar, today' }, { img: 'admin-cal-day.webp', alt: 'Calendar, today' }, '#f6f7f9'),
  adminWalkin: dual({ img: 'admin-walkin-p.webp', alt: 'Book a walk-in' }, { img: 'admin-walkin.webp', alt: 'Book a walk-in' }, '#f6f7f9'),
  adminGuests: dual({ img: 'admin-guests-p.webp', alt: 'Guests' }, { img: 'admin-guests.webp', alt: 'Guests' }, '#f6f7f9'),
  adminSettings: dual({ img: 'admin-settings-p.webp', alt: 'Settings' }, { img: 'admin-settings.webp', alt: 'Settings' }, '#f6f7f9'),
  walkthrough: Walkthrough,
} satisfies Record<string, Screen>
