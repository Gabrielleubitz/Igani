'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ExternalLink, Monitor, Smartphone, Tablet, Globe, Eye } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { getWebsites } from '@/lib/firestore'
import { Website } from '@/types'
import { StarryBackground } from '@/components/ui/starry-background'
import { SplashCursor } from '@/components/ui/splash-cursor'
import { IganiLogo } from '@/components/IganiLogo'
import Header from '@/components/Header'
import { LoadingScreen } from '@/components/ui/loading-screen'
import { T } from '@/components/T'

export default function PreviewPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [website, setWebsite] = useState<Website | null>(null)
  const [viewMode, setViewMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isHoveringIframe, setIsHoveringIframe] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const loadWebsite = async () => {
      try {
        const websites = await getWebsites()
        const found = websites.find(w => w.id === params.id)
        if (found) {
          setWebsite(found)
        }
      } catch (error) {
        console.error('Error loading website:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadWebsite()
  }, [params.id])

  useEffect(() => {
    const handleScroll = (e: WheelEvent) => {
      if (isHoveringIframe && iframeRef.current) {
        e.preventDefault()
        try {
          iframeRef.current.contentWindow?.scrollBy(0, e.deltaY)
        } catch (error) {
          console.log('Cross-origin iframe - letting iframe handle scroll')
        }
      }
    }

    document.addEventListener('wheel', handleScroll, { passive: false })
    return () => document.removeEventListener('wheel', handleScroll)
  }, [isHoveringIframe])

  if (isLoading) {
    return <LoadingScreen message="Loading website preview..." />
  }

  if (!website) {
    return (
      <div className="min-h-screen bg-slate-900 relative">
        <StarryBackground />
        <SplashCursor />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4"><T>Website not found</T></h1>
            <button
              onClick={() => router.push('/')}
              className="bg-cyan-600 text-white px-6 py-3 rounded-lg hover:bg-cyan-700 transition-colors"
            >
              <T>Back to Home</T>
            </button>
          </div>
        </div>
      </div>
    )
  }

  const getFrameClasses = () => {
    switch (viewMode) {
      case 'mobile':
        return 'w-full max-w-[320px] h-[640px]'
      case 'tablet':
        return 'w-full max-w-[768px] h-[900px]'
      default:
        return 'w-full h-[600px] sm:h-[700px] md:h-[800px]'
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 relative">
      <StarryBackground />

      <div className="fixed inset-0 pointer-events-none z-0">
        <SplashCursor />
      </div>

      {/* Header with Logo */}
      <Header
        showBackButton={true}
        backButtonText="Back to Portfolio"
        backButtonHref="/"
      />

      <div className="relative z-10 pt-24">
        {/* Hero Section - Project Title */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Eye className="w-10 h-10 text-cyan-400" />
              <h1 className="text-4xl md:text-5xl font-bold text-white">{website.title}</h1>
            </div>
            <div className="flex items-center justify-center space-x-3 mb-4">
              <span className="bg-cyan-500/20 text-cyan-300 text-sm px-4 py-2 rounded-full border border-cyan-400/30 font-semibold">
                {website.category}
              </span>
              {website.featured && (
                <span className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm px-4 py-2 rounded-full font-bold shadow-lg">
                  <T>Featured</T>
                </span>
              )}
            </div>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
              <T>{website.description}</T>
            </p>
          </motion.div>

          {/* Action Bar - Device Toggle & Visit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:space-x-4 mb-8"
          >
            {/* Device Toggle */}
            <div className="flex items-center justify-center space-x-1 bg-slate-800/60 backdrop-blur-sm rounded-xl p-1.5 border border-slate-700/50 shadow-lg">
              <button
                onClick={() => setViewMode('desktop')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 rounded-lg transition-all duration-300 flex-1 sm:flex-initial ${
                  viewMode === 'desktop'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold"><T>Desktop</T></span>
              </button>
              <button
                onClick={() => setViewMode('tablet')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 rounded-lg transition-all duration-300 flex-1 sm:flex-initial ${
                  viewMode === 'tablet'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Tablet className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold"><T>Tablet</T></span>
              </button>
              <button
                onClick={() => setViewMode('mobile')}
                className={`flex items-center justify-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2.5 rounded-lg transition-all duration-300 flex-1 sm:flex-initial ${
                  viewMode === 'mobile'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 shadow-lg'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="text-xs sm:text-sm font-semibold"><T>Mobile</T></span>
              </button>
            </div>

            {/* Visit Site Button */}
            <motion.a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-cyan-700 hover:to-blue-700 transition-all duration-300 border border-cyan-500/30 shadow-xl shadow-cyan-500/20 font-semibold"
            >
              <ExternalLink className="w-5 h-5" />
              <span><T>Visit Live Site</T></span>
            </motion.a>
          </motion.div>
        </div>

        {/* Main Preview Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mb-12"
          >
            {/* Live Preview Frame */}
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-3xl p-6 md:p-8 border border-slate-700/50 shadow-2xl shadow-slate-950/50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="ml-4 text-sm font-semibold text-white"><T>Live Preview</T></span>
                </div>
                <div className="text-sm text-slate-400 hidden md:block">
                  {isHoveringIframe ? <T>Scrolling website content</T> : <T>Hover over preview to scroll website</T>}
                </div>
              </div>

              <div className="flex justify-center">
                <motion.div
                  className={`bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-slate-700/30 ${getFrameClasses()}`}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4 }}
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
          </motion.div>

          {/* Project Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
            {/* Project Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="lg:col-span-2 bg-slate-800/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 shadow-xl shadow-slate-950/50"
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <span><T>About This Project</T></span>
              </h2>
              <p className="text-slate-300 leading-relaxed text-lg">
                <T>This project showcases modern web development practices with a focus on user experience, performance optimization, and responsive design. Built with cutting-edge technologies to deliver exceptional results.</T>
              </p>
            </motion.div>

            {/* Quick Details Card */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 shadow-xl shadow-slate-950/50"
            >
              <h3 className="text-xl font-bold text-white mb-6"><T>Project Details</T></h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                  <span className="text-slate-400 font-medium"><T>Category</T></span>
                  <span className="text-cyan-400 font-semibold">{website.category}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                  <span className="text-slate-400 font-medium"><T>Launch Date</T></span>
                  <span className="text-white font-semibold">{new Date(website.createdAt).toLocaleDateString('en-GB')}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-slate-900/40 rounded-xl border border-slate-700/30">
                  <span className="text-slate-400 font-medium"><T>Status</T></span>
                  <span className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-semibold"><T>Live</T></span>
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Features & Tech Stack */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Key Features */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="bg-slate-800/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 shadow-xl shadow-slate-950/50"
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <span><T>Key Features</T></span>
              </h3>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  </div>
                  <span className="text-slate-200 font-medium"><T>Responsive Design</T></span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  </div>
                  <span className="text-slate-200 font-medium"><T>Performance Optimized</T></span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  </div>
                  <span className="text-slate-200 font-medium"><T>SEO Friendly</T></span>
                </div>
                <div className="flex items-center space-x-4 p-4 bg-slate-900/40 rounded-xl border border-slate-700/30 hover:border-cyan-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center">
                    <div className="w-3 h-3 bg-cyan-400 rounded-full"></div>
                  </div>
                  <span className="text-slate-200 font-medium"><T>Modern UI/UX</T></span>
                </div>
              </div>
            </motion.div>

            {/* Technologies Used */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="bg-slate-800/60 backdrop-blur-sm rounded-3xl p-8 border border-slate-700/50 shadow-xl shadow-slate-950/50"
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center space-x-3">
                <div className="w-1 h-8 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></div>
                <span><T>Technologies Used</T></span>
              </h3>
              <div className="flex flex-wrap gap-3">
                {['React', 'TypeScript', 'Tailwind CSS', 'Framer Motion', 'Next.js'].map((tech) => (
                  <span
                    key={tech}
                    className="bg-gradient-to-br from-slate-700/60 to-slate-800/60 text-slate-200 px-5 py-3 rounded-xl text-sm font-semibold border border-slate-600/50 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
