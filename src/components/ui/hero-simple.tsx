import React from 'react';
import { motion } from 'framer-motion';

export function HeroSimple() {
  const scrollToPortfolio = () => {
    document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Simple background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.3) 0%, transparent 50%)
          `
        }} />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-8 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-20">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-6"
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white leading-tight font-sans">
              IGANI
            </h1>
          </motion.div>

          {/* Value Proposition */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4 px-2 sm:px-4"
          >
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-white leading-tight font-sans max-w-4xl mx-auto">
              You get fast, clean sites with live previews.
            </h2>
          </motion.div>

          {/* CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center pt-6 sm:pt-8 md:pt-10 px-2 sm:px-4"
          >
            <button 
              onClick={scrollToContact}
              className="
                group relative overflow-hidden
                bg-blue-600 hover:bg-blue-700
                backdrop-blur-xl rounded-xl px-8 py-4
                border border-blue-500/50 hover:border-blue-400/50
                text-white font-medium text-lg
                transition-all duration-300 ease-out
                shadow-lg hover:shadow-xl shadow-blue-500/25 hover:shadow-blue-500/40
                hover:scale-105 active:scale-95
              "
            >
              <span>Book a 15-min call</span>
              <span className="ml-2 text-xl">→</span>
            </button>
            <button 
              onClick={scrollToPortfolio}
              className="
                inline-flex items-center justify-center space-x-2 px-8 py-4 
                rounded-xl border border-white/30 text-white hover:bg-white/10 
                transition-all duration-300 text-lg font-medium
                hover:scale-105 active:scale-95
              "
            >
              <span>See work</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
