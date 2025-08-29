import React from "react";

type Variant = "glow" | "spin" | "both";

interface IganiMarkProps {
  size?: number | string;
  variant?: Variant;          // which hover effect
  animateOnHover?: boolean;   // enable/disable hover/focus effects
  className?: string;
  ariaLabel?: string;
}

const NAVY = "#0F2D44";
const BLUE_LEFT = "#86B7FF";
const BLUE_RIGHT = "#5B93E6";

const IganiMark: React.FC<IganiMarkProps> = ({
  size = 48,
  variant = "both",
  animateOnHover = true,
  className = "",
  ariaLabel = "Igani logo",
}) => {
  const sizeValue = typeof size === "number" ? `${size}px` : size;

  const shouldGlow = variant === "glow" || variant === "both";
  const shouldSpin = variant === "spin" || variant === "both";

  const hoverStyles: React.CSSProperties = animateOnHover
    ? {
        transform: shouldSpin ? "rotate(6deg)" : undefined,
        filter: shouldGlow
          ? "drop-shadow(0 0 18px rgba(255,255,255,0.55)) drop-shadow(0 0 36px rgba(255,255,255,0.30))"
          : undefined,
      }
    : {};

  return (
    <svg
      width={sizeValue}
      height={sizeValue}
      viewBox="0 0 100 100"
      role="img"
      aria-label={ariaLabel}
      tabIndex={0}
      className={`transition-all duration-300 ease-out ${className}`}
      style={{
        transition: "transform 250ms ease, filter 300ms ease",
        transformOrigin: "50% 50%",
        background: "transparent",
      }}
      onMouseEnter={(e) => animateOnHover && Object.assign(e.currentTarget.style, hoverStyles)}
      onMouseLeave={(e) => {
        if (!animateOnHover) return;
        e.currentTarget.style.transform = "rotate(0deg)";
        e.currentTarget.style.filter = "none";
      }}
      onFocus={(e) => animateOnHover && Object.assign(e.currentTarget.style, hoverStyles)}
      onBlur={(e) => {
        if (!animateOnHover) return;
        e.currentTarget.style.transform = "rotate(0deg)";
        e.currentTarget.style.filter = "none";
      }}
    >
      <title>{ariaLabel}</title>

      {/* Masks to cut transparent slots in the bars */}
      <defs>
        <mask id="leftSlotMask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          {/* transparent slot near the TOP */}
          <rect x="35" y="18" width="6" height="20" rx="3" fill="black" />
        </mask>

        <mask id="rightSlotMask">
          <rect x="0" y="0" width="100" height="100" fill="white" />
          {/* transparent slot in the LOWER third */}
          <rect x="57" y="60" width="6" height="20" rx="3" fill="black" />
        </mask>
      </defs>

      {/* dark-navy ellipse, tilted */}
      <ellipse
        cx="50"
        cy="52"
        rx="44"
        ry="34"
        fill={NAVY}
        transform="rotate(-18 50 52)"
      />

      {/* left vertical rounded bar with transparent slot */}
      <rect
        x="30"
        y="10"
        width="18"
        height="80"
        rx="6"
        fill={BLUE_LEFT}
        mask="url(#leftSlotMask)"
      />

      {/* right vertical rounded bar, slightly taller, with transparent slot */}
      <rect
        x="52"
        y="6"
        width="18"
        height="86"
        rx="6"
        fill={BLUE_RIGHT}
        mask="url(#rightSlotMask)"
      />

      {/* Respect reduced motion: no rotation, keep lighter glow only */}
      <style>
        {`
          @media (prefers-reduced-motion: reduce) {
            svg { transition: filter 300ms ease !important; }
            svg:hover, svg:focus { transform: none !important; }
          }
        `}
      </style>
    </svg>
  );
};

export default IganiMark;
