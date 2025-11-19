'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { StarryBackground } from '@/components/ui/starry-background'
import { AnimatedButton } from '@/components/ui/animated-button'
import { IganiLogo } from '@/components/IganiLogo'
import Header from '@/components/Header'
import { defaultSettings } from '@/data/defaultSettings'
import { getWebsites, getSettings, saveContactSubmission, getTestimonials } from '@/lib/firestore'
import { Website, SiteSettings, Testimonial } from '@/types'
import { siteContent } from '@/lib/i18n'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  ExternalLink,
  Award,
  Users,
  Clock,
  Star
} from 'lucide-react'

export default function HebrewHomePage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectType: 'Landing Page',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

  // Firebase data
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [websites, setWebsites] = useState<Website[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Hebrew content
  const content = siteContent.home
  const nav = siteContent.navigation
  const projectTypes = siteContent.projectTypes
  const footer = siteContent.footer

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

        // Load websites - always set the data from Firebase
        const firebaseWebsites = await getWebsites()
        setWebsites(firebaseWebsites)

        // Load testimonials
        const firebaseTestimonials = await getTestimonials()
        setTestimonials(firebaseTestimonials)
      } catch (error) {
        console.error('Error loading data from Firebase:', error)
        // Set empty array on error
        setWebsites([])
        setTestimonials([])
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const featuredWebsites = websites.filter(w => w.featured)
  const regularWebsites = websites.filter(w => !w.featured)

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
        projectType: 'Landing Page',
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


  return (
    <div className="min-h-screen bg-slate-900 relative">
      {/* Starry Night Background */}
      <StarryBackground />

      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      {/* Header */}
      <Header />

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
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-md border border-cyan-500/40 rounded-full text-cyan-400 text-sm font-semibold shadow-lg shadow-cyan-500/20 rtl-flex-reverse">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                {content.heroTagline.he}
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-5 leading-[1.1]"
            >
              הרם את המותג שלך
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent">
                עם מפתח אישי
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto"
            >
              {content.heroSubtitle.he}
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center rtl-flex-reverse"
            >
              <AnimatedButton
                variant="primary"
                size="large"
                onClick={() => window.location.href = '/he/contact'}
              >
                {content.ctaFreeConsultation.he}
              </AnimatedButton>
              <AnimatedButton
                variant="secondary"
                size="large"
                onClick={() => document.getElementById('portfolio')?.scrollIntoView({ behavior: 'smooth' })}
              >
                {content.ctaViewWork.he}
              </AnimatedButton>
            </motion.div>
          </div>
        </section>

        {/* Services Section */}
        <section className="py-24 bg-transparent">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                {content.servicesTitle.he}
              </h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                {content.servicesSubtitle.he}
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 shadow-xl shadow-slate-950/50 hover:shadow-2xl hover:shadow-blue-500/20"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{content.customWebDevTitle.he}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {content.customWebDevDescription.he}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -8 }}
                className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-purple-500/50 transition-all duration-300 shadow-xl shadow-slate-950/50 hover:shadow-2xl hover:shadow-purple-500/20"
              >
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-purple-600/10 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-white">{content.uiUxDesignTitle.he}</h3>
                <p className="text-slate-400 leading-relaxed">
                  {content.uiUxDesignDescription.he}
                </p>
              </motion.div>
            </div>

            {/* Process Timeline - RTL adjusted */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {content.processTitle.he}
              </h3>
              <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                {content.processSubtitle.he}
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
                      title: content.step1Title.he,
                      description: content.step1Description.he,
                      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>,
                      gradient: 'from-cyan-500 to-blue-500'
                    },
                    {
                      step: '02',
                      title: content.step2Title.he,
                      description: content.step2Description.he,
                      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
                      gradient: 'from-blue-500 to-indigo-500'
                    },
                    {
                      step: '03',
                      title: content.step3Title.he,
                      description: content.step3Description.he,
                      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>,
                      gradient: 'from-indigo-500 to-purple-500'
                    },
                    {
                      step: '04',
                      title: content.step4Title.he,
                      description: content.step4Description.he,
                      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
                      gradient: 'from-purple-500 to-pink-500'
                    },
                    {
                      step: '05',
                      title: content.step5Title.he,
                      description: content.step5Description.he,
                      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
                      gradient: 'from-pink-500 to-rose-500'
                    }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: index % 2 === 0 ? 50 : -50 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className={`relative flex items-center gap-8 ${
                        index % 2 === 0 ? 'md:flex-row-reverse' : 'md:flex-row'
                      }`}
                    >
                      {/* Content Card */}
                      <div className="flex-1 md:w-[calc(50%-3rem)]">
                        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600 transition-all duration-300 shadow-lg shadow-slate-950/50 hover:shadow-2xl hover:shadow-cyan-500/10 timeline-content">
                          <div className="flex items-center gap-4 mb-4 rtl-flex-reverse">
                            <div className={`w-12 h-12 bg-gradient-to-br ${item.gradient} rounded-xl flex items-center justify-center text-2xl`}>
                              {item.icon}
                            </div>
                            <div>
                              <div className={`text-xs font-bold bg-gradient-to-r ${item.gradient} bg-clip-text text-transparent mb-1`}>
                                שלב {item.step}
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
                  onClick={() => window.location.href = '/he/contact'}
                  className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold text-lg rounded-xl shadow-2xl shadow-cyan-500/30 hover:shadow-cyan-500/50 transition-all duration-300 hover:scale-105 rtl-flex-reverse"
                >
                  {content.ctaFreeConsultation.he}
                  <Send className="w-5 h-5" />
                </button>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Portfolio Section */}
        <section id="portfolio" className="py-24 bg-transparent scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{content.portfolioTitle.he}</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                {content.portfolioSubtitle.he}
              </p>
            </motion.div>


            {/* Featured Projects */}
            {featuredWebsites.length > 0 && (
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-8 rtl-flex-reverse">
                  <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                  <h3 className="text-2xl font-bold text-white">{content.featuredProjects.he}</h3>
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
                      className="group relative bg-slate-800/60 border border-slate-700/50 rounded-3xl overflow-hidden shadow-xl shadow-slate-950/50 hover:shadow-2xl hover:shadow-cyan-500/30 transition-all duration-500 hover:border-cyan-500/60 cursor-pointer"
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
                          {content.featured.he}
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


          </div>
        </section>

        {/* About Section */}
        <section id="about" className="py-24 bg-transparent scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{content.aboutTitle.he}</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed">
                {content.aboutDescription.he}
              </p>
            </motion.div>

            {/* Testimonials */}
            {testimonials.length > 0 && testimonials.filter(t => t.featured).length > 0 && (
              <div className="mb-20">
                <div className="flex items-center gap-3 mb-8 rtl-flex-reverse">
                  <div className="w-1 h-8 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
                  <h3 className="text-2xl font-bold text-white">{content.testimonialsTitle.he}</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {testimonials.filter(t => t.featured).slice(0, 6).map((testimonial, index) => (
                    <motion.div
                      key={testimonial.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      whileHover={{ y: -8 }}
                      className="group bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 shadow-lg shadow-slate-950/50 hover:shadow-xl hover:shadow-cyan-500/10"
                    >
                      {/* Rating */}
                      <div className="flex items-center gap-1 mb-4 rtl-flex-reverse">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < testimonial.rating
                                ? 'text-yellow-400 fill-current'
                                : 'text-slate-600'
                            }`}
                          />
                        ))}
                        <span className="text-xs text-slate-400 ml-2">
                          {testimonial.rating}.0
                        </span>
                      </div>

                      {/* Message */}
                      <blockquote className="text-slate-300 text-sm leading-relaxed mb-6 line-clamp-4">
                        "{testimonial.message}"
                      </blockquote>

                      {/* Author */}
                      <div className="flex items-center gap-3 rtl-flex-reverse">
                        {testimonial.image ? (
                          <img
                            src={testimonial.image}
                            alt={testimonial.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center">
                            <span className="text-cyan-400 font-bold text-sm">
                              {testimonial.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <h4 className="text-white font-semibold text-sm">
                            {testimonial.name}
                          </h4>
                          <p className="text-slate-400 text-xs">
                            {testimonial.role} ב{testimonial.company}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-24 bg-transparent scroll-mt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">{content.contactTitle.he}</h2>
              <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
                {content.contactSubtitle.he}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="space-y-8"
              >
                <div>
                  <h3 className="text-2xl font-bold text-white mb-6">{content.contactInfo.he}</h3>
                  <div className="space-y-6">
                    {[
                      { icon: Mail, label: 'אימייל', value: settings.contactEmail },
                      { icon: Phone, label: 'טלפון', value: settings.contactPhone },
                      { icon: MapPin, label: 'מיקום', value: settings.contactLocation }
                    ].map((contact, index) => (
                      <motion.div
                        key={contact.label}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-start space-x-4 p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-md shadow-slate-950/50 hover:shadow-lg hover:shadow-cyan-500/10 rtl-space-reverse"
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
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
              >
                <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/60 p-8 rounded-2xl border border-slate-700/50 shadow-xl shadow-slate-950/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2">{content.firstName.he}</label>
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
                      <label className="block text-sm font-semibold text-white mb-2">{content.lastName.he}</label>
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
                    <label className="block text-sm font-semibold text-white mb-2">{content.email.he}</label>
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
                    <label className="block text-sm font-semibold text-white mb-2">{content.projectType.he}</label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                    >
                      <option>{projectTypes.landingPage.he}</option>
                      <option>{projectTypes.smallBusiness.he}</option>
                      <option>{projectTypes.premiumBrand.he}</option>
                      <option>{projectTypes.ecommerce.he}</option>
                      <option>{projectTypes.customWebApp.he}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">{content.projectDetails.he}</label>
                    <textarea
                      rows={5}
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none transition-all duration-300"
                      placeholder={content.projectDetailsPlaceholder.he}
                      required
                    ></textarea>
                  </div>

                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg font-medium"
                    >
                      {content.successMessage.he}
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-600/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-medium"
                    >
                      {content.errorMessage.he}
                    </motion.div>
                  )}

                  <AnimatedButton
                    variant="primary"
                    size="large"
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full disabled:opacity-50 disabled:cursor-not-allowed rtl-flex-reverse"
                  >
                    <Send className="w-5 h-5 mr-2 btn-icon-left" />
                    {isSubmitting ? content.submitting.he : content.submitButton.he}
                  </AnimatedButton>
                </form>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-transparent border-t border-slate-700/50 py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="flex flex-col md:flex-row justify-between items-center gap-6 rtl-flex-reverse"
            >
              <div className="group">
                <IganiLogo className="w-44 h-14" />
                <p className="text-slate-500 mt-3 text-sm max-w-xs">
                  {settings.tagline}
                </p>
              </div>
              <div className="text-center md:text-right">
                <p className="text-slate-400 mb-2">© 2025 {settings.siteName}. {footer.allRightsReserved.he}.</p>
                <div className="flex gap-4 justify-center md:justify-end rtl-flex-reverse">
                  <a href="/he/privacy" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">{footer.privacy.he}</a>
                  <a href="/he/terms" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">{footer.terms.he}</a>
                  <a href="/he/contact" className="text-slate-400 hover:text-cyan-400 transition-colors text-sm">{footer.contact.he}</a>
                </div>
              </div>
            </motion.div>
          </div>
        </footer>
      </div>
    </div>
  )
}