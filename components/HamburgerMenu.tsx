'use client'

interface HamburgerMenuProps {
  isOpen: boolean
  onClick: () => void
  className?: string
}

/** Plain menu button: two lines that turn into an X when open. */
export function HamburgerMenu({ isOpen, onClick, className = '' }: HamburgerMenuProps) {
  const line = 'absolute left-1/2 h-[1.5px] w-5 -translate-x-1/2 rounded-full bg-white transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={isOpen}
      className={`relative h-11 w-11 rounded-full border border-white/15 bg-white/[0.04] transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8FB7F9] ${className}`}
    >
      <span className={`${line} ${isOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-[17px]'}`} />
      <span className={`${line} ${isOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-[25px]'}`} />
    </button>
  )
}
