'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageCircle } from 'lucide-react'
import { IganiLogo } from '@/components/IganiLogo'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import { saveContactSubmission } from '@/lib/firestore'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { T } from '@/components/T'
import { useSiteSettings } from '@/hooks/useSiteSettings'

export default function ContactPage() {
  const { settings } = useSiteSettings()
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    projectType: 'Landing Page',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')

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
      <StarryBackground />
      
      {/* Splash Cursor Animation - Full Page */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>
      
      {/* Header with Back Button */}
      <Header 
        showBackButton={true} 
        backButtonText="Back to Home"
        backButtonHref="/"
      />

      {/* Main Content */}
      <div className="relative z-10 pt-32 pb-20 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-6xl mx-auto"
        >
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              <T>Get In Touch</T>
            </h1>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">
              <T>Ready to start your project? Contact us today for a free consultation.</T>
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6 order-2 lg:order-1"
            >
              <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl shadow-slate-950/50">
                <h2 className="text-2xl font-bold text-white mb-6"><T>Contact Information</T></h2>
                <div className="space-y-6">
                  {(settings.businessEmail || 'info@igani.co') && (
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                        <Mail className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1"><T>Email</T></p>
                        <a href={`mailto:${settings.businessEmail || 'info@igani.co'}`} className="text-slate-400 hover:text-cyan-400 transition-colors">
                          {settings.businessEmail || 'info@igani.co'}
                        </a>
                      </div>
                    </div>
                  )}

                  {(settings.businessPhone || '+972 58 44 77757') && (
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                        <Phone className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1"><T>Phone</T></p>
                        <a href={`tel:${settings.businessPhone || '+972584477757'}`} className="text-slate-400 hover:text-cyan-400 transition-colors">
                          {settings.businessPhone || '+972 58 44 77757'}
                        </a>
                      </div>
                    </div>
                  )}

                  {settings.whatsappNumber && (
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center">
                        <MessageCircle className="w-6 h-6 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1"><T>WhatsApp</T></p>
                        <a href={`https://wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-green-400 transition-colors">
                          {settings.whatsappNumber}
                        </a>
                      </div>
                    </div>
                  )}

                  {(settings.businessAddress || 'Netanya, Israel') && (
                    <div className="flex items-start space-x-4 p-4 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-md hover:shadow-lg hover:shadow-cyan-500/10">
                      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-white mb-1"><T>Location</T></p>
                        <p className="text-slate-400">{settings.businessAddress || 'Netanya, Israel'}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-8 p-6 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 border border-cyan-500/30 rounded-xl">
                  <h3 className="text-lg font-bold text-white mb-2"><T>Business Hours</T></h3>
                  <div className="space-y-1 text-slate-300">
                    <p><T>Sunday - Thursday: 9:00 AM - 6:00 PM</T></p>
                    <p><T>Friday: 9:00 AM - 2:00 PM</T></p>
                    <p><T>Saturday: Closed</T></p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="order-1 lg:order-2"
            >
              <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 shadow-xl shadow-slate-950/50">
                <h2 className="text-2xl font-bold text-white mb-6"><T>Send Us a Message</T></h2>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-semibold text-white mb-2"><T>First Name</T></label>
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
                      <label className="block text-sm font-semibold text-white mb-2"><T>Last Name</T></label>
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
                    <label className="block text-sm font-semibold text-white mb-2"><T>Email</T></label>
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
                    <label className="block text-sm font-semibold text-white mb-2"><T>Project Type</T></label>
                    <select
                      name="projectType"
                      value={formData.projectType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                    >
                      <option><T>Landing Page</T></option>
                      <option><T>Small Business Website</T></option>
                      <option><T>Premium Brand Site</T></option>
                      <option><T>E-commerce Website</T></option>
                      <option><T>Custom Web App</T></option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2"><T>Project Details</T></label>
                    <textarea
                      rows={5}
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none transition-all duration-300"
                      placeholder="Describe your business needs and project goals..."
                      required
                    ></textarea>
                  </div>

                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg font-medium"
                    >
                      <T>Thank you for reaching out. We will respond to your inquiry within 24 hours.</T>
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-600/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-medium"
                    >
                      <T>An error occurred. Please try again or contact us directly.</T>
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
                    {isSubmitting ? <T>Submitting...</T> : <T>Start Free Consultation</T>}
                  </AnimatedButton>
                </div>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10">
        <Footer />
      </div>
    </div>
  )
}
