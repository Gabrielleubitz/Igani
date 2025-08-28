import React from 'react';
import { motion } from 'framer-motion';
import { Globe } from 'lucide-react';
import { SiteSettings } from '../types';

interface FooterProps {
  settings: SiteSettings;
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer className="bg-slate-900 border-t border-slate-700/50 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="flex flex-col md:flex-row justify-between items-center"
        >
          <div className="flex items-center space-x-2 mb-4 md:mb-0">
            <Globe className="w-8 h-8 text-cyan-400" />
            <h3 className="text-2xl font-bold">{settings.siteName}</h3>
          </div>
          <div className="text-center md:text-right">
            <p className="text-slate-400">© 2025 {settings.siteName}. All rights reserved.</p>
            <p className="text-slate-400">{settings.tagline}</p>
          </div>
        </motion.div>
      </div>
    </footer>
  );
}