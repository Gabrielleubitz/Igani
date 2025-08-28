import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ExternalLink, ArrowRight, Monitor } from 'lucide-react';
import { Website } from '../types';

interface WebsiteCardProps {
  website: Website;
}

export function WebsiteCard({ website }: WebsiteCardProps) {
  const navigate = useNavigate();

  const handlePreview = () => {
    navigate(`/preview?id=${website.id}`);
  };

  const handleReadMore = () => {
    navigate(`/preview?id=${website.id}`);
  };

  return (
    <motion.div 
      whileHover={{ y: -3, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className="bg-slate-800 border border-slate-700/50 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/10 transition-all duration-200"
      style={{ willChange: 'transform' }}
    >
      <div className="relative group">
        <img 
          src={website.image} 
          alt={website.title}
          className="w-full h-48 object-cover transition-transform duration-150 group-hover:scale-105"
          loading="lazy"
          style={{ willChange: 'transform' }}
        />
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center justify-center space-x-4">
          <button 
            onClick={handlePreview}
            className="bg-blue-500/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-blue-500/40 transition-all duration-150 border border-blue-400/30"
            title="Full Preview"
            style={{ willChange: 'background-color' }}
          >
            <Monitor className="w-5 h-5" />
          </button>
          <a 
            href={website.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-cyan-500/20 backdrop-blur-sm text-white p-3 rounded-full hover:bg-cyan-500/40 transition-all duration-150 border border-cyan-400/30"
            title="Visit Live Site"
            style={{ willChange: 'background-color' }}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>
        {website.featured && (
          <div className="absolute top-4 left-4 bg-gradient-to-r from-orange-400 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
            Featured
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-cyan-500/20 text-cyan-300 text-xs px-3 py-1 rounded-full font-medium border border-cyan-400/30">
            {website.category}
          </span>
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{website.title}</h3>
        <p className="text-slate-300 leading-relaxed mb-4">
          {website.description.length > 120 
            ? `${website.description.substring(0, 120)}...` 
            : website.description
          }
        </p>
        {website.description.length > 120 && (
          <motion.button
            onClick={handleReadMore}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2 text-cyan-400 hover:text-cyan-300 transition-colors text-sm font-medium"
          >
            <span>Read More</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}