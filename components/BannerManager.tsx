'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, X, Eye, Sparkles } from 'lucide-react'
import { PromoBannerSettings } from '@/types'
import { getPromoBannerSettings, savePromoBannerSettings } from '@/lib/firestore'

// Gradient presets
const GRADIENT_PRESETS = [
  { name: 'None', value: '' },
  { name: 'Vercel Dark', value: 'linear-gradient(to right, #000000, #1a1a1a)' },
  { name: 'Linear Purple', value: 'linear-gradient(to right, #5B21B6, #7C3AED)' },
  { name: 'Cyan Glow', value: 'linear-gradient(to right, #0891B2, #06B6D4)' },
  { name: 'Fire', value: 'linear-gradient(to right, #DC2626, #F59E0B)' },
  { name: 'Ocean', value: 'linear-gradient(to right, #1E40AF, #06B6D4)' },
  { name: 'Sunset', value: 'linear-gradient(to right, #F97316, #EC4899)' },
  { name: 'Forest', value: 'linear-gradient(to right, #047857, #10B981)' }
]

export function BannerManager() {
  const [settings, setSettings] = useState<PromoBannerSettings>({
    enabled: false,
    title: '',
    subtitle: '',
    accentWord: '',
    ctaLabel: '',
    ctaUrl: '',
    ctaStyle: 'pill',
    ctaColor: '',
    image: '',
    imagePosition: 'right',
    backgroundColor: '#000000',
    backgroundGradient: '',
    textColor: '#ffffff',
    accentColor: '#06B6D4',
    fontSize: 'medium',
    fontWeight: '600',
    textAlign: 'center',
    glowEffect: false,
    textGlow: false,
    animationType: 'fade',
    animationSpeed: 'medium',
    marqueeDirection: 'left',
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

  // Highlight accent word in preview
  const renderPreviewTitle = (text: string) => {
    if (!settings.accentWord || !settings.accentColor) {
      return text
    }

    const parts = text.split(new RegExp(`(${settings.accentWord})`, 'gi'))
    return parts.map((part, index) => {
      if (part.toLowerCase() === settings.accentWord?.toLowerCase()) {
        return (
          <span
            key={index}
            style={{ color: settings.accentColor }}
            className={settings.textGlow ? 'drop-shadow-[0_0_8px_currentColor]' : ''}
          >
            {part}
          </span>
        )
      }
      return part
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading banner settings...</div>
      </div>
    )
  }

  const backgroundStyle = settings.backgroundGradient
    ? { background: settings.backgroundGradient }
    : { backgroundColor: settings.backgroundColor }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">Premium Promo Banner</h2>
          </div>
          <p className="text-slate-400">
            Create exciting, high-converting promotional banners
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
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            📝 Content
          </h3>

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
            <label className="block text-sm font-semibold text-slate-300 mb-2">Subtitle (Optional)</label>
            <input
              type="text"
              value={settings.subtitle || ''}
              onChange={(e) => setSettings({ ...settings, subtitle: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
              placeholder="Limited time offer - Shop now!"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Accent Word (to highlight)</label>
              <input
                type="text"
                value={settings.accentWord || ''}
                onChange={(e) => setSettings({ ...settings, accentWord: e.target.value })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 transition-all duration-300"
                placeholder="e.g., 'Sale' or '50%'"
              />
              <p className="text-slate-500 text-xs mt-1">
                Highlights a specific word in your title with a different color. Example: if title is "Black Friday Sale - 50% OFF", set accent word to "50%" to make it stand out.
              </p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Accent Color</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.accentColor || '#06B6D4'}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="w-16 h-12 rounded-lg cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={settings.accentColor || '#06B6D4'}
                  onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                  placeholder="#06B6D4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Visual Style */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🎨 Visual Style (Premium)
          </h3>

          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">Background Gradient</label>
            <select
              value={settings.backgroundGradient || ''}
              onChange={(e) => setSettings({ ...settings, backgroundGradient: e.target.value })}
              className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
            >
              {GRADIENT_PRESETS.map(preset => (
                <option key={preset.name} value={preset.value}>{preset.name}</option>
              ))}
            </select>
            <p className="text-slate-500 text-xs mt-1">Modern gradients like Vercel/Linear</p>
          </div>

          {!settings.backgroundGradient && (
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
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between cursor-pointer bg-slate-900/40 p-4 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all">
              <div>
                <h4 className="text-white font-semibold">✨ Glow Effect</h4>
                <p className="text-slate-400 text-xs">Soft shadow behind banner</p>
              </div>
              <input
                type="checkbox"
                checked={settings.glowEffect || false}
                onChange={(e) => setSettings({ ...settings, glowEffect: e.target.checked })}
                className="w-5 h-5 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer bg-slate-900/40 p-4 rounded-lg border border-slate-700 hover:border-cyan-500/50 transition-all">
              <div>
                <h4 className="text-white font-semibold">💫 Text Glow</h4>
                <p className="text-slate-400 text-xs">Highlight effect on accent word</p>
              </div>
              <input
                type="checkbox"
                checked={settings.textGlow || false}
                onChange={(e) => setSettings({ ...settings, textGlow: e.target.checked })}
                className="w-5 h-5 text-cyan-600 bg-slate-700 border-slate-600 rounded focus:ring-cyan-500"
              />
            </label>
          </div>
        </div>

        {/* Typography */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🔤 Typography (Impactful)
          </h3>

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
                <option value="large">Large (Bold & Attention-grabbing)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Font Weight</label>
              <select
                value={settings.fontWeight}
                onChange={(e) => setSettings({ ...settings, fontWeight: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="400">400 (Normal)</option>
                <option value="500">500 (Medium)</option>
                <option value="600">600 (Semibold)</option>
                <option value="700">700 (Bold)</option>
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

        {/* Animation */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            ⚡ Animation (Smooth & Engaging)
          </h3>
          <p className="text-slate-400 text-sm">Animations disabled for users who prefer reduced motion</p>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Animation Type</label>
              <select
                value={settings.animationType}
                onChange={(e) => setSettings({ ...settings, animationType: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="none">None</option>
                <option value="fade">Fade In</option>
                <option value="slide">Slide Down</option>
                <option value="marquee">Marquee (Scrolling)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Speed</label>
              <select
                value={settings.animationSpeed}
                onChange={(e) => setSettings({ ...settings, animationSpeed: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="slow">Slow</option>
                <option value="medium">Medium</option>
                <option value="fast">Fast</option>
              </select>
            </div>

            {settings.animationType === 'marquee' && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Direction</label>
                <select
                  value={settings.marqueeDirection || 'left'}
                  onChange={(e) => setSettings({ ...settings, marqueeDirection: e.target.value as any })}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                >
                  <option value="left">← Left</option>
                  <option value="right">Right →</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* CTA Button */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            🎯 Call-to-Action (Optional)
          </h3>

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

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Button Style</label>
              <select
                value={settings.ctaStyle || 'pill'}
                onChange={(e) => setSettings({ ...settings, ctaStyle: e.target.value as any })}
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
              >
                <option value="pill">Pill (Rounded)</option>
                <option value="default">Default (Rounded corners)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">Button Color (optional)</label>
              <div className="flex gap-3">
                <input
                  type="color"
                  value={settings.ctaColor || '#ffffff26'}
                  onChange={(e) => setSettings({ ...settings, ctaColor: e.target.value })}
                  className="w-16 h-12 rounded-lg cursor-pointer border border-slate-600"
                />
                <input
                  type="text"
                  value={settings.ctaColor || ''}
                  onChange={(e) => setSettings({ ...settings, ctaColor: e.target.value })}
                  className="flex-1 px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-300"
                  placeholder="Leave empty for default"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            📅 Schedule (Optional)
          </h3>
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

        {/* Live Preview */}
        <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            👁️ Live Preview
          </h3>
          <div className="border border-slate-600 rounded-lg overflow-hidden">
            <div
              style={backgroundStyle}
              className={`${settings.subtitle && settings.animationType !== 'marquee' ? 'min-h-[72px]' : 'min-h-[52px]'} py-3 px-4 sm:px-6 flex items-center ${
                settings.glowEffect ? 'shadow-[0_4px_20px_-2px_rgba(0,0,0,0.3)]' : 'shadow-md'
              } ${settings.ctaUrl ? 'cursor-pointer hover:opacity-95 transition-opacity' : ''}`}
            >
              <div className="flex items-center w-full gap-3">
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  {settings.image && settings.imagePosition === 'inline' && settings.animationType !== 'marquee' && (
                    <div className="flex-shrink-0 hidden sm:block">
                      <img src={settings.image} alt="" className="h-6 w-6 sm:h-7 sm:w-7 object-contain opacity-90" />
                    </div>
                  )}
                  <div className={`flex-1 min-w-0 ${settings.textAlign === 'center' ? 'text-center' : 'text-left'}`}>
                    {settings.animationType === 'marquee' ? (
                      <span
                        style={{ color: settings.textColor }}
                        className={`${
                          settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base'
                        } font-${
                          settings.fontWeight === '400' ? 'normal' : settings.fontWeight === '500' ? 'medium' : settings.fontWeight === '600' ? 'semibold' : 'bold'
                        }`}
                      >
                        {renderPreviewTitle(settings.title || 'Your banner title...')}
                      </span>
                    ) : (
                      <>
                        <p
                          style={{ color: settings.textColor }}
                          className={`${
                            settings.fontSize === 'small' ? 'text-sm sm:text-base' : settings.fontSize === 'large' ? 'text-lg sm:text-xl' : 'text-base sm:text-lg'
                          } font-${
                            settings.fontWeight === '400' ? 'normal' : settings.fontWeight === '500' ? 'medium' : settings.fontWeight === '600' ? 'semibold' : 'bold'
                          } leading-snug line-clamp-1`}
                        >
                          {renderPreviewTitle(settings.title || 'Your banner title will appear here...')}
                        </p>
                        {settings.subtitle && (
                          <p style={{ color: settings.textColor }} className="text-xs sm:text-sm mt-0.5 opacity-90 leading-snug line-clamp-1">
                            {settings.subtitle}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  {settings.image && settings.imagePosition === 'right' && settings.animationType !== 'marquee' && (
                    <div className="flex-shrink-0 hidden lg:block">
                      <img src={settings.image} alt="" className="h-7 w-7 object-contain opacity-90" />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center gap-2">
                  {settings.ctaLabel && settings.ctaUrl && (
                    <span
                      style={{
                        backgroundColor: settings.ctaColor || 'rgba(255, 255, 255, 0.2)',
                        color: settings.textColor
                      }}
                      className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border border-white/25 ${settings.ctaStyle === 'pill' ? 'rounded-full' : 'rounded-lg'}`}
                    >
                      {settings.ctaLabel}
                    </span>
                  )}
                  {settings.dismissible && (
                    <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                      <X className="w-4 h-4" style={{ color: settings.textColor }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
          <p className="text-slate-400 text-sm mt-3">
            💡 Tip: Click "Preview" button to see the banner on your actual site with <code className="bg-slate-700 px-1 rounded">?previewBanner=true</code>
            {settings.ctaUrl && <><br/>✨ Banner will be clickable and open: <span className="text-cyan-400">{settings.ctaUrl}</span></>}
          </p>
        </div>
      </div>
    </div>
  )
}
