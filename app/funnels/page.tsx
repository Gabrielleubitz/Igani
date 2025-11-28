'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, Clock, Timer, Phone, ExternalLink, Star } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import { IganiLogo } from '@/components/IganiLogo'
import { getPromoBannerSettings } from '@/lib/firestore'
import { PromoBannerSettings } from '@/types'

export default function FunnelsPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [formData2, setFormData2] = useState({
    name: '',
    email: '',
    phone: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitting2, setIsSubmitting2] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitStatus2, setSubmitStatus2] = useState<'idle' | 'success' | 'error'>('idle')
  const [offerEndDate, setOfferEndDate] = useState<Date | null>(null)
  const [offerExpired, setOfferExpired] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showStickyCTA, setShowStickyCTA] = useState(false)
  const [bannerSettings, setBannerSettings] = useState<PromoBannerSettings | null>(null)

  // Fetch offer end date and banner settings on component mount
  useEffect(() => {
    const fetchOfferEndDate = async () => {
      try {
        const response = await fetch('/api/admin/offer-settings')
        if (response.ok) {
          const data = await response.json()
          if (data.endDate) {
            setOfferEndDate(new Date(data.endDate))
          }
        }
      } catch (error) {
        console.error('Error fetching offer end date:', error)
      }
    }

    const fetchBannerSettings = async () => {
      try {
        const settings = await getPromoBannerSettings()
        if (settings && settings.enabled) {
          setBannerSettings(settings)
        }
      } catch (error) {
        console.error('Error fetching banner settings:', error)
      }
    }

    fetchOfferEndDate()
    fetchBannerSettings()
  }, [])

  // Real-time countdown timer
  useEffect(() => {
    if (!offerEndDate) return

    const updateCountdown = () => {
      const now = new Date()
      const timeDiff = offerEndDate.getTime() - now.getTime()

      if (timeDiff <= 0) {
        setOfferExpired(true)
        setTimeLeft(0)
        return
      }

      setOfferExpired(false)
      setTimeLeft(Math.floor(timeDiff / 1000))
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)

    return () => clearInterval(timer)
  }, [offerEndDate])

  // Sticky CTA visibility on scroll
  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const formatTime = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60))
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60))
    const minutes = Math.floor((seconds % (60 * 60)) / 60)
    const secs = seconds % 60

    if (days > 0) {
      return `${days}d ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleInputChange2 = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData2({
      ...formData2,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          source: 'landing_page',
          sourceDetails: {
            page: '/funnels',
            form: 'hero',
            campaign: 'black_friday'
          },
          message: 'Black Friday landing page submission - Hero form'
        })
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({ name: '', email: '', phone: '' })
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

  const handleSubmit2 = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting2(true)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData2,
          source: 'landing_page',
          sourceDetails: {
            page: '/funnels',
            form: 'secondary',
            campaign: 'black_friday'
          },
          message: 'Black Friday landing page submission - Secondary form'
        })
      })

      if (response.ok) {
        setSubmitStatus2('success')
        setFormData2({ name: '', email: '', phone: '' })
      } else {
        setSubmitStatus2('error')
      }
    } catch (error) {
      console.error('Form submission failed:', error)
      setSubmitStatus2('error')
    } finally {
      setIsSubmitting2(false)
      setTimeout(() => setSubmitStatus2('idle'), 5000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 relative overflow-hidden">

      {/* Mobile Sticky CTA */}
      {showStickyCTA && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-yellow-400 p-4 shadow-2xl"
        >
          <button
            onClick={() => document.getElementById('hero-form')?.scrollIntoView({ behavior: 'smooth' })}
            className="w-full bg-slate-800 text-yellow-400 font-bold py-3 px-6 rounded-lg text-lg hover:bg-slate-700 transition-colors"
          >
            Get Black Friday Offer
          </button>
        </motion.div>
      )}

      {/* Header */}
      <header className="relative z-20 px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <IganiLogo className="w-32 h-10" />
        </div>
      </header>

      {/* Promo Banner Section */}
      {bannerSettings && (
        <div
          className="relative z-20 py-3 px-4 text-center"
          style={{
            background: bannerSettings.backgroundGradient || bannerSettings.backgroundColor,
            color: bannerSettings.textColor
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-center gap-3">
              <span className="text-lg font-bold">
                {bannerSettings.title}
              </span>
              {bannerSettings.ctaLabel && bannerSettings.ctaUrl && (
                <a
                  href={bannerSettings.ctaUrl}
                  className="px-4 py-1 bg-white/20 hover:bg-white/30 rounded-full text-sm font-semibold transition-colors"
                >
                  {bannerSettings.ctaLabel}
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10">
        {/* Hero Section - Above the Fold Only */}
        <section className="pt-4 pb-12 px-4 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              {/* Left Column - Headlines & Copy */}
              <div className="order-2 lg:order-1">
                {/* Black Friday Urgency Badge */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6 }}
                  className="mb-6"
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-400 text-slate-900 font-bold rounded-full text-sm uppercase tracking-wide shadow-2xl">
                    <Timer className="w-4 h-4" />
                    Limited 24h Black Friday Offer
                  </span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight"
                >
                  <span className="text-white block mb-2">
                    Stop Losing Customers
                  </span>
                  <span className="text-blue-400 block">
                    Every Single Day
                  </span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="text-xl text-slate-300 mb-6 leading-relaxed"
                >
                  Your competitors get customers while you lose them to amateur websites
                </motion.p>

                {/* Bullet Points */}
                <motion.ul
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="space-y-3 mb-8"
                >
                  {[
                    'Professional website that converts visitors into paying customers',
                    'Built in 7 days (not 7 weeks like agencies)',
                    'Costs 80% less than hiring a full agency'
                  ].map((point, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-purple-400 mt-1 flex-shrink-0" />
                      <span className="text-slate-300 text-lg">{point}</span>
                    </li>
                  ))}
                </motion.ul>

                {/* Countdown Timer */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="bg-yellow-400/20 border-2 border-yellow-400 rounded-lg p-4 mb-6"
                >
                  {offerExpired ? (
                    <div className="text-center">
                      <div className="text-white font-bold text-sm mb-2">BLACK FRIDAY OFFER:</div>
                      <div className="text-2xl font-black text-red-400">
                        Offer has ended
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-white font-bold text-sm mb-2">OFFER EXPIRES IN:</div>
                      <div className="text-3xl font-black text-yellow-400 font-mono tracking-wider">
                        {formatTime(timeLeft)}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Right Column - Lead Form */}
              <div className="order-2 lg:order-2">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  id="hero-form"
                  className="bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border-4 border-blue-400"
                >
                  <div className="text-center mb-6">
                    <div className="bg-yellow-400 text-slate-900 font-bold py-2 px-4 rounded-full text-sm mb-3">
                      BLACK FRIDAY SPECIAL
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 mb-2">
                      Get Your Website Built Now
                    </h3>
                    <p className="text-slate-600 font-bold">
                      Limited Time Black Friday Offer
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                        placeholder="Your Full Name"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                        placeholder="Your Phone Number"
                        required
                      />
                    </div>

                    <div>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                        placeholder="Your Email Address"
                        required
                      />
                    </div>

                    {submitStatus === 'success' ? (
                      <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg text-center font-bold">
                        Success! We'll call you today.
                      </div>
                    ) : (
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-black py-4 px-6 rounded-lg text-xl transition-colors disabled:opacity-50 shadow-xl"
                      >
                        {isSubmitting ? 'SUBMITTING...' : 'SECURE MY 50% DISCOUNT NOW'}
                      </button>
                    )}
                    
                    <div className="text-center text-sm text-slate-600 font-medium">
                      ✓ We'll contact you today.<br />
                      ✓ No obligation. Just a quick call.
                    </div>
                  </form>
                </motion.div>
              </div>
            </div>
          </div>
        </section>


        {/* What They Get Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-black text-white mb-4">
                Wix and DIY Websites vs What Igani Builds
              </h2>
              <p className="text-xl text-slate-300">
                Stop wasting months on Wix. Get a real website that works.
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-8 mb-12">
              {/* DIY Disasters - Shows first on mobile */}
              <div className="bg-red-900/20 border-2 border-red-500 p-6 rounded-lg order-1 lg:order-2">
                <h3 className="text-2xl font-bold text-red-400 mb-4 text-center">Your Current Website</h3>
                <ul className="space-y-3">
                  {[
                    'Looks cheap (customers judge in 3 seconds)',
                    'Takes 3+ months to build (if you finish)',
                    'Slow loading times (customers leave)',
                    'Broken on mobile devices',
                    'Generic copy that says nothing',
                    'Invisible on Google search'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                        <span className="text-white text-xs font-bold">✗</span>
                      </div>
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* What Igani Builds - Shows second on mobile */}
              <div className="bg-green-900/20 border-2 border-green-500 p-6 rounded-lg order-2 lg:order-1">
                <h3 className="text-2xl font-bold text-green-400 mb-4 text-center">Igani Website</h3>
                <ul className="space-y-3">
                  {[
                    'Converts visitors into customers (proven psychology)',
                    'Built in 7 days by a professional developer', 
                    'Loads in under 2 seconds (Google loves this)',
                    'Mobile-first design that actually works',
                    'Professional copywriting that sells',
                    'SEO optimized to rank on Google'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg text-slate-300 mb-2">
                <strong className="text-white">How fast:</strong> 7 days from payment to live website
              </p>
              <p className="text-lg text-slate-300 mb-2">
                <strong className="text-white">Why it converts:</strong> Built using psychology and proven formulas
              </p>
              <p className="text-lg text-slate-300">
                <strong className="text-white">Better than DIY:</strong> Professional developer vs. you guessing
              </p>
            </div>
          </div>
        </section>

        {/* Mini Portfolio Section */}
        <section className="py-16 px-4 bg-slate-800/20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-black text-white mb-4">
                Real Results From Real Businesses
              </h2>
              <p className="text-xl text-slate-300">
                See what happens when you get a professional website
              </p>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              {[
                {
                  title: "Local Restaurant",
                  result: "+180% online orders in 30 days",
                  description: "Clean menu display, easy ordering system, mobile-first design"
                },
                {
                  title: "Dental Practice", 
                  result: "+95% appointment bookings",
                  description: "Professional trust-building design, simple booking form, patient testimonials"
                },
                {
                  title: "Construction Company",
                  result: "+240% quote requests",
                  description: "Portfolio showcase, before/after photos, clear contact forms"
                }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-700/50 border border-slate-600/50 p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                  <div className="text-2xl font-black text-green-400 mb-3">{item.result}</div>
                  <p className="text-slate-300">{item.description}</p>
                </motion.div>
              ))}
            </div>

            {/* Testimonials Section - Moved Here */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12"
            >
              {[
                "Got 12 new customers in first month with my new site",
                "Sales increased 300% after launch, worth every penny",
                "Finally have a website I'm proud to show people",
                "Booked solid for 3 months straight now"
              ].map((testimonial, index) => (
                <div key={index} className="bg-slate-700/50 p-4 rounded-lg border border-slate-600/50">
                  <div className="flex items-center mb-2">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm italic">"{testimonial}"</p>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* Secondary CTA Section */}
        <section className="py-20 px-4 bg-yellow-400">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <div className="bg-black text-yellow-400 font-bold py-2 px-6 rounded-full text-lg mb-6 inline-block">
                {offerExpired ? (
                  "⚠️ OFFER ENDED"
                ) : (
                  `⚠️ ${formatTime(timeLeft)} LEFT`
                )}
              </div>
              <h2 className="text-4xl lg:text-6xl font-black text-white mb-6">
                Don't Let Your Competition Win Again
              </h2>
              <p className="text-xl text-slate-900 mb-2">
                <strong>Only 12 spots left at this price.</strong>
              </p>
              <p className="text-xl text-slate-900 mb-8">
                Prices return to normal after Black Friday.
              </p>
            </motion.div>

            {/* Second Lead Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white p-8 rounded-2xl shadow-2xl max-w-md mx-auto"
            >
              <h3 className="text-2xl font-black text-slate-800 mb-6">
                Last Chance: 50% Off Website
              </h3>
              
              <form onSubmit={handleSubmit2} className="space-y-4">
                <div>
                  <input
                    type="text"
                    name="name"
                    value={formData2.name}
                    onChange={handleInputChange2}
                    className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                    placeholder="Your Full Name"
                    required
                  />
                </div>

                <div>
                  <input
                    type="tel"
                    name="phone"
                    value={formData2.phone}
                    onChange={handleInputChange2}
                    className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                    placeholder="Your Phone Number"
                    required
                  />
                </div>

                <div>
                  <input
                    type="email"
                    name="email"
                    value={formData2.email}
                    onChange={handleInputChange2}
                    className="w-full px-4 py-4 border-2 border-slate-300 rounded-lg focus:border-blue-400 focus:outline-none text-slate-800 font-medium"
                    placeholder="Your Email Address"
                    required
                  />
                </div>

                {submitStatus2 === 'success' ? (
                  <div className="bg-green-100 border-2 border-green-500 text-green-800 p-4 rounded-lg text-center font-bold">
                    Success! We'll call you today.
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting2}
                    className="w-full bg-black hover:bg-slate-800 text-white font-black py-4 px-6 rounded-lg text-xl transition-colors disabled:opacity-50 shadow-xl"
                  >
                    {isSubmitting2 ? 'SUBMITTING...' : 'SECURE MY 50% DISCOUNT NOW'}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-4xl font-black text-white mb-4">
                Common Questions
              </h2>
            </motion.div>

            <div className="space-y-6">
              {[
                {
                  q: "How fast will you really build my website?",
                  a: "7 days from payment to live website. Not 7 weeks like agencies."
                },
                {
                  q: "What if I don't like the website?",
                  a: "Multiple revisions during the 7-day build. We don't stop until you're happy."
                },
                {
                  q: "Do you handle hosting and domains?",
                  a: "Yes. Everything is included. You get a complete, live website."
                }
              ].map((faq, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-lg"
                >
                  <h3 className="text-xl font-bold text-white mb-3">{faq.q}</h3>
                  <p className="text-slate-300 text-lg">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-800 border-t border-slate-700/50 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center">
            <p className="text-slate-400 text-sm">
              © 2025 IGANI. All rights reserved. • <a href="mailto:info@igani.co" className="text-purple-400 hover:text-purple-300">info@igani.co</a>
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
