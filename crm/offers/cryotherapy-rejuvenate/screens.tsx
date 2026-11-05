import Image from 'next/image'
import type { Screen } from '../types'

/**
 * Screens for Cryotherapy Rejuvenate. Unlike most offers, the product already runs, so these are
 * real screenshots and screen recordings of it (landing page + booking app), not block mockups.
 * Admin screenshots come from the narrated walkthrough and use demo data or blurred client names.
 */

const DIR = '/offers/cryotherapy-rejuvenate'

/** A full-length phone screenshot: the phone frame scrolls through it. */
function phoneShot(file: string, height: number, alt: string): Screen {
  const S: Screen = () => (
    <div className="min-h-full bg-[#0b0d12]">
      <Image src={`${DIR}/${file}`} alt={alt} width={600} height={height} sizes="300px" className="h-auto w-full" />
    </div>
  )
  return S
}

/** A desktop screenshot filling the 16:10 frame from the top. */
function desktopShot(file: string, alt: string): Screen {
  const S: Screen = () => (
    <div className="relative h-full min-h-full w-full bg-white">
      <Image src={`${DIR}/${file}`} alt={alt} fill sizes="(min-width: 1024px) 900px, 100vw" className="object-cover object-top" />
    </div>
  )
  return S
}

/** A muted, looping screen recording. */
function clip(file: string, poster: string): Screen {
  const S: Screen = () => (
    <div className="relative h-full min-h-full w-full bg-[#0b0d12]">
      <video src={`${DIR}/${file}`} poster={`${DIR}/${poster}`} autoPlay muted loop playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover object-top" />
    </div>
  )
  return S
}

/** The narrated walkthrough (from cryo-booking/video), with sound and controls. */
const Walkthrough: Screen = () => (
  <div className="flex h-full min-h-full w-full items-center bg-black">
    <video src={`${DIR}/walkthrough.mp4`} poster={`${DIR}/walkthrough-poster.webp`} controls playsInline preload="none" className="h-full w-full object-contain" />
  </div>
)

export const screens = {
  walkthrough: Walkthrough,
  // Client booking, phone
  bookClip: clip('clip-book-phone.mp4', 'book-1-treatments.webp'),
  bookTreatments: phoneShot('book-1-treatments.webp', 3425, 'Choose a treatment'),
  bookTime: phoneShot('book-2-time.webp', 2150, 'Pick a time'),
  bookReview: phoneShot('book-3-review.webp', 2522, 'Review the booking'),
  bookPackages: phoneShot('book-4-packages.webp', 6427, 'Packages'),
  bookWaiver: phoneShot('book-6-waiver.webp', 2550, 'Sign the waiver'),
  // Landing page, desktop
  siteClip: clip('clip-site-desktop.mp4', 'site-hero.webp'),
  siteHero: desktopShot('site-hero.webp', 'Landing page hero'),
  siteChamber: desktopShot('site-1.webp', 'The chamber section'),
  siteSession: desktopShot('site-5.webp', 'The session, minute by minute'),
  siteStories: desktopShot('site-7.webp', 'Client testimonials'),
  // Back office, desktop
  adminDay: desktopShot('admin-cal-day.webp', 'Calendar, day view'),
  adminWalkin: desktopShot('admin-walkin.webp', 'Book a walk-in'),
  adminGuests: desktopShot('admin-guests.webp', 'Guest directory'),
  adminSettings: desktopShot('admin-settings.webp', 'Settings: hours and booking rules'),
} satisfies Record<string, Screen>
