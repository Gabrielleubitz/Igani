import React from 'react';
import { motion } from 'framer-motion';
import { Award, Users, Clock, Star } from 'lucide-react';
import { SiteSettings } from '../types';

interface AboutProps {
  settings: SiteSettings;
}

export function About({ settings }: AboutProps) {
  const scrollToContact = () => {
    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="about" className="py-20 bg-slate-900 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="text-4xl font-bold text-white mb-4"
          >
            {settings.aboutTitle}
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="text-xl text-slate-300 max-w-2xl mx-auto"
          >
            {settings.aboutDescription}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            viewport={{ once: true }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="text-center p-6 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 backdrop-blur-sm rounded-xl border border-cyan-400/30"
          >
            <Award className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">50+</h3>
            <p className="text-slate-300">Projects Completed</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            viewport={{ once: true }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="text-center p-6 bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl border border-green-400/30"
          >
            <Users className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">40+</h3>
            <p className="text-slate-300">Happy Clients</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            viewport={{ once: true }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="text-center p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl border border-purple-400/30"
          >
            <Clock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">3+</h3>
            <p className="text-slate-300">Years Experience</p>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            viewport={{ once: true }}
            whileHover={{ y: -3, scale: 1.01 }}
            className="text-center p-6 bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-sm rounded-xl border border-orange-400/30"
          >
            <Star className="w-12 h-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">5.0</h3>
            <p className="text-slate-300">Average Rating</p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          viewport={{ once: true }}
          className="bg-gradient-to-r from-cyan-600/80 to-blue-600/80 backdrop-blur-sm rounded-2xl p-12 text-white text-center border border-cyan-400/30"
        >
          <h3 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h3>
          <p className="text-xl mb-8 text-slate-200">
            Let's create something amazing together. Get in touch for a free consultation.
          </p>
          <motion.button 
            onClick={scrollToContact}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            className="bg-white text-cyan-600 px-8 py-3 rounded-lg hover:bg-slate-100 transition-all duration-300 font-semibold shadow-lg"
          >
            Start Your Project
          </motion.button>
        </motion.div>
      </div>
    </section>
  );
}