'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X } from 'lucide-react'
import { PromoBannerSettings } from '@/types'
import { getPromoBannerSettings, savePromoBannerSettings } from '@/lib/firestore'

export function BannerManager() {
  const [settings, setSettings] = useState<PromoBannerSettings>({
    enabled: false,
    text: '',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    ctaLabel: '',
    ctaUrl: '',
    animationType: 'none',
    animationSpeed: 'normal',
    startDate: '',
    endDate: '',
    dismissible: true
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const bannerSettings = await getPromoBannerSettings()
      if (bannerSettings) {
        setSettings(bannerSettings)
      }
    } catch (error) {
      console.error('Error loading banner settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setSaveStatus('idle')

    try {
      await savePromoBannerSettings(settings)
      setSaveStatus('success')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } catch (error) {
      console.error('Error saving banner settings:', error)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 3000)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading banner settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Promo Banner Settings</h2>
          <p className="text-slate-400">
            Configure a promotional banner to display at the top of all pages
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-cyan-500/25"
        >
          <Save className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saveStatus === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-green-600/20 border border-green-500/50 text-green-400 p-4 rounded-lg font-medium"
        >
          Banner settings saved successfully!
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-600/20 border border-red-500/50 text-red-400 p-4 rounded-lg font-medium"
        >
          Failed to save banner settings. Please try again.
        </motion.div>
      )}

      <div className="grid gap-6">
        {/* Enable/Disable Banner */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Enable Banner</h3>
              <p className="text-slate-400 text-sm">Show the promo banner on all pages</p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-600 peer-checked:to-blue-600"></div>
            </div>
          </label>
        </div>

        {/* Banner Text */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <label className="block">
            <h3 className="text-lg font-semibold text-white mb-2">Banner Text</h3>
            <textarea
              value={settings.text}
              onChange={(e) => setSettings({ ...settings, text: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 resize-none transition-all duration-300"
              placeholder="Enter your promotional message..."
            />
          </label>
        </div>

        {/* Colors */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <label className="block">
              <h3 className="text-lg font-semibold text-white mb-2">Background Color</h3>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                  className="w-16 h-12 rounded-lg cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={settings.backgroundColor}
                  onChange={(e) => setSettings({ ...settings, backgroundColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                  placeholder="#000000"
                />
              </div>
            </label>
          </div>

          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <label className="block">
              <h3 className="text-lg font-semibold text-white mb-2">Text Color</h3>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.textColor}
                  onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                  className="w-16 h-12 rounded-lg cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={settings.textColor}
                  onChange={(e) => setSettings({ ...settings, textColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                  placeholder="#ffffff"
                />
              </div>
            </label>
          </div>
        </div>

        {/* CTA Button */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Call-to-Action Button (Optional)</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Button Label</label>
              <input
                type="text"
                value={settings.ctaLabel || ''}
                onChange={(e) => setSettings({ ...settings, ctaLabel: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                placeholder="Shop Now"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Button URL</label>
              <input
                type="url"
                value={settings.ctaUrl || ''}
                onChange={(e) => setSettings({ ...settings, ctaUrl: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                placeholder="https://example.com"
              />
            </div>
          </div>
        </div>

        {/* Animation Settings */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Animation Settings</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Animation Type</label>
              <select
                value={settings.animationType}
                onChange={(e) => setSettings({ ...settings, animationType: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="none">None</option>
                <option value="slide">Slide Down</option>
                <option value="fade">Fade In</option>
                <option value="marquee">Marquee (Scrolling)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Animation Speed</label>
              <select
                value={settings.animationSpeed}
                onChange={(e) => setSettings({ ...settings, animationSpeed: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="slow">Slow</option>
                <option value="normal">Normal</option>
                <option value="fast">Fast</option>
              </select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Schedule (Optional)</h3>
          <p className="text-slate-400 text-sm mb-4">
            Leave empty to show banner indefinitely
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Start Date & Time</label>
              <input
                type="datetime-local"
                value={settings.startDate || ''}
                onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">End Date & Time</label>
              <input
                type="datetime-local"
                value={settings.endDate || ''}
                onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              />
            </div>
          </div>
        </div>

        {/* Dismissible */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Allow Users to Dismiss</h3>
              <p className="text-slate-400 text-sm">
                Users can close the banner with an X button (dismissal is remembered)
              </p>
            </div>
            <div className="relative">
              <input
                type="checkbox"
                checked={settings.dismissible}
                onChange={(e) => setSettings({ ...settings, dismissible: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-14 h-8 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-cyan-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-cyan-600 peer-checked:to-blue-600"></div>
            </div>
          </label>
        </div>

        {/* Preview */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor
              }}
              className="p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium flex-1">{settings.text || 'Your banner text will appear here...'}</p>
                {settings.ctaLabel && (
                  <span className="px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold">
                    {settings.ctaLabel}
                  </span>
                )}
                {settings.dismissible && (
                  <button className="p-1.5 hover:bg-white/10 rounded-full">
                    <X className="w-4 h-4" style={{ color: settings.textColor }} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
