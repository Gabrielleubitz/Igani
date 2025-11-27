'use client'

interface HamburgerMenuProps {
  isOpen: boolean
  onClick: () => void
  className?: string
}

export function HamburgerMenu({ isOpen, onClick, className = '' }: HamburgerMenuProps) {
  return (
    <button
      className={`hamburger-menu ${isOpen ? 'open' : ''} ${className} flex flex-col items-center gap-1`}
      onClick={onClick}
      aria-label="Toggle menu"
      aria-expanded={isOpen}
    >
      <div className="hamburger-icon-wrapper">
        <svg viewBox="0 0 106 98" xmlns="http://www.w3.org/2000/svg">
          <ellipse
            className="oval-back"
            cx="53"
            cy="49"
            rx="38"
            ry="29"
            fill="white"
            opacity="0.4"
            transform="rotate(-5 53 49)"
          />
          <ellipse
            className="oval-front"
            cx="53"
            cy="49"
            rx="36"
            ry="27"
            fill="#020915"
            transform="rotate(-5 53 49)"
          />
          <g className="pillar-group-left">
            <rect
              className="pillar-left"
              x="34"
              y="8"
              width="18"
              height="82"
              rx="9"
              fill="#8FB7F9"
            />
            <rect
              className="pillar-left-inner"
              x="39"
              y="22"
              width="8"
              height="22"
              rx="4"
              fill="#020915"
            />
          </g>
          <g className="pillar-group-right">
            <rect
              className="pillar-right"
              x="56"
              y="6"
              width="18"
              height="86"
              rx="9"
              fill="#6694E0"
            />
            <rect
              className="pillar-right-inner"
              x="61"
              y="54"
              width="8"
              height="22"
              rx="4"
              fill="#020915"
            />
          </g>
        </svg>
      </div>
      <span className="hamburger-label">
        {isOpen ? 'CLOSE' : 'MENU'}
      </span>
    </button>
  )
}
