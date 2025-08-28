import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet, Home, Globe } from 'lucide-react';
import { Website } from '../types';

interface PreviewPageProps {
  websites: Website[];
}

export function PreviewPage({ websites }: PreviewPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [isHoveringIframe, setIsHoveringIframe] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const websiteId = searchParams.get('id');
  const website = websites.find(w => w.id === websiteId);

  useEffect(() => {
    if (!website) {
      navigate('/');
    }
  }, [website, navigate]);

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (isHoveringIframe && iframeRef.current) {
        // Let the iframe handle the scroll
        e.preventDefault();
        try {
          // Try to scroll the iframe content
          iframeRef.current.contentWindow?.scrollBy(0, e.deltaY);
        } catch (error) {
          // Cross-origin restrictions - iframe will handle its own scrolling
          console.log('Cross-origin iframe - letting iframe handle scroll');
        }
      }
      // Otherwise, let the main page scroll naturally
    };

    document.addEventListener('wheel', handleScroll, { passive: false });
    return () => document.removeEventListener('wheel', handleScroll);
  }, [isHoveringIframe]);

  if (!website) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Website not found</h1>
          <button
            onClick={() => navigate('/')}
            className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const getFrameClasses = () => {
    switch (viewMode) {
      case 'mobile':
        return 'w-80 h-[640px]';
      case 'tablet':
        return 'w-[768px] h-[900px]';
      default:
        return 'w-full h-[800px]';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900" ref={containerRef}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/')}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-600/50 hover:border-cyan-400/50"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Portfolio</span>
              </motion.button>
              
              <div className="flex items-center space-x-3">
                <Globe className="w-8 h-8 text-cyan-400" />
                <div>
                  <h1 className="text-xl font-bold text-white">{website.title}</h1>
                  <div className="flex items-center space-x-2">
                    <span className="bg-cyan-500/20 text-cyan-300 text-xs px-2 py-1 rounded-full border border-cyan-400/30">
                      {website.category}
                    </span>
                    {website.featured && (
                      <span className="bg-orange-500/20 text-orange-300 text-xs px-2 py-1 rounded-full border border-orange-400/30">
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Device Toggle */}
              <div className="flex items-center space-x-1 bg-slate-800/50 rounded-lg p-1 border border-slate-600/50">
                <button
                  onClick={() => setViewMode('desktop')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'desktop' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('tablet')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'tablet' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Tablet View"
                >
                  <Tablet className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('mobile')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'mobile' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' 
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-4 h-4" />
                </button>
              </div>

              {/* Visit Site Button */}
              <motion.a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors border border-cyan-500/30"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Visit Live Site</span>
              </motion.a>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Content */}
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Project Info */}
          <div className="mb-8 bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <h2 className="text-2xl font-bold text-white mb-4">About This Project</h2>
                <p className="text-slate-300 leading-relaxed mb-4">
                  {website.description}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  This project showcases modern web development practices with a focus on user experience, 
                  performance optimization, and responsive design. Built with cutting-edge technologies 
                  to deliver exceptional results.
                </p>
              </div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Project Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Category:</span>
                      <span className="text-white">{website.category}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Launch Date:</span>
                      <span className="text-white">{new Date(website.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-green-400">Live</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Website Preview */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Live Preview</h2>
              <div className="text-sm text-slate-400">
                {isHoveringIframe ? 'Scrolling website content' : 'Hover over preview to scroll website'}
              </div>
            </div>
            
            <div className="flex justify-center">
              <motion.div 
                className={`bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-600/30 ${getFrameClasses()}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                key={viewMode}
                onMouseEnter={() => setIsHoveringIframe(true)}
                onMouseLeave={() => setIsHoveringIframe(false)}
              >
                <iframe
                  ref={iframeRef}
                  src={website.url}
                  className="w-full h-full border-0"
                  title={`Preview of ${website.title}`}
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
                />
              </motion.div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Key Features</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-300">Responsive Design</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-300">Performance Optimized</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-300">SEO Friendly</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                  <span className="text-slate-300">Modern UI/UX</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50">
              <h3 className="text-xl font-bold text-white mb-4">Technologies Used</h3>
              <div className="flex flex-wrap gap-2">
                {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Node.js'].map((tech) => (
                  <span 
                    key={tech}
                    className="bg-slate-700/50 text-slate-300 px-3 py-1 rounded-lg text-sm border border-slate-600/50"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}