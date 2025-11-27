'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Eye } from 'lucide-react'
import { PromoBannerSettings } from '@/types'
import { getPromoBannerSettings, savePromoBannerSettings } from '@/lib/firestore'

export function BannerManager() {
  const [settings, setSettings] = useState<PromoBannerSettings>({
    enabled: false,
    title: '',
    subtitle: '',
    ctaLabel: '',
    ctaUrl: '',
    image: '',
    imagePosition: 'right',
    backgroundColor: '#000000',
    textColor: '#ffffff',
    fontSize: 'medium',
    fontWeight: 'regular',
    textAlign: 'center',
    padding: 'normal',
    height: 'auto',
    animationType: 'none',
    animationSpeed: 'normal',
    dismissible: true,
    startDate: '',
    endDate: ''
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

  const openPreview = () => {
    window.open('/?previewBanner=true', '_blank')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Promo Banner</h2>
          <p className="text-slate-400">
            Configure your promotional banner for campaigns
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openPreview}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-all duration-300"
          >
            <Eye className="w-5 h-5" />
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-all duration-300 shadow-lg shadow-cyan-500/25"
          >
            <Save className="w-5 h-5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Save Status */}
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
        {/* Enable Banner */}
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

        {/* Content */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Content</h3>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Title *</label>
            <input
              type="text"
              value={settings.title}
              onChange={(e) => setSettings({ ...settings, title: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
              placeholder="🎉 Black Friday Sale - 50% OFF!"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Subtitle (optional)</label>
            <input
              type="text"
              value={settings.subtitle || ''}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
              placeholder="Limited time only - ends Sunday"
            />
          </div>
        </div>

        {/* CTA Button */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Call-to-Action (Optional)</h3>

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
                placeholder="https://example.com/sale"
              />
            </div>
          </div>
        </div>

        {/* Image */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Image (Optional)</h3>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Image URL</label>
            <input
              type="url"
              value={settings.image || ''}
              onChange={(e) => setSettings({ ...settings, image: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
              placeholder="https://example.com/image.png"
            />
            <p className="text-slate-500 text-xs mt-1">Recommended: 48x48px</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Image Position</label>
            <select
              value={settings.imagePosition || 'right'}
              onChange={(e) => setSettings({ ...settings, imagePosition: e.target.value as 'inline' | 'right' })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
            >
              <option value="inline">Inline (left of text)</option>
              <option value="right">Right-aligned</option>
            </select>
          </div>
        </div>

        {/* Colors */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Colors</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Background Color</label>
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
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Text Color</label>
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
            </div>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Typography</h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Font Size</label>
              <select
                value={settings.fontSize}
                onChange={(e) => setSettings({ ...settings, fontSize: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Font Weight</label>
              <select
                value={settings.fontWeight}
                onChange={(e) => setSettings({ ...settings, fontWeight: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="regular">Regular</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Text Align</label>
              <select
                value={settings.textAlign}
                onChange={(e) => setSettings({ ...settings, textAlign: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
              </select>
            </div>
          </div>
        </div>

        {/* Layout */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Layout</h3>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Padding</label>
              <select
                value={settings.padding}
                onChange={(e) => setSettings({ ...settings, padding: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="compact">Compact</option>
                <option value="normal">Normal</option>
                <option value="spacious">Spacious</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Height</label>
              <select
                value={settings.height}
                onChange={(e) => setSettings({ ...settings, height: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="auto">Auto</option>
                <option value="fixed">Fixed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Animation */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Animation</h3>
          <p className="text-slate-400 text-sm">Animations will be disabled for users who prefer reduced motion</p>

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
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white">Schedule (Optional)</h3>
          <p className="text-slate-400 text-sm">Leave empty to show banner indefinitely</p>

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

        {/* Behavior */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Allow Users to Dismiss</h3>
              <p className="text-slate-400 text-sm">
                Users can close the banner with an X button (remembered per browser)
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
          <h3 className="text-lg font-semibold text-white mb-4">Live Preview</h3>
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div
              style={{
                backgroundColor: settings.backgroundColor,
                color: settings.textColor
              }}
              className={`px-4 ${settings.padding === 'compact' ? 'py-2' : settings.padding === 'spacious' ? 'py-6' : 'py-4'}`}
            >
              <div className="flex items-center justify-center gap-4 max-w-4xl mx-auto">
                {/* Image - Inline */}
                {settings.image && settings.imagePosition === 'inline' && (
                  <div className="flex-shrink-0">
                    <img
                      src={settings.image}
                      alt=""
                      className="h-10 w-10 object-contain rounded"
                    />
                  </div>
                )}

                <div className={`flex-1 ${settings.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
                  <div className="space-y-1">
                    <h3 className={`${settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'} ${settings.fontWeight === 'bold' ? 'font-bold' : 'font-medium'} leading-tight`}>
                      {settings.title || 'Your banner title will appear here...'}
                    </h3>
                    {settings.subtitle && (
                      <p className="text-sm opacity-90">{settings.subtitle}</p>
                    )}
                  </div>
                </div>

                {/* Image - Right */}
                {settings.image && settings.imagePosition === 'right' && (
                  <div className="flex-shrink-0">
                    <img
                      src={settings.image}
                      alt=""
                      className="h-10 w-10 object-contain rounded"
                    />
                  </div>
                )}

                {settings.ctaLabel && (
                  <span className="px-4 py-2 bg-white/20 rounded-lg text-sm font-semibold whitespace-nowrap border border-white/30 shadow-lg">
                    {settings.ctaLabel}
                  </span>
                )}
                {settings.dismissible && (
                  <button className="p-2 hover:bg-white/10 rounded-full flex-shrink-0">
                    <X className="w-4 h-4" style={{ color: settings.textColor }} />
                  </button>
                )}
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            💡 Tip: Click "Preview" button to see the banner on your actual site with <code className="bg-slate-700 px-1 rounded">?previewBanner=true</code>
          </p>
        </div>
      </div>
    </div>
  )
}
