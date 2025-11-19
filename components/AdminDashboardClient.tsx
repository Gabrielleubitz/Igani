'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Globe, Mail, Settings as SettingsIcon, Star, Package, Info } from 'lucide-react'
import { WebsiteManager } from './WebsiteManager'
import { TicketManager } from './TicketManager'
import TestimonialsManager from './TestimonialsManager'
import { getWebsites, getContactSubmissions, getTestimonials } from '@/lib/firestore'
import { Website, ContactSubmission, Testimonial } from '@/types'

type TabType = 'websites' | 'inquiries' | 'testimonials' | 'packages' | 'about' | 'settings'

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>('websites')
  const [websites, setWebsites] = useState<Website[]>([])
  const [inquiries, setInquiries] = useState<ContactSubmission[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [websitesData, inquiriesData, testimonialsData] = await Promise.all([
        getWebsites(),
        getContactSubmissions(),
        getTestimonials()
      ])
      setWebsites(websitesData)
      setInquiries(inquiriesData)
      setTestimonials(testimonialsData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackToHome = () => {
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">
                Admin Dashboard
              </h1>
              <p className="text-slate-400 text-sm">
                Manage your website content and settings
              </p>
            </div>
            <button
              onClick={handleBackToHome}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-300"
            >
              <LogOut className="w-4 h-4" />
              Back to Home
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('websites')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'websites'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Globe className="w-5 h-5" />
            Websites ({websites.length})
          </button>
          <button
            onClick={() => setActiveTab('inquiries')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'inquiries'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Mail className="w-5 h-5" />
            Customer Inquiries ({inquiries.length})
          </button>
          <button
            onClick={() => setActiveTab('testimonials')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'testimonials'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Star className="w-5 h-5" />
            Testimonials ({testimonials.length})
          </button>
          <button
            onClick={() => setActiveTab('packages')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'packages'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Package className="w-5 h-5" />
            Packages
          </button>
          <button
            onClick={() => setActiveTab('about')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'about'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Info className="w-5 h-5" />
            About Us
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <SettingsIcon className="w-5 h-5" />
            Settings
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'websites' && (
          <WebsiteManager websites={websites} onUpdate={loadData} />
        )}

        {activeTab === 'inquiries' && (
          <TicketManager contacts={inquiries} onUpdate={loadData} />
        )}

        {activeTab === 'testimonials' && (
          <TestimonialsManager />
        )}

        {activeTab === 'packages' && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Packages Management</h2>
              <a
                href="/admin/packages"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
              >
                <Package className="w-4 h-4" />
                Go to Packages Editor
              </a>
            </div>
            <p className="text-slate-400 mb-4">
              Manage your packages, maintenance plans, and FAQs. Click the button above to access the full packages editor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">Packages</h3>
                <p className="text-slate-300 text-sm">Create and manage service packages</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">Maintenance Plans</h3>
                <p className="text-slate-300 text-sm">Manage ongoing maintenance offerings</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">FAQs</h3>
                <p className="text-slate-300 text-sm">Manage frequently asked questions</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">About Us Management</h2>
              <a
                href="/admin/about"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
              >
                <Info className="w-4 h-4" />
                Go to About Us Editor
              </a>
            </div>
            <p className="text-slate-400 mb-4">
              Manage your About Us page content, sections, and settings. Click the button above to access the full About Us editor.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">Page Settings</h3>
                <p className="text-slate-300 text-sm">Configure page title, subtitle, and meta description</p>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600/50">
                <h3 className="text-white font-semibold mb-2">Content Sections</h3>
                <p className="text-slate-300 text-sm">Create and manage mission, values, team, and custom sections</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
            <h2 className="text-xl font-bold text-white mb-4">Site Settings</h2>
            <p className="text-slate-400">Settings management coming soon...</p>
          </div>
        )}
      </div>
    </div>
  )
}
