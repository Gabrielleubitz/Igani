'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, Target, Heart, Lightbulb, Award, Users } from 'lucide-react'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { AnimatedButton } from '@/components/ui/animated-button'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import { getAboutUsSections, getAboutUsSettings } from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings } from '@/types'

export default function AboutPage() {
  const [sections, setSections] = useState<AboutUsSection[]>([])
  const [settings, setSettings] = useState<AboutUsSettings>({
    pageTitle: 'About IGANI',
    pageSubtitle: 'Crafting digital experiences with passion and precision',
    metaDescription: 'Learn about IGANI - your trusted partner for premium web development and digital solutions.'
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        
        const [sectionsData, settingsData] = await Promise.all([
          getAboutUsSections(),
          getAboutUsSettings()
        ])

        setSections(sectionsData.filter(s => s.published).sort((a, b) => a.order - b.order))
        
        if (settingsData) {
          setSettings(settingsData)
        }
      } catch (error) {
        console.error('Error loading about us data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'mission': return Target
      case 'values': return Heart
      case 'team': return Users
      case 'story': return Lightbulb
      default: return Award
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 relative">
        <StarryBackground />
        <SplashCursor />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-slate-400">Loading about us...</div>
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
              {settings.pageTitle}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-xl text-slate-400 max-w-3xl mx-auto"
            >
              {settings.pageSubtitle}
            </motion.p>
          </div>
        </section>

        {/* Dynamic Sections */}
        {sections.length > 0 ? (
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-24">
                {sections.map((section, index) => {
                  const Icon = getSectionIcon(section.type)
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                          <Icon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-white">
                          {section.title}
                        </h2>
                      </div>
                      <div 
                        className="text-lg text-slate-300 leading-relaxed prose prose-slate max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </section>
        ) : (
          // Default content when no sections are configured
          <section className="py-16 px-4">
            <div className="max-w-7xl mx-auto">
              <div className="space-y-24">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <Target className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      Our Mission
                    </h2>
                  </div>
                  <div className="text-lg text-slate-300 leading-relaxed">
                    <p className="mb-4">
                      At IGANI, we're passionate about creating exceptional digital experiences that drive real business results. 
                      We believe that great design and flawless functionality should go hand in hand, delivering websites and 
                      applications that not only look stunning but perform beautifully.
                    </p>
                    <p>
                      Our team combines technical expertise with creative vision to help businesses establish a powerful 
                      online presence that sets them apart from the competition.
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  viewport={{ once: true }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-8 md:p-12 shadow-lg shadow-slate-950/50"
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                      <Heart className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-white">
                      Our Values
                    </h2>
                  </div>
                  <div className="text-lg text-slate-300 leading-relaxed">
                    <p className="mb-4">
                      <strong className="text-white">Quality First:</strong> We never compromise on quality, ensuring every 
                      project meets the highest standards of design and development.
                    </p>
                    <p className="mb-4">
                      <strong className="text-white">Client Partnership:</strong> We work closely with our clients as true 
                      partners, understanding their vision and bringing it to life.
                    </p>
                    <p>
                      <strong className="text-white">Innovation:</strong> We stay at the forefront of technology and design 
                      trends to deliver cutting-edge solutions.
                    </p>
                  </div>
                </motion.div>
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
                Ready to Work Together?
              </h2>
              <p className="text-lg text-slate-300 mb-8">
                Let's discuss your project and create something amazing together.
              </p>
            </motion.div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <AnimatedButton
                variant="primary"
                size="large"
                onClick={() => window.location.href = '/contact'}
              >
                Start Your Project
              </AnimatedButton>
              
              <AnimatedButton
                variant="secondary"
                size="large"
                onClick={() => window.location.href = '/packages'}
              >
                View Our Services
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