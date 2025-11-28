'use client'

import { useState, useEffect } from 'react'
import { Save, Loader2, Mail, Phone, MapPin, Instagram, Linkedin, Facebook, Twitter, Github, Globe, AlertCircle } from 'lucide-react'

interface SiteSettings {
  // Contact Information
  businessEmail: string
  businessPhone: string
  businessAddress: string
  whatsappNumber: string

  // Social Media
  linkedinUrl: string
  instagramUrl: string
  facebookUrl: string
  twitterUrl: string
  githubUrl: string

  // SEO
  metaTitle: string
  metaDescription: string
  metaKeywords: string

  // Email Notifications
  adminNotificationEmail: string
  enableLeadNotifications: boolean
  enableInquiryNotifications: boolean

  // Footer
  footerTagline: string
  copyrightText: string
}

const defaultSettings: SiteSettings = {
  businessEmail: '',
  businessPhone: '',
  businessAddress: '',
  whatsappNumber: '',
  linkedinUrl: '',
  instagramUrl: '',
  facebookUrl: '',
  twitterUrl: '',
  githubUrl: '',
  metaTitle: 'IGANI - Web Development & Design',
  metaDescription: 'Professional web development and design services',
  metaKeywords: 'web development, design, websites, digital solutions',
  adminNotificationEmail: '',
  enableLeadNotifications: true,
  enableInquiryNotifications: true,
  footerTagline: 'Building digital experiences that matter',
  copyrightText: '© 2024 IGANI. All rights reserved.'
}

export function SiteSettingsManager() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/site-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings({ ...defaultSettings, ...data })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      setSaveMessage(null)

      const response = await fetch('/api/admin/site-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })

      if (response.ok) {
        setSaveMessage({ type: 'success', text: 'Settings saved successfully!' })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      setSaveMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
    } finally {
      setIsSaving(false)
    }
  }

  const updateSetting = (key: keyof SiteSettings, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Save Button & Message - Fixed at top */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-xl border-b border-slate-700/50 -mx-6 -mt-6 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Site Settings</h2>
          <div className="flex items-center gap-4">
            {saveMessage && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                saveMessage.type === 'success'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{saveMessage.text}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg font-semibold transition-all duration-300 shadow-lg disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save All Settings
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Contact Information</h3>
            <p className="text-slate-400 text-sm">Business contact details displayed on your site</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Business Email
            </label>
            <input
              type="email"
              value={settings.businessEmail}
              onChange={(e) => updateSetting('businessEmail', e.target.value)}
              placeholder="contact@igani.co"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Business Phone
            </label>
            <input
              type="tel"
              value={settings.businessPhone}
              onChange={(e) => updateSetting('businessPhone', e.target.value)}
              placeholder="+1 (555) 123-4567"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={settings.whatsappNumber}
              onChange={(e) => updateSetting('whatsappNumber', e.target.value)}
              placeholder="+1 555 123 4567"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Business Address
            </label>
            <input
              type="text"
              value={settings.businessAddress}
              onChange={(e) => updateSetting('businessAddress', e.target.value)}
              placeholder="123 Main St, City, Country"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Social Media</h3>
            <p className="text-slate-400 text-sm">Your social media profiles and links</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Linkedin className="w-4 h-4 text-blue-400" />
              LinkedIn URL
            </label>
            <input
              type="url"
              value={settings.linkedinUrl}
              onChange={(e) => updateSetting('linkedinUrl', e.target.value)}
              placeholder="https://linkedin.com/company/igani"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Instagram className="w-4 h-4 text-pink-400" />
              Instagram URL
            </label>
            <input
              type="url"
              value={settings.instagramUrl}
              onChange={(e) => updateSetting('instagramUrl', e.target.value)}
              placeholder="https://instagram.com/igani"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Facebook className="w-4 h-4 text-blue-500" />
              Facebook URL
            </label>
            <input
              type="url"
              value={settings.facebookUrl}
              onChange={(e) => updateSetting('facebookUrl', e.target.value)}
              placeholder="https://facebook.com/igani"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Twitter className="w-4 h-4 text-sky-400" />
              Twitter/X URL
            </label>
            <input
              type="url"
              value={settings.twitterUrl}
              onChange={(e) => updateSetting('twitterUrl', e.target.value)}
              placeholder="https://twitter.com/igani"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-300 mb-2">
              <Github className="w-4 h-4 text-slate-300" />
              GitHub URL
            </label>
            <input
              type="url"
              value={settings.githubUrl}
              onChange={(e) => updateSetting('githubUrl', e.target.value)}
              placeholder="https://github.com/igani"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* SEO Settings */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">SEO & Meta Tags</h3>
            <p className="text-slate-400 text-sm">Default metadata for search engines and social sharing</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Default Meta Title
            </label>
            <input
              type="text"
              value={settings.metaTitle}
              onChange={(e) => updateSetting('metaTitle', e.target.value)}
              placeholder="IGANI - Web Development & Design"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
            <p className="text-slate-500 text-xs mt-1">Recommended: 50-60 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Default Meta Description
            </label>
            <textarea
              value={settings.metaDescription}
              onChange={(e) => updateSetting('metaDescription', e.target.value)}
              rows={3}
              placeholder="Professional web development and design services..."
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none"
            />
            <p className="text-slate-500 text-xs mt-1">Recommended: 150-160 characters</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Meta Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={settings.metaKeywords}
              onChange={(e) => updateSetting('metaKeywords', e.target.value)}
              placeholder="web development, design, websites, digital solutions"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {/* Email Notifications */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Email Notifications</h3>
            <p className="text-slate-400 text-sm">Configure how you receive notifications</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Admin Notification Email
            </label>
            <input
              type="email"
              value={settings.adminNotificationEmail}
              onChange={(e) => updateSetting('adminNotificationEmail', e.target.value)}
              placeholder="admin@igani.co"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
            <p className="text-slate-500 text-xs mt-1">Where to send notifications about new leads and inquiries</p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-900/60 rounded-lg border border-slate-600">
            <input
              type="checkbox"
              id="enableLeadNotifications"
              checked={settings.enableLeadNotifications}
              onChange={(e) => updateSetting('enableLeadNotifications', e.target.checked)}
              className="w-5 h-5 text-cyan-600 bg-slate-900/60 border-slate-600 rounded focus:ring-cyan-500"
            />
            <label htmlFor="enableLeadNotifications" className="text-white font-medium flex-1">
              Send email notifications for new leads
            </label>
          </div>

          <div className="flex items-center gap-3 p-4 bg-slate-900/60 rounded-lg border border-slate-600">
            <input
              type="checkbox"
              id="enableInquiryNotifications"
              checked={settings.enableInquiryNotifications}
              onChange={(e) => updateSetting('enableInquiryNotifications', e.target.checked)}
              className="w-5 h-5 text-cyan-600 bg-slate-900/60 border-slate-600 rounded focus:ring-cyan-500"
            />
            <label htmlFor="enableInquiryNotifications" className="text-white font-medium flex-1">
              Send email notifications for new inquiries
            </label>
          </div>
        </div>
      </div>

      {/* Footer Content */}
      <div className="bg-slate-800/60 rounded-2xl border border-slate-700/50 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Footer Content</h3>
            <p className="text-slate-400 text-sm">Customize your website footer</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Footer Tagline
            </label>
            <input
              type="text"
              value={settings.footerTagline}
              onChange={(e) => updateSetting('footerTagline', e.target.value)}
              placeholder="Building digital experiences that matter"
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Copyright Text
            </label>
            <input
              type="text"
              value={settings.copyrightText}
              onChange={(e) => updateSetting('copyrightText', e.target.value)}
              placeholder="© 2024 IGANI. All rights reserved."
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
