import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { WebsiteCard } from './WebsiteCard';
import { Website } from '../types';

interface PortfolioProps {
  websites: Website[];
}

export function Portfolio({ websites }: PortfolioProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const categories = ['all', ...new Set(websites.map(w => w.category))];
  const filteredWebsites = activeCategory === 'all' 
    ? websites 
    : websites.filter(w => w.category === activeCategory);

  const featuredWebsites = filteredWebsites.filter(w => w.featured);
  const regularWebsites = filteredWebsites.filter(w => !w.featured);

  return (
    <section id="portfolio" className="py-20 bg-slate-900 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            Our Portfolio
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-slate-300 max-w-2xl mx-auto"
          >
            Discover the exceptional websites we've crafted for our clients
          </motion.p>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-12">
          {categories.map((category) => (
            <motion.button
              key={category}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: categories.indexOf(category) * 0.05 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category)}
              className={`relative px-4 sm:px-6 md:px-8 py-2 sm:py-3 rounded-xl sm:rounded-2xl transition-all duration-500 font-medium text-xs sm:text-sm uppercase tracking-wider overflow-hidden group ${
                activeCategory === category
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-800/50 backdrop-blur-sm text-slate-400 border border-slate-600/30 hover:border-cyan-400/30 hover:text-cyan-300'
              }`}
            >
              {/* Animated background glow */}
              <div className={`absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                activeCategory === category ? 'opacity-100' : ''
              }`} />
              
              {/* Scanning line effect */}
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ${
                activeCategory === category ? 'translate-x-full' : ''
              }`} />
              
              {/* Corner accents */}
              
              {/* Button text */}
              <span className="relative z-10">
              {category.charAt(0).toUpperCase() + category.slice(1)}
              </span>
            </motion.button>
          ))}
        </div>

        {featuredWebsites.length > 0 && (
          <div className="mb-16">
            <motion.h3 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-2xl font-bold text-white mb-8 text-center"
            >
              Featured Projects
            </motion.h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredWebsites.map((website) => (
                <motion.div
                  key={website.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: featuredWebsites.indexOf(website) * 0.05 }}
                  viewport={{ once: true }}
                >
                  <WebsiteCard
                    website={website}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {regularWebsites.length > 0 && (
          <div>
            {featuredWebsites.length > 0 && (
              <motion.h3 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="text-2xl font-bold text-white mb-8 text-center"
              >
                All Projects
              </motion.h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {regularWebsites.map((website) => (
                <motion.div
                  key={website.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: regularWebsites.indexOf(website) * 0.05 }}
                  viewport={{ once: true }}
                >
                  <WebsiteCard
                    website={website}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}