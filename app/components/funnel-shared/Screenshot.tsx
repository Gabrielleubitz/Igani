/* eslint-disable @next/next/no-img-element */

/** A full-bleed site screenshot for the before/after slider, pinned to the top of the page. */
export function Screenshot({ src, mobileSrc, alt }: { src: string; mobileSrc?: string; alt: string }) {
  return (
    <picture>
      {mobileSrc && <source media="(max-width: 639px)" srcSet={mobileSrc} />}
      <img src={src} alt={alt} draggable={false} className="absolute inset-0 h-full w-full select-none object-cover object-top" />
    </picture>
  )
}
