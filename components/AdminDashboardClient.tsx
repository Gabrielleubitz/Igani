'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, Globe, Mail, Settings as SettingsIcon } from 'lucide-react'
import { WebsiteManager } from './WebsiteManager'
import { getWebsites, getContactSubmissions } from '@/lib/firestore'
import { Website, ContactSubmission } from '@/types'

type TabType = 'websites' | 'contacts' | 'settings'

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<TabType>('websites')
  const [websites, setWebsites] = useState<Website[]>([])
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [websitesData, contactsData] = await Promise.all([
        getWebsites(),
        getContactSubmissions()
      ])
      setWebsites(websitesData)
      setContacts(contactsData)
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
            onClick={() => setActiveTab('contacts')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'contacts'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Mail className="w-5 h-5" />
            Contact Submissions ({contacts.length})
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

        {activeTab === 'contacts' && (
          <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-8">
            <h2 className="text-xl font-bold text-white mb-6">Contact Submissions</h2>
            {contacts.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No contact submissions yet.</p>
            ) : (
              <div className="space-y-4">
                {contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {contact.firstName} {contact.lastName}
                        </h3>
                        <p className="text-cyan-400 text-sm">{contact.email}</p>
                      </div>
                      <span className="text-xs text-slate-400">
                        {new Date(contact.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm text-slate-400">Project Type: </span>
                      <span className="text-sm text-white">{contact.projectType}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{contact.message}</p>
                  </div>
                ))}
              </div>
            )}
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
