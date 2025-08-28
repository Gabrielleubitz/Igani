import React from 'react';
import { SiteSettings } from '../types';
import { VisualSpotlightShowcase } from './ui/hero-spotlight';

interface HeroProps {
  settings: SiteSettings;
}

export function Hero({ settings }: HeroProps) {
  return (
    <section id="home" className="scroll-mt-16">
      <VisualSpotlightShowcase settings={settings} />
    </section>
  );
}