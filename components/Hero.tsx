'use client'

import { SiteSettings } from '../types';
import { SplashCursor } from './ui/splash-cursor';

interface HeroProps {
  settings: SiteSettings;
}

export function Hero({ settings }: HeroProps) {
  return (
    <section id="home" className="scroll-mt-16 relative min-h-screen flex items-center justify-center">
      {/* Splash Cursor Background */}
      <SplashCursor />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        <h1
          className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold text-white mb-8 leading-tight"
          style={{
            filter: "drop-shadow(0 0 30px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 60px rgba(255, 255, 255, 0.3))",
            textShadow: "0 0 30px rgba(255, 255, 255, 0.3), 0 0 60px rgba(255, 255, 255, 0.1)",
          }}
        >
          IGANI
        </h1>
        <p className="text-xl md:text-2xl text-slate-300 mb-12 leading-relaxed max-w-3xl mx-auto">
          {settings.heroSubtitle}
        </p>
      </div>
    </section>
  );
}
