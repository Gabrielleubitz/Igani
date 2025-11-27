'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, Clock, TrendingUp, Users, Zap, ArrowRight } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import { IganiLogo } from '@/components/IganiLogo'

export default function FunnelsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    businessType: '',
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
      // Submit to your API endpoint
      const response = await fetch('/api/funnel-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({
          name: '',
          email: '',
          phone: '',
          businessType: '',
          message: ''
        })
      } else {
        setSubmitStatus('error')
      }
    } catch (error) {
      console.error('Form submission failed:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
      setTimeout(() => setSubmitStatus('idle'), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">
      {/* Starry Night Background */}
      <StarryBackground />

      {/* Splash Cursor Animation */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      {/* Header */}
      <header className="relative z-20 px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <IganiLogo className="w-40 h-12" />
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-12 pb-16 px-4">
          <div className="max-w-6xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="mb-6"
            >
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 backdrop-blur-md border border-cyan-500/40 rounded-full text-cyan-400 text-sm font-semibold shadow-lg shadow-cyan-500/20">
                <Zap className="w-4 h-4" />
                Transform Your Business Online
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 leading-[1.1]"
            >
              <span className="text-white block mb-2">
                Get Your Professional
              </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block">
                Website in 7 Days
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-lg md:text-xl text-slate-300 mb-8 leading-relaxed max-w-3xl mx-auto"
            >
              A stunning, high-converting website built specifically for your business.
              No templates. No compromises. Just results.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="flex justify-center mb-12"
            >
              <AnimatedButton
                variant="primary"
                size="large"
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Get Your Free Quote
                <ArrowRight className="w-5 h-5 ml-2" />
              </AnimatedButton>
            </motion.div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: <Clock className="w-8 h-8" />,
                  title: 'Fast Delivery',
                  description: 'Get your website live in just 7 days. No endless delays or missed deadlines.',
                  gradient: 'from-cyan-500 to-blue-500'
                },
                {
                  icon: <TrendingUp className="w-8 h-8" />,
                  title: 'Conversion Focused',
                  description: 'Built to turn visitors into customers with proven design principles and psychology.',
                  gradient: 'from-blue-500 to-purple-500'
                },
                {
                  icon: <Users className="w-8 h-8" />,
                  title: 'Personal Touch',
                  description: 'Work directly with your developer. No agencies, no middlemen, just great results.',
                  gradient: 'from-purple-500 to-pink-500'
                }
              ].map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -8 }}
                  className="group bg-gradient-to-br from-slate-800/80 to-slate-800/40 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 shadow-xl shadow-slate-950/50 hover:shadow-2xl hover:shadow-cyan-500/20"
                >
                  <div className={`w-16 h-16 bg-gradient-to-br ${benefit.gradient} bg-opacity-20 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    <div className="text-cyan-400">
                      {benefit.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold mb-3 text-white">{benefit.title}</h3>
                  <p className="text-slate-400 leading-relaxed">
                    {benefit.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* What You Get Section */}
        <section className="py-16 px-4 bg-slate-800/20">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                What's Included
              </h2>
              <p className="text-lg text-slate-400">
                Everything you need for a successful online presence
              </p>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                'Custom responsive design',
                'Mobile-optimized',
                'Lightning-fast performance',
                'SEO optimized',
                'Contact form integration',
                'Social media links',
                'Google Analytics setup',
                'SSL certificate included',
                '30 days of support',
                'Easy content updates',
                'Professional copywriting help',
                'Unlimited revisions during build'
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="flex items-start gap-3 bg-slate-800/40 p-4 rounded-lg border border-slate-700/30"
                >
                  <CheckCircle2 className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-300">{feature}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section id="contact-form" className="py-16 px-4 scroll-mt-20">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-lg text-slate-400">
                Fill out the form below and we'll get back to you within 24 hours with a custom quote
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <form onSubmit={handleSubmit} className="bg-slate-800/60 backdrop-blur-sm p-8 rounded-2xl border border-slate-700/50 shadow-xl shadow-slate-950/50">
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="John Doe"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="john@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Business Type *
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                      required
                    >
                      <option value="">Select your business type</option>
                      <option value="restaurant">Restaurant / Cafe</option>
                      <option value="retail">Retail / E-commerce</option>
                      <option value="services">Professional Services</option>
                      <option value="healthcare">Healthcare / Medical</option>
                      <option value="real-estate">Real Estate</option>
                      <option value="fitness">Fitness / Wellness</option>
                      <option value="creative">Creative / Agency</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-white mb-2">
                      Tell Us About Your Project *
                    </label>
                    <textarea
                      rows={5}
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none transition-all duration-300"
                      placeholder="Describe your business and what you're looking for in a website..."
                      required
                    ></textarea>
                  </div>

                  {submitStatus === 'success' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg font-medium text-center"
                    >
                      Thanks for reaching out! We'll get back to you within 24 hours with your custom quote.
                    </motion.div>
                  )}

                  {submitStatus === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-600/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-medium text-center"
                    >
                      Something went wrong. Please try again or email us directly at info@igani.co
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
                    {isSubmitting ? 'Sending...' : 'Get Your Free Quote'}
                  </AnimatedButton>

                  <p className="text-slate-500 text-xs text-center">
                    By submitting this form, you agree to our privacy policy. We'll never share your information.
                  </p>
                </div>
              </form>
            </motion.div>
          </div>
        </section>

        {/* Trust Indicators */}
        <section className="py-16 px-4 bg-slate-800/20">
          <div className="max-w-5xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-8">
                Why Choose IGANI?
              </h3>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
                    100%
                  </div>
                  <p className="text-slate-400">Customer Satisfaction</p>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
                    7 Days
                  </div>
                  <p className="text-slate-400">Average Delivery Time</p>
                </div>
                <div>
                  <div className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent mb-2">
                    24/7
                  </div>
                  <p className="text-slate-400">Support Available</p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-transparent border-t border-slate-700/50 py-8">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">
              © 2025 IGANI. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
