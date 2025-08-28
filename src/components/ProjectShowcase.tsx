import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ExternalLink, Calendar, Tag, Users, Clock } from 'lucide-react';
import { Website } from '../types';

interface ProjectShowcaseProps {
  project: Website;
  onClose: () => void;
}

export function ProjectShowcase({ project, onClose }: ProjectShowcaseProps) {
  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="min-h-screen bg-slate-900">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Portfolio</span>
              </motion.button>
              
              <motion.a
                href={project.url}
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex items-center space-x-2 bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Visit Live Site</span>
              </motion.a>
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="relative">
          <div className="h-96 overflow-hidden">
            <img 
              src={project.image} 
              alt={project.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                {project.featured && (
                  <div className="inline-block bg-gradient-to-r from-orange-400 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold mb-4">
                    Featured Project
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{project.title}</h1>
                <div className="flex items-center space-x-6 text-slate-300">
                  <div className="flex items-center space-x-2">
                    <Tag className="w-4 h-4" />
                    <span>{project.category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(project.createdAt).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <h2 className="text-2xl font-bold text-white mb-4">Project Overview</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-6">
                  {project.description}
                </p>
                <p className="text-slate-300 leading-relaxed">
                  This project represents a comprehensive solution designed to meet the specific needs of our client. 
                  We focused on creating an intuitive user experience while maintaining high performance standards 
                  and modern design principles. The implementation showcases our expertise in cutting-edge web 
                  technologies and our commitment to delivering exceptional digital experiences.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700/50"
              >
                <h3 className="text-xl font-bold text-white mb-6">Key Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span className="text-slate-300">Cross-browser Compatible</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                    <span className="text-slate-300">Secure & Reliable</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <h3 className="text-xl font-bold text-white mb-4">Technologies Used</h3>
                <div className="flex flex-wrap gap-3">
                  {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Node.js'].map((tech) => (
                    <span 
                      key={tech}
                      className="bg-slate-700/50 text-slate-300 px-4 py-2 rounded-lg border border-slate-600/50"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
              >
                <h3 className="text-lg font-bold text-white mb-4">Project Details</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Category</span>
                    <span className="text-white">{project.category}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Launch Date</span>
                    <span className="text-white">{new Date(project.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Status</span>
                    <span className="text-green-400">Live</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 border border-slate-700/50"
              >
                <h3 className="text-lg font-bold text-white mb-4">Project Stats</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Users className="w-5 h-5 text-cyan-400" />
                    <div>
                      <div className="text-white font-semibold">1,200+</div>
                      <div className="text-slate-400 text-sm">Monthly Visitors</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="w-5 h-5 text-green-400" />
                    <div>
                      <div className="text-white font-semibold">0.8s</div>
                      <div className="text-slate-400 text-sm">Load Time</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="bg-gradient-to-br from-cyan-600/20 to-blue-600/20 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30"
              >
                <h3 className="text-lg font-bold text-white mb-4">Interested in Similar Work?</h3>
                <p className="text-slate-300 mb-4 text-sm">
                  Let's discuss how we can create something amazing for your business.
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onClose();
                    setTimeout(() => {
                      document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                    }, 300);
                  }}
                  className="w-full bg-cyan-600 text-white py-2 rounded-lg hover:bg-cyan-700 transition-colors"
                >
                  Get In Touch
                </motion.button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}