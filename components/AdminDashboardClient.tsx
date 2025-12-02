'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Globe, Mail, Settings as SettingsIcon, Star, Package, Info, Megaphone, Users, Clock, Home, BarChart3, Receipt } from 'lucide-react'
import { WebsiteManager } from './WebsiteManager'
import { TicketManager } from './TicketManager'
import TestimonialsManager from './TestimonialsManager'
import { BannerManager } from './BannerManager'
import { LeadsManager } from './LeadsManager'
import { OfferSettingsManager } from './OfferSettingsManager'
import { SiteSettingsManager } from './SiteSettingsManager'
import { FinancialReportsManager } from './FinancialReportsManager'
import { PackagesManager } from './PackagesManager'
import { getWebsites, getContactSubmissions, getTestimonials } from '@/lib/firestore'
import { Website, ContactSubmission, Testimonial } from '@/types'
import { LoadingScreen } from './ui/loading-screen'

type TabType = 'websites' | 'inquiries' | 'testimonials' | 'packages' | 'about' | 'settings' | 'banner' | 'leads' | 'offers' | 'financial'

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>('websites')
  const [websites, setWebsites] = useState<Website[]>([])
  const [inquiries, setInquiries] = useState<ContactSubmission[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
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

  const navigationItems = [
    { id: 'websites', label: 'Websites', icon: Globe, count: websites.length, color: 'cyan' },
    { id: 'inquiries', label: 'Inquiries', icon: Mail, count: inquiries.length, color: 'blue' },
    { id: 'leads', label: 'Leads', icon: Users, color: 'purple' },
    { id: 'financial', label: 'Financial Reports', icon: Receipt, color: 'emerald' },
    { id: 'testimonials', label: 'Testimonials', icon: Star, count: testimonials.length, color: 'yellow' },
    { id: 'packages', label: 'Packages', icon: Package, color: 'green' },
    { id: 'about', label: 'About Us', icon: Info, color: 'indigo' },
    { id: 'banner', label: 'Promo Banner', icon: Megaphone, color: 'pink' },
    { id: 'offers', label: 'Offer Timer', icon: Clock, color: 'orange' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, color: 'slate' },
  ]

  const getPageTitle = () => {
    const item = navigationItems.find(item => item.id === activeTab)
    return item?.label || 'Dashboard'
  }

  const getPageIcon = () => {
    const item = navigationItems.find(item => item.id === activeTab)
    const Icon = item?.icon || BarChart3
    return Icon
  }

  if (isLoading) {
    return <LoadingScreen message="Loading admin panel..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Top Header */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 z-30">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="relative w-10 h-10 flex items-center justify-center rounded-lg hover:bg-slate-800/50 transition-all group"
              aria-label="Toggle menu"
            >
              <div className="w-6 h-5 relative flex flex-col justify-between">
                <span
                  className={`block h-0.5 w-full bg-slate-300 rounded transition-all duration-300 group-hover:bg-cyan-400 ${
                    sidebarOpen ? 'rotate-45 translate-y-2' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 w-full bg-slate-300 rounded transition-all duration-300 group-hover:bg-cyan-400 ${
                    sidebarOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`block h-0.5 w-full bg-slate-300 rounded transition-all duration-300 group-hover:bg-cyan-400 ${
                    sidebarOpen ? '-rotate-45 -translate-y-2' : ''
                  }`}
                />
              </div>
            </button>
            <div>
              <h1 className="text-lg font-bold text-white">IGANI Admin</h1>
            </div>
          </div>
          <button
            onClick={handleBackToHome}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-all duration-300 hover:scale-105"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Home</span>
          </button>
        </div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed top-16 left-0 bottom-0 w-64 bg-slate-900/95 backdrop-blur-xl border-r border-slate-700/50 transition-transform duration-300 z-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full overflow-y-auto p-4">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as TabType)
                    // Close sidebar on mobile after selection
                    if (window.innerWidth < 1024) {
                      setSidebarOpen(false)
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    isActive
                      ? `bg-gradient-to-r from-${item.color}-600 to-${item.color}-500 text-white shadow-lg shadow-${item.color}-500/25`
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.count !== undefined && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white/20' : 'bg-slate-800'
                    }`}>
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-10 lg:hidden top-16"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div
        className={`pt-16 transition-all duration-300 ${
          sidebarOpen ? 'lg:pl-64' : 'pl-0'
        }`}
      >
        <div className="p-6 lg:p-8">
          {/* Page Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              {(() => {
                const PageIcon = getPageIcon()
                return <PageIcon className="w-8 h-8 text-cyan-400" />
              })()}
              <h2 className="text-3xl font-bold text-white">{getPageTitle()}</h2>
            </div>
            <p className="text-slate-400">
              Manage your {getPageTitle().toLowerCase()} and content
            </p>
          </div>

          {/* Content Area */}
          <div className="max-w-7xl">
            {activeTab === 'websites' && (
              <div className="animate-in fade-in duration-300">
                <WebsiteManager
                  websites={websites}
                  onUpdate={loadData}
                />
              </div>
            )}

            {activeTab === 'inquiries' && (
              <div className="animate-in fade-in duration-300">
                <TicketManager
                  contacts={inquiries}
                  onUpdate={loadData}
                />
              </div>
            )}

            {activeTab === 'testimonials' && (
              <div className="animate-in fade-in duration-300">
                <TestimonialsManager />
              </div>
            )}

            {activeTab === 'packages' && (
              <div className="animate-in fade-in duration-300">
                <PackagesManager />
              </div>
            )}

            {activeTab === 'about' && (
              <div className="animate-in fade-in duration-300">
                <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
                  <p className="text-slate-300 text-center py-8">
                    About Us management coming soon. For now, use{' '}
                    <a
                      href="/admin/about"
                      target="_blank"
                      className="text-cyan-400 hover:text-cyan-300 underline"
                    >
                      /admin/about
                    </a>
                    {' '}in a new tab.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="animate-in fade-in duration-300">
                <SiteSettingsManager />
              </div>
            )}

            {activeTab === 'banner' && (
              <div className="animate-in fade-in duration-300">
                <BannerManager />
              </div>
            )}

            {activeTab === 'leads' && (
              <div className="animate-in fade-in duration-300">
                <LeadsManager />
              </div>
            )}

            {activeTab === 'offers' && (
              <div className="animate-in fade-in duration-300">
                <OfferSettingsManager />
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="animate-in fade-in duration-300">
                <FinancialReportsManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
