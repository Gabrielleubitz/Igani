'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import { IganiLogo } from '@/components/IganiLogo'
import { sampleWebsites } from '@/data/sampleWebsites'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, saveContactSubmission } from '@/lib/firestore'
import { Website, SiteSettings } from '@/types'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ExternalLink,
  Award,
  Users,
  Clock,
  Star,
  Menu,
  X,
  Home,
  Folder,
  Info,
  MessageSquare
} from 'lucide-react'

export default function HomePage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('home')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectType: 'E-commerce Website',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Firebase data
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>(sampleWebsites)
  const [isLoading, setIsLoading] = useState(true)

  // Load data from Firebase on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        // Load settings
        const firebaseSettings = await getSettings()
        if (firebaseSettings) {
          setSettings(firebaseSettings)
        }

        // Load websites
        const firebaseWebsites = await getWebsites()
        if (firebaseWebsites.length > 0) {
          setWebsites(firebaseWebsites)
        }
      } catch (error) {
        console.error('Error loading data from Firebase:', error)
        // Keep using default data if Firebase fails
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const categories = ['all', ...Array.from(new Set(websites.map(w => w.category)))]
  const filteredWebsites = activeCategory === 'all'
    ? websites
    : websites.filter(w => w.category === activeCategory)

  const featuredWebsites = filteredWebsites.filter(w => w.featured)
  const regularWebsites = filteredWebsites.filter(w => !w.featured)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Submit to Firebase
      await saveContactSubmission(formData)
      setSubmitStatus('success')
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        projectType: 'E-commerce Website',
        message: ''
      })
    } catch (error) {
      console.error('Form submission failed:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setSubmitStatus('idle'), 3000)
    }
  }

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
    setActiveSection(sectionId)
    setIsMenuOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-900/95 border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <div className="group cursor-pointer" onClick={() => scrollToSection('home')}>
              <IganiLogo className="w-36 h-12" />
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-1">
              {[
                { id: 'home', label: 'Home', icon: Home },
                { id: 'portfolio', label: 'Portfolio', icon: Folder },
                { id: 'about', label: 'About', icon: Info },
                { id: 'contact', label: 'Contact', icon: MessageSquare }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className={`px-4 py-2 text-sm font-medium transition-all rounded-lg ${
                    activeSection === item.id
                      ? 'text-cyan-400 bg-slate-800/80'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800/60 text-slate-300 hover:text-white transition-colors"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation Menu */}
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:hidden py-4 space-y-2"
            >
              {[
                { id: 'home', label: 'Home' },
                { id: 'portfolio', label: 'Portfolio' },
                { id: 'about', label: 'About' },
                { id: 'contact', label: 'Contact' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => scrollToSection(item.id)}
                  className="block w-full text-left px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </motion.div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section id="home" className="min-h-screen flex items-center justify-center px-4 pt-20 scroll-mt-20">
          <div className="text-center max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-full text-cyan-400 text-sm font-semibold">
                Welcome to the Future of Web Development
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 leading-tight"
            >
              Build Stunning
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                Digital Experiences
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-300 mb-10 leading-relaxed max-w-3xl mx-auto"
            >
              {settings.heroSubtitle}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <AnimatedButton
                variant="primary"
                size="large"
                onClick={() => scrollToSection('contact')}
              >
                Start Your Project
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                size="large"
                onClick={() => scrollToSection('portfolio')}
              >
                View Our Work
              </AnimatedButton>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 bg-slate-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Our Services
              </h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                From concept to deployment, we bring your digital vision to life
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/10"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">💻</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">Web Development</h3>
                <p className="text-slate-400 leading-relaxed">
                  Custom web applications built with modern technologies like React, Next.js, and Node.js.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <span className="text-4xl">🎨</span>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">UI/UX Design</h3>
                <p className="text-slate-400 leading-relaxed">
                  Beautiful, intuitive interfaces that users love. From wireframes to pixel-perfect designs.
                </p>
              </motion.div>
            </div>

            {/* Process Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Your Journey With Igani
              </h3>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                A simple, streamlined process from first contact to launch
              </p>
            </motion.div>

            <div className="max-w-5xl mx-auto">
              {/* Timeline */}
              <div className="relative">
                {/* Vertical Line */}
                <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-blue-500 to-purple-500 transform -translate-x-1/2"></div>

                {/* Timeline Steps */}
                <div className="space-y-12">
                  {[
                    {
                      step: '01',
                      title: 'Discovery Call',
                      description: 'We start with a conversation to understand your vision, goals, and requirements. Share your ideas and we\'ll help shape them.',
                      icon: '💬',
                      gradient: 'from-cyan-500 to-blue-500'
                    },
                    {
                      step: '02',
                      title: 'Design & Planning',
                      description: 'Our team creates mockups and a detailed project roadmap. You\'ll see exactly what your site will look like before we code a single line.',
                      icon: '✏️',
                      gradient: 'from-blue-500 to-indigo-500'
                    },
                    {
                      step: '03',
                      title: 'Development',
                      description: 'We build your site with cutting-edge technology, keeping you updated with regular progress reports and previews.',
                      icon: '⚡',
                      gradient: 'from-indigo-500 to-purple-500'
                    },
                    {
                      step: '04',
                      title: 'Review & Refine',
                      description: 'You test everything and provide feedback. We make revisions until it\'s perfect and you\'re completely satisfied.',
                      icon: '🔍',
                      gradient: 'from-purple-500 to-pink-500'
                    },
                    {
                      step: '05',
                      title: 'Launch & Support',
                      description: 'We deploy your site and ensure everything runs smoothly. Plus, we\'re here for ongoing support and maintenance.',
                      icon: '🚀',
                      gradient: 'from-pink-500 to-rose-500'
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className={`relative flex items-center gap-8 ${
                        index % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                      }`}
                    >
                      {/* Content Card */}
                      <div className="flex-1 md:w-[calc(50%-3rem)]">
                        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 hover:shadow-xl">
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center text-2xl`}>
                              {item.icon}
                            </div>
                            <div>
                              <div className={`text-xs font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent mb-1`}>
                                STEP {item.step}
                              </div>
                              <h4 className="text-xl font-bold text-white">{item.title}</h4>
                            </div>
                          </div>
                          <p className="text-slate-400 leading-relaxed">
                            {item.description}
                          </p>
                        </div>
                      </div>

                      {/* Center Dot */}
                      <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2">
                        <div className={`w-6 h-6 bg-gradient-to-br ${item.gradient} rounded-full border-4 border-slate-900 shadow-lg`}></div>
                      </div>

                      {/* Spacer */}
                      <div className="hidden md:block flex-1 w-[calc(50%-3rem)]"></div>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                viewport={{ once: true }}
                className="text-center mt-16"
              >
                <button
                  onClick={() => scrollToSection('contact')}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-xl shadow-cyan-500/25 transition-all duration-300 hover:scale-105"
                >
                  Start Your Journey Today
                  <Send className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        <section id="portfolio" className="py-24 bg-slate-900 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Work</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                Explore the exceptional websites and applications we've crafted
              </p>
            </motion.div>

            {/* Category Filter */}
            <div className="flex flex-wrap justify-center gap-2 mb-16">
              {categories.map((category) => (
                <motion.button
                  key={category}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveCategory(category)}
                  className={`px-6 py-2.5 rounded-full transition-all duration-300 font-semibold text-sm ${
                    activeCategory === category
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-800/80 text-slate-300 border border-slate-700/50 hover:border-cyan-500/50 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </motion.button>
              ))}
            </div>

            {/* Featured Projects */}
            {featuredWebsites.length > 0 && (
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                  <h3 className="text-2xl font-bold text-white">Featured Projects</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {featuredWebsites.map((website, index) => (
                    <motion.a
                      key={website.id}
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -12 }}
                      className="group relative bg-slate-800/60 border border-slate-700/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-cyan-500/25 transition-all duration-500 hover:border-cyan-500/60 cursor-pointer"
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={website.image}
                          alt={website.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/0 to-blue-600/0 group-hover:from-cyan-600/20 group-hover:to-blue-600/20 transition-all duration-500"></div>
                        <div className="absolute top-4 right-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-xl backdrop-blur-sm">
                          ⭐ Featured
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-cyan-600 text-white p-4 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                            <ExternalLink className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <span className="inline-block bg-cyan-500/10 text-cyan-400 text-xs px-3 py-1.5 rounded-full font-bold border border-cyan-500/30 mb-3">
                          {website.category}
                        </span>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors duration-300">{website.title}</h3>
                        <p className="text-slate-400 leading-relaxed text-sm line-clamp-2">
                          {website.description}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}

            {/* All Projects */}
            {regularWebsites.length > 0 && (
              <div>
                {featuredWebsites.length > 0 && (
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-1 h-8 bg-gradient-to-b from-slate-500 to-slate-600 rounded-full"></div>
                    <h3 className="text-2xl font-bold text-white">More Projects</h3>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {regularWebsites.map((website, index) => (
                    <motion.a
                      key={website.id}
                      href={website.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -12 }}
                      className="group relative bg-slate-800/60 border border-slate-700/50 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-slate-500/15 transition-all duration-500 hover:border-slate-600/70 cursor-pointer"
                    >
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={website.image}
                          alt={website.title}
                          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="bg-slate-600 text-white p-4 rounded-full shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                            <ExternalLink className="w-6 h-6" />
                          </div>
                        </div>
                      </div>
                      <div className="p-6">
                        <span className="inline-block bg-slate-600/20 text-slate-300 text-xs px-3 py-1.5 rounded-full font-bold border border-slate-600/40 mb-3">
                          {website.category}
                        </span>
                        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-slate-300 transition-colors duration-300">{website.title}</h3>
                        <p className="text-slate-400 leading-relaxed text-sm line-clamp-2">
                          {website.description}
                        </p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-slate-900 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{settings.aboutTitle}</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                {settings.aboutDescription}
              </p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
              {[
                { icon: Award, label: '50+', text: 'Projects Completed', gradient: 'from-cyan-500 to-blue-500' },
                { icon: Users, label: '40+', text: 'Happy Clients', gradient: 'from-green-500 to-emerald-500' },
                { icon: Clock, label: '3+', text: 'Years Experience', gradient: 'from-purple-500 to-pink-500' },
                { icon: Star, label: '5.0', text: 'Average Rating', gradient: 'from-orange-500 to-red-500' }
              ].map((stat, index) => (
                <motion.div
                  key={stat.text}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -5, scale: 1.03 }}
                  className="group text-center p-8 bg-slate-800/60 backdrop-blur-sm rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all duration-300"
                >
                  <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${stat.gradient} bg-opacity-10 rounded-xl mb-4 group-hover:scale-110 transition-transform duration-300`}>
                    <stat.icon className="w-8 h-8 text-white" />
                  </div>
                  <h3 className={`text-3xl font-bold bg-gradient-to-r ${stat.gradient} bg-clip-text text-transparent mb-2`}>
                    {stat.label}
                  </h3>
                  <p className="text-slate-400 text-sm font-medium">{stat.text}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              viewport={{ once: true }}
              className="relative overflow-hidden bg-gradient-to-r from-cyan-600 to-blue-600 rounded-3xl p-12 md:p-16 text-white text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/50 to-purple-600/50 opacity-50"></div>
              <div className="relative z-10">
                <h3 className="text-3xl md:text-4xl font-bold mb-4">Ready to Start Your Project?</h3>
                <p className="text-lg md:text-xl mb-8 text-blue-100 max-w-2xl mx-auto">
                  Let's create something amazing together. Get in touch for a free consultation.
                </p>
                <motion.button
                  onClick={() => scrollToSection('contact')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-cyan-600 px-10 py-4 rounded-xl hover:bg-slate-50 transition-all duration-300 font-bold text-lg shadow-2xl"
                >
                  Get Started Now
                </motion.button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-slate-800/30 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Get In Touch</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                Ready to transform your digital presence? Let's discuss your project
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">Contact Information</h3>
                  <div className="space-y-6">
                    {[
                      { icon: Mail, label: 'Email', value: settings.contactEmail },
                      { icon: Phone, label: 'Phone', value: settings.contactPhone },
                      { icon: MapPin, label: 'Location', value: settings.contactLocation }
                    ].map((contact, index) => (
                      <motion.div
                        key={contact.label}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300"
                      >
                        <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                          <contact.icon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white mb-1">{contact.label}</p>
                          <p className="text-slate-400">{contact.value}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/60 p-8 rounded-2xl border border-slate-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Project Type</label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                    >
                      <option>E-commerce Website</option>
                      <option>Corporate Website</option>
                      <option>Portfolio Website</option>
                      <option>Custom Web Application</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">Message</label>
                    <textarea
                      rows={5}
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none transition-all duration-300"
                      placeholder="Tell us about your project..."
                      required
                    ></textarea>
                  </div>

                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg font-medium"
                    >
                      Thank you! Your message has been sent successfully.
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-600/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-medium"
                    >
                      Sorry, there was an error. Please try again.
                    </motion.div>
                  )}

                  <AnimatedButton
                    variant="primary"
                    size="large"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5 mr-2" />
                    {isSubmitting ? 'Sending...' : 'Send Message'}
                  </AnimatedButton>
                </form>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 border-t border-slate-700/50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row justify-between items-center gap-6"
            >
              <div className="group">
                <IganiLogo className="w-40 h-12" />
                <p className="text-slate-500 mt-3 text-sm max-w-xs">
                  {settings.tagline}
                </p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-slate-400 mb-2">© 2025 {settings.siteName}. All rights reserved.</p>
                <div className="flex gap-4 justify-center md:justify-end">
                  <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">Privacy</a>
                  <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">Terms</a>
                  <a href="#" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">Contact</a>
                </div>
              </div>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  )
}
