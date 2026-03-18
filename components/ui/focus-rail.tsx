"use client";

import * as React from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type FocusRailItem = {
  id: string | number;
  title: string;
  description?: string;
  imageSrc: string;
  /** Internal preview link — renders "View Preview" button */
  href?: string;
  /** External live-site link — renders "Visit Site" icon button */
  externalHref?: string;
  meta?: string;
};

interface FocusRailProps {
  items: FocusRailItem[];
  initialIndex?: number;
  loop?: boolean;
  autoPlay?: boolean;
  interval?: number;
  className?: string;
}

function wrap(min: number, max: number, v: number) {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
}

const BASE_SPRING = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
  mass: 1,
};

const TAP_SPRING = {
  type: "spring" as const,
  stiffness: 450,
  damping: 18,
  mass: 1,
};

/** Returns true when the viewport width is below `breakpoint` (default 768). */
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);
  return isMobile;
}

export function FocusRail({
  items,
  initialIndex = 0,
  loop = true,
  autoPlay = false,
  interval = 4000,
  className,
}: FocusRailProps) {
  const [active, setActive] = React.useState(initialIndex);
  const [isHovering, setIsHovering] = React.useState(false);
  const lastWheelTime = React.useRef<number>(0);
  const isMobile = useIsMobile();

  const count = items.length;
  const activeIndex = wrap(0, count, active);
  const activeItem = items[activeIndex];

  // Responsive layout values
  const xStep    = isMobile ? 160 : 290;
  const zStep    = isMobile ? 100 : 180;
  const rotStep  = isMobile ? 12  : 20;
  // On mobile only show 1 side-card each side to keep the layout clean
  const visibleIndices = isMobile ? [-1, 0, 1] : [-2, -1, 0, 1, 2];

  const handlePrev = React.useCallback(() => {
    if (!loop && active === 0) return;
    setActive((p) => p - 1);
  }, [loop, active]);

  const handleNext = React.useCallback(() => {
    if (!loop && active === count - 1) return;
    setActive((p) => p + 1);
  }, [loop, active, count]);

  const onWheel = React.useCallback(
    (e: React.WheelEvent) => {
      const now = Date.now();
      if (now - lastWheelTime.current < 400) return;
      const isHorizontal = Math.abs(e.deltaX) > Math.abs(e.deltaY);
      const delta = isHorizontal ? e.deltaX : e.deltaY;
      if (Math.abs(delta) > 20) {
        delta > 0 ? handleNext() : handlePrev();
        lastWheelTime.current = now;
      }
    },
    [handleNext, handlePrev]
  );

  React.useEffect(() => {
    if (!autoPlay || isHovering) return;
    const timer = setInterval(() => handleNext(), interval);
    return () => clearInterval(timer);
  }, [autoPlay, isHovering, handleNext, interval]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") handlePrev();
    if (e.key === "ArrowRight") handleNext();
  };

  const swipeConfidenceThreshold = 8000;
  const swipePower = (offset: number, velocity: number) =>
    Math.abs(offset) * velocity;

  const onDragEnd = (
    _e: MouseEvent | TouchEvent | PointerEvent,
    { offset, velocity }: PanInfo
  ) => {
    const swipe = swipePower(offset.x, velocity.x);
    if (swipe < -swipeConfidenceThreshold) handleNext();
    else if (swipe > swipeConfidenceThreshold) handlePrev();
  };

  return (
    <div
      className={cn(
        // Height: shorter on mobile so the info panel fits without scrolling
        "group relative flex w-full flex-col overflow-hidden bg-neutral-950 text-white outline-none select-none overflow-x-hidden",
        "h-[640px] md:h-[760px]",
        className
      )}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onWheel={onWheel}
    >
      {/* ── Background Ambience ── */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`bg-${activeItem.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0"
          >
            <img
              src={activeItem.imageSrc}
              alt=""
              className="h-full w-full object-cover blur-3xl saturate-200"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Main Stage ── */}
      <div className="relative z-10 flex flex-1 flex-col justify-center px-4 md:px-8">

        {/* Draggable Rail */}
        <motion.div
          className={cn(
            "relative mx-auto flex w-full max-w-6xl items-center justify-center cursor-grab active:cursor-grabbing",
            // Rail height: shorter on mobile
            "h-[260px] md:h-[360px]",
          )}
          style={{ perspective: isMobile ? "800px" : "1200px" }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
        >
          {visibleIndices.map((offset) => {
            const absIndex = active + offset;
            const index = wrap(0, count, absIndex);
            const item = items[index];

            if (!loop && (absIndex < 0 || absIndex >= count)) return null;

            const isCenter = offset === 0;
            const dist = Math.abs(offset);

            const xOffset   = offset * xStep;
            const zOffset   = -dist * zStep;
            const scale     = isCenter ? 1 : 0.8;
            const rotateY   = offset * -rotStep;
            const opacity   = isCenter ? 1 : Math.max(0.1, 1 - dist * 0.55);
            const blur      = isCenter ? 0 : dist * (isMobile ? 4 : 6);
            const brightness = isCenter ? 1 : 0.45;

            return (
              <motion.div
                key={absIndex}
                className={cn(
                  "absolute aspect-[3/4] rounded-2xl border border-white/30 bg-white/20 backdrop-blur-xl shadow-2xl transition-shadow duration-300",
                  // Card width: must satisfy width × 4/3 < rail height (260px mobile, 360px desktop)
                  // 190px × 4/3 ≈ 253px ✓  |  265px × 4/3 ≈ 353px ✓
                  "w-[190px] md:w-[265px]",
                  isCenter ? "z-20 shadow-white/10" : "z-10"
                )}
                initial={false}
                animate={{
                  x: xOffset,
                  z: zOffset,
                  scale,
                  rotateY,
                  opacity,
                  filter: `blur(${blur}px) brightness(${brightness})`,
                }}
                transition={{
                  x: BASE_SPRING,
                  z: BASE_SPRING,
                  rotateY: BASE_SPRING,
                  opacity: BASE_SPRING,
                  filter: BASE_SPRING,
                  scale: TAP_SPRING,
                }}
                style={{ transformStyle: "preserve-3d" }}
                onClick={() => {
                  if (offset !== 0) setActive((p) => p + offset);
                }}
              >
                <img
                  src={item.imageSrc}
                  alt={item.title}
                  className="h-full w-full rounded-2xl object-contain pointer-events-none p-4 md:p-6"
                />
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                <div className="absolute inset-0 rounded-2xl bg-black/10 pointer-events-none mix-blend-multiply" />
              </motion.div>
            );
          })}
        </motion.div>

        {/* ── Info & Controls ── */}
        <div className={cn(
          "mx-auto w-full max-w-4xl pointer-events-auto",
          "mt-4 md:mt-6",
          // Stack vertically on mobile, side-by-side on md+
          "flex flex-col items-center gap-4",
          "md:flex-row md:items-end md:justify-between md:gap-6",
        )}>

          {/* Title / description */}
          <div className="flex flex-col items-center text-center md:items-start md:text-left w-full md:flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.id}
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.25 }}
                className="space-y-1"
              >
                {activeItem.meta && (
                  <span className="text-xs font-medium uppercase tracking-wider text-cyan-400">
                    {activeItem.meta}
                  </span>
                )}
                <h2 className="text-xl font-bold tracking-tight md:text-4xl text-white leading-tight">
                  {activeItem.title}
                </h2>
                {/* Description — clamped to 3 lines with link to preview */}
                {activeItem.description && (
                  <div className="hidden md:block max-w-md text-sm">
                    <p className="text-neutral-400 line-clamp-3">
                      {activeItem.description}
                    </p>
                    {activeItem.href && (
                      <a
                        href={activeItem.href}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 inline-block text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        Show more →
                      </a>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Nav + action buttons */}
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">

            {/* Prev / counter / Next — larger tap targets on mobile */}
            <div className="flex items-center gap-0.5 rounded-full bg-neutral-900/80 p-1 ring-1 ring-white/10 backdrop-blur-md">
              <button
                onClick={handlePrev}
                className="rounded-full p-2.5 md:p-3 text-neutral-400 transition hover:bg-white/10 hover:text-white active:scale-95"
                aria-label="Previous"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="min-w-[36px] text-center text-xs font-mono text-neutral-500">
                {activeIndex + 1}/{count}
              </span>
              <button
                onClick={handleNext}
                className="rounded-full p-2.5 md:p-3 text-neutral-400 transition hover:bg-white/10 hover:text-white active:scale-95"
                aria-label="Next"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>

            {/* External "Visit Site" icon button */}
            {activeItem.externalHref && (
              <AnimatePresence mode="wait">
                <motion.a
                  key={`ext-${activeItem.id}`}
                  href={activeItem.externalHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full bg-neutral-900/80 ring-1 ring-white/10 backdrop-blur-md text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                  title="Visit Live Site"
                >
                  <ExternalLink className="h-4 w-4" />
                </motion.a>
              </AnimatePresence>
            )}

            {/* "View Preview" button */}
            {activeItem.href && (
              <AnimatePresence mode="wait">
                <motion.div
                  key={`href-${activeItem.id}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <Link
                    href={activeItem.href}
                    className="group flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-4 py-2.5 md:px-5 md:py-3 text-xs md:text-sm font-semibold text-white transition-transform hover:scale-105 active:scale-95 shadow-lg shadow-cyan-500/20 whitespace-nowrap"
                  >
                    Preview
                    <ArrowUpRight className="h-3.5 w-3.5 md:h-4 md:w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
