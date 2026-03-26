'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Globe, Mail, Settings as SettingsIcon, Star, Package, Info, Megaphone, Users, Clock, Home, BarChart3, Receipt, HelpCircle, Zap, Key } from 'lucide-react'
import { WebsiteManager } from './WebsiteManager'
import { TicketManager } from './TicketManager'
import TestimonialsManager from './TestimonialsManager'
import { BannerManager } from './BannerManager'
import { LeadsManager } from './LeadsManager'
import { OfferSettingsManager } from './OfferSettingsManager'
import { SiteSettingsManager } from './SiteSettingsManager'
import { FinancialReportsManager } from './FinancialReportsManager'
import { PackagesManager } from './PackagesManager'
import { ApiKeysManager } from './ApiKeysManager'
import { SupportInquiriesManager } from './SupportInquiriesManager'
import { AboutUsManager } from './AboutUsManager'
import { AnalyticsManager } from './AnalyticsManager'
import { getWebsites, getContactSubmissions, getTestimonials, getSupportInquiries } from '@/lib/firestore'
import { Website, ContactSubmission, Testimonial, SupportInquiry } from '@/types'
import { LoadingScreen } from './ui/loading-screen'

type TabType = 'websites' | 'inquiries' | 'support' | 'testimonials' | 'packages' | 'about' | 'settings' | 'banner' | 'leads' | 'offers' | 'financial' | 'analytics' | 'api' | 'apikeys'

const VALID_TABS: TabType[] = ['websites', 'inquiries', 'support', 'leads', 'financial', 'analytics', 'testimonials', 'packages', 'about', 'banner', 'offers', 'api', 'apikeys', 'settings']

const API_TESTS = [
  { id: 'health', label: 'Health check', method: 'GET', path: '/api/health' },
  { id: 'leads', label: 'Leads (list)', method: 'GET', path: '/api/leads' },
] as const

const MAILJET_TEST_PATH = '/api/admin/test-email'

function TestApiSection() {
  const [loading, setLoading] = useState<string | null>(null)
  const [result, setResult] = useState<{ status: number; body: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTest = async (path: string, method: string) => {
    setLoading(path)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(path, { method })
      const text = await res.text()
      let body = text
      try {
        body = JSON.stringify(JSON.parse(text), null, 2)
      } catch {
        // keep raw text
      }
      setResult({ status: res.status, body })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Quick API tests</h3>
        <p className="text-slate-400 text-sm mb-4">
          Run read-only checks against your API routes. Responses appear below.
        </p>
        <div className="flex flex-wrap gap-3">
          {API_TESTS.map((test) => (
            <button
              key={test.id}
              type="button"
              onClick={() => runTest(test.path, test.method)}
              disabled={!!loading}
              className="px-4 py-2.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
            >
              {loading === test.path ? '…' : `${test.method} ${test.path}`}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Mailjet</h3>
        <p className="text-slate-400 text-sm mb-4">
          Send a test email to the admin address to verify Mailjet is configured.
        </p>
        <button
          type="button"
          onClick={() => runTest(MAILJET_TEST_PATH, 'POST')}
          disabled={!!loading}
          className="px-4 py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm"
        >
          {loading === MAILJET_TEST_PATH ? 'Sending…' : 'POST /api/admin/test-email (send test email)'}
        </button>
      </div>
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {error}
        </div>
      )}
      {result && (
        <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-slate-400 text-sm">Status:</span>
            <span className={`font-mono text-sm font-semibold ${result.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>
              {result.status}
            </span>
          </div>
          <pre className="p-4 rounded-lg bg-slate-900/80 border border-slate-600 text-slate-300 text-xs overflow-x-auto max-h-96 overflow-y-auto">
            {result.body}
          </pre>
        </div>
      )}
    </div>
  )
}

export default function AdminDashboardClient() {
  const searchParams = useSearchParams()
  const tabFromUrl = useMemo(() => {
    const t = searchParams.get('tab')
    return (t && VALID_TABS.includes(t as TabType)) ? t as TabType : null
  }, [searchParams])
  const [activeTab, setActiveTab] = useState<TabType>(tabFromUrl ?? 'websites')
  const [websites, setWebsites] = useState<Website[]>([])
  const [inquiries, setInquiries] = useState<ContactSubmission[]>([])
  const [supportInquiries, setSupportInquiries] = useState<SupportInquiry[]>([])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (tabFromUrl) setActiveTab(tabFromUrl)
  }, [tabFromUrl])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [websitesData, inquiriesData, testimonialsData, supportData] = await Promise.all([
        getWebsites(),
        getContactSubmissions(),
        getTestimonials(),
        getSupportInquiries()
      ])
      setWebsites(websitesData)
      setInquiries(inquiriesData)
      setTestimonials(testimonialsData)
      setSupportInquiries(supportData)
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
    { id: 'support', label: 'Help & Support', icon: HelpCircle, count: supportInquiries.length, color: 'amber' },
    { id: 'leads', label: 'Leads', icon: Users, color: 'purple' },
    { id: 'financial', label: 'Financial Reports', icon: Receipt, color: 'emerald' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, color: 'teal' },
    { id: 'testimonials', label: 'Testimonials', icon: Star, count: testimonials.length, color: 'yellow' },
    { id: 'packages', label: 'Packages', icon: Package, color: 'green' },
    { id: 'about', label: 'About Us', icon: Info, color: 'indigo' },
    { id: 'banner', label: 'Promo Banner', icon: Megaphone, color: 'pink' },
    { id: 'offers', label: 'Offer Timer', icon: Clock, color: 'orange' },
    { id: 'api', label: 'Test API', icon: Zap, color: 'violet' },
    { id: 'apikeys', label: 'API Keys', icon: Key, color: 'violet' },
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

            {activeTab === 'support' && (
              <div className="animate-in fade-in duration-300">
                <SupportInquiriesManager
                  inquiries={supportInquiries}
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
                <AboutUsManager />
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

            {activeTab === 'api' && (
              <div className="animate-in fade-in duration-300">
                <TestApiSection />
              </div>
            )}

            {activeTab === 'apikeys' && (
              <div className="animate-in fade-in duration-300">
                <ApiKeysManager />
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="animate-in fade-in duration-300">
                <FinancialReportsManager />
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="animate-in fade-in duration-300">
                <AnalyticsManager />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
