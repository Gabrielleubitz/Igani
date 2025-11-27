'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Check, ChevronDown, ChevronUp, Calendar, Mail, ArrowRight, MessageSquare } from 'lucide-react'
import {
  getPackages,
  getMaintenancePlans,
  getPackageSettings
} from '@/lib/firestore'
import { Package, MaintenancePlan, PackageSettings } from '@/types'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { T } from '@/components/T'

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([])
  const [maintenancePlans, setMaintenancePlans] = useState<MaintenancePlan[]>([])
  const [settings, setSettings] = useState<PackageSettings>({
    currencySymbol: '₪',
    showComparison: true,
    contactCtaText: 'Free Consultation',
    contactEmail: 'info@igani.co',
    calendlyUrl: ''
  })
  const [expandedAddOns, setExpandedAddOns] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)

        const [packagesData, plansData, settingsData] = await Promise.all([
          getPackages(),
          getMaintenancePlans(),
          getPackageSettings()
        ])

        const publishedPackages = packagesData.filter(p => p.published)
        console.log('Loaded packages:', publishedPackages)
        console.log('Package badges:', publishedPackages.map(p => ({ name: p.name, badge: p.badge })))
        setPackages(publishedPackages)
        setMaintenancePlans(plansData.filter(p => p.published))

        if (settingsData) {
          setSettings(settingsData)
        }
      } catch (error) {
        console.error('Error loading packages data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const toggleAddOns = (packageId: string) => {
    setExpandedAddOns(prev => ({
      ...prev,
      [packageId]: !prev[packageId]
    }))
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 relative">
        <StarryBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-slate-400"><T>Loading packages...</T></div>
        </div>
      </div>
    )
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

      <div className="relative z-10">
        {/* Hero Section */}
        <section className="pt-32 pb-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-5xl md:text-6xl font-bold text-white mb-6"
            >
              <T>Packages</T>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-slate-400 max-w-2xl mx-auto"
            >
              <T>Choose the perfect package for your project. From simple landing pages to complex web applications.</T>
            </motion.p>
          </div>
        </section>

        {/* Package Cards */}
        <section className="py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {packages.map((pkg, index) => (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 md:p-8 hover:border-cyan-500/50 transition-all duration-300 shadow-lg shadow-slate-950/50 hover:shadow-xl hover:shadow-cyan-500/10 flex flex-col h-full relative"
                >
                  {/* Badge */}
                  {(pkg.badge === 'best-seller' || pkg.badge === 'recommended' || pkg.badge === 'popular' || pkg.badge === 'new' || pkg.badge === 'custom') && (
                    <div className="absolute top-4 right-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
                        pkg.badge === 'custom'
                          ? `bg-gradient-to-r ${pkg.customBadgeGradient || 'from-pink-500 to-purple-500'} text-white`
                          : pkg.badge === 'best-seller' ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white' :
                          pkg.badge === 'recommended' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' :
                          pkg.badge === 'popular' ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' :
                          'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                      }`}>
                        {pkg.badge === 'custom' && pkg.customBadgeText ? pkg.customBadgeText.toUpperCase() :
                         pkg.badge === 'best-seller' ? 'BEST SELLER' :
                         pkg.badge === 'recommended' ? 'RECOMMENDED' :
                         pkg.badge === 'popular' ? 'POPULAR' :
                         'NEW'}
                      </span>
                    </div>
                  )}

                  {/* Content Area - grows to fill available space */}
                  <div className="flex-1">
                    {/* Package Header */}
                    <div className="mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{pkg.name}</h3>
                      <p className="text-cyan-400 mb-4">{pkg.tagline}</p>
                      <p className="text-slate-400 text-sm">{pkg.bestFor}</p>
                      {pkg.showPricing ? (
                        <div className="mt-3">
                          {pkg.showDiscount && pkg.originalPrice && pkg.originalPrice > pkg.price ? (
                            <div className="space-y-2">
                              <div className="flex items-baseline gap-2 flex-wrap">
                                <span className="text-lg text-slate-500 line-through">
                                  {settings.currencySymbol}{pkg.originalPrice.toLocaleString()}
                                </span>
                                <span className="text-3xl font-bold text-white">
                                  {settings.currencySymbol}{pkg.price.toLocaleString()}
                                </span>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm font-bold rounded-md">
                                  {Math.round(((pkg.originalPrice - pkg.price) / pkg.originalPrice) * 100)}% OFF
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">
                                <T>Starting from</T>
                              </p>
                            </div>
                          ) : (
                            <p className="text-3xl font-bold text-white">
                              <T>Starting from</T> {settings.currencySymbol}{pkg.price.toLocaleString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-3 px-3 py-2 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 rounded-lg border border-cyan-500/20">
                          <p className="text-cyan-300 text-sm font-medium"><T>Contact for pricing</T></p>
                        </div>
                      )}
                    </div>

                    {/* Includes */}
                    <div className="mb-6">
                      <h4 className="text-white font-semibold mb-3"><T>Includes:</T></h4>
                      <ul className="space-y-2">
                        {pkg.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                            <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Add-ons */}
                    {pkg.addOns.length > 0 && (
                      <div className="mb-6">
                        <button
                          onClick={() => toggleAddOns(pkg.id)}
                          className="flex items-center gap-2 text-white font-semibold mb-3 hover:text-cyan-400 transition-colors"
                        >
                          <T>Add-ons</T>
                          {expandedAddOns[pkg.id] ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                        {expandedAddOns[pkg.id] && (
                          <motion.ul
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-2"
                          >
                            {pkg.addOns.map((addOn, i) => (
                              <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                                <Check className="w-4 h-4 text-cyan-400 mt-0.5 flex-shrink-0" />
                                <span>{addOn.name}</span>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Bottom Section - always at bottom */}
                  <div className="text-center pt-6 border-t border-slate-700/50 mt-auto">
                    <p className="text-slate-400 text-sm mb-4">
                      <strong><T>Delivery:</T></strong> {pkg.delivery}
                    </p>
                    <AnimatedButton
                      variant="secondary"
                      size="default"
                      className="w-full"
                      onClick={() => window.location.href = '/contact'}
                    >
                      <T>Get Started</T>
                    </AnimatedButton>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Maintenance Plans */}
        {maintenancePlans.length > 0 && (
          <section className="py-16 px-4 bg-slate-800/20">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-12">
                <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
                  <T>Maintenance & Care Plans</T>
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto">
                  <T>Keep your website secure, updated, and performing at its best</T>
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {maintenancePlans.map((plan, index) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 shadow-lg shadow-slate-950/50 hover:shadow-xl hover:shadow-purple-500/10 flex flex-col h-full"
                  >
                    {/* Content Area - grows to fill available space */}
                    <div className="flex-1">
                      <div className="text-center mb-6">
                        <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                        <div className="px-3 py-2 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-lg border border-purple-500/20">
                          <p className="text-purple-300 text-sm font-medium"><T>Pricing discussed in consultation</T></p>
                        </div>
                      </div>

                      <ul className="space-y-3 mb-6">
                        {plan.includes.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                            <Check className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Button - always at bottom */}
                    <AnimatedButton
                      variant="secondary"
                      size="default"
                      className="w-full"
                      onClick={() => window.location.href = '/contact'}
                    >
                      <T>Choose Plan</T>
                    </AnimatedButton>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 px-4 bg-gradient-to-r from-cyan-600/10 to-blue-600/10 backdrop-blur-sm">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-8"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                <T>Ready to Start Your Project?</T>
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                <T>Let's discuss your needs and find the perfect solution for your business.</T>
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              {settings.calendlyUrl ? (
                <AnimatedButton
                  variant="primary"
                  size="large"
                  onClick={() => window.open(settings.calendlyUrl, '_blank')}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {settings.contactCtaText}
                </AnimatedButton>
              ) : (
                <AnimatedButton
                  variant="primary"
                  size="large"
                  onClick={() => window.location.href = `mailto:${settings.contactEmail}?subject=Project Inquiry`}
                >
                  <MessageSquare className="w-5 h-5 mr-2" />
                  {settings.contactCtaText}
                </AnimatedButton>
              )}
              
              <AnimatedButton
                variant="secondary"
                size="large"
                onClick={() => window.location.href = `mailto:${settings.contactEmail}?subject=General Inquiry`}
              >
                <T>Contact Us</T>
                <ArrowRight className="w-5 h-5 ml-2" />
              </AnimatedButton>
            </div>
          </div>
        </section>
        
        {/* Footer */}
        <Footer 
          siteName="IGANI" 
          tagline="Premium web development with a personal touch" 
        />
      </div>
    </div>
  )
}