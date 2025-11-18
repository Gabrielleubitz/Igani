'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Info,
  Target,
  Heart,
  Users,
  Lightbulb,
  Award,
  Settings as SettingsIcon,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react'
import { z } from 'zod'
import {
  getAboutUsSections,
  getAboutUsSettings,
  saveAboutUsSection,
  updateAboutUsSection,
  deleteAboutUsSection,
  saveAboutUsSettings
} from '@/lib/firestore'
import { AboutUsSection, AboutUsSettings } from '@/types'
import { SplashCursor } from '@/components/ui/splash-cursor'

// Validation schemas
const sectionSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  type: z.enum(['hero', 'mission', 'values', 'team', 'story', 'custom']),
  order: z.number().min(1),
  published: z.boolean()
})

const settingsSchema = z.object({
  pageTitle: z.string().min(1, 'Page title is required'),
  pageSubtitle: z.string().min(1, 'Page subtitle is required'),
  metaDescription: z.string().min(1, 'Meta description is required'),
  heroImage: z.string().optional()
})

type TabType = 'sections' | 'settings'

export default function AboutUsAdminPage() {
  const [activeTab, setActiveTab] = useState<TabType>('sections')
  const [sections, setSections] = useState<AboutUsSection[]>([])
  const [settings, setSettings] = useState<AboutUsSettings>({
    pageTitle: 'About IGANI',
    pageSubtitle: 'Crafting digital experiences with passion and precision',
    metaDescription: 'Learn about IGANI - your trusted partner for premium web development and digital solutions.'
  })
  const [isLoading, setIsLoading] = useState(true)
  const [editingSection, setEditingSection] = useState<AboutUsSection | null>(null)
  const [editingSettings, setEditingSettings] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [sectionsData, settingsData] = await Promise.all([
        getAboutUsSections(),
        getAboutUsSettings()
      ])
      setSections(sectionsData.sort((a, b) => a.order - b.order))
      if (settingsData) {
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Error loading about us data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'mission': return Target
      case 'values': return Heart
      case 'team': return Users
      case 'story': return Lightbulb
      default: return Award
    }
  }

  const getSectionTypeColor = (type: string) => {
    switch (type) {
      case 'mission': return 'bg-blue-500/20 text-blue-400'
      case 'values': return 'bg-red-500/20 text-red-400'
      case 'team': return 'bg-green-500/20 text-green-400'
      case 'story': return 'bg-yellow-500/20 text-yellow-400'
      default: return 'bg-purple-500/20 text-purple-400'
    }
  }

  const handleCreateSection = () => {
    const newSection: Partial<AboutUsSection> = {
      title: '',
      content: '',
      type: 'custom',
      order: Math.max(...sections.map(s => s.order), 0) + 1,
      published: true
    }
    setEditingSection(newSection as AboutUsSection)
    setIsCreating(true)
    setErrors({})
  }

  const handleEditSection = (section: AboutUsSection) => {
    setEditingSection({ ...section })
    setIsCreating(false)
    setErrors({})
  }

  const handleSaveSection = async () => {
    if (!editingSection) return

    try {
      const validatedData = sectionSchema.parse(editingSection)
      
      if (isCreating) {
        await saveAboutUsSection(validatedData)
      } else {
        await updateAboutUsSection(editingSection)
      }
      
      await loadData()
      setEditingSection(null)
      setIsCreating(false)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('Error saving section:', error)
      }
    }
  }

  const handleDeleteSection = async (id: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      try {
        await deleteAboutUsSection(id)
        await loadData()
      } catch (error) {
        console.error('Error deleting section:', error)
      }
    }
  }

  const handleSaveSettings = async () => {
    try {
      const validatedData = settingsSchema.parse(settings)
      await saveAboutUsSettings(validatedData)
      setEditingSettings(false)
      setErrors({})
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {}
        error.errors.forEach(err => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(newErrors)
      } else {
        console.error('Error saving settings:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading About Us management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <SplashCursor />
      
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <a
                href="/admin"
                className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Admin</span>
              </a>
              <div>
                <h1 className="text-2xl font-bold text-white mb-1">
                  About Us Management
                </h1>
                <p className="text-slate-400 text-sm">
                  Manage your About Us page content and settings
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setActiveTab('sections')}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all duration-300 ${
              activeTab === 'sections'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/25'
                : 'bg-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Info className="w-5 h-5" />
            Content Sections ({sections.length})
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
            Page Settings
          </button>
        </div>

        {/* Content Sections Tab */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Content Sections</h2>
              <button
                onClick={handleCreateSection}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
              >
                <Plus className="w-4 h-4" />
                Add Section
              </button>
            </div>

            {/* Sections List */}
            <div className="space-y-4">
              {sections.map((section) => (
                <motion.div
                  key={section.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        {(() => {
                          const Icon = getSectionIcon(section.type)
                          return <Icon className="w-5 h-5 text-cyan-400" />
                        })()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {section.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSectionTypeColor(section.type)}`}>
                            {section.type}
                          </span>
                          <div className="flex items-center gap-1">
                            {section.published ? (
                              <Eye className="w-4 h-4 text-green-400" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-slate-500" />
                            )}
                            <span className="text-xs text-slate-400">
                              Order: {section.order}
                            </span>
                          </div>
                        </div>
                        <div 
                          className="text-slate-300 text-sm line-clamp-2"
                          dangerouslySetInnerHTML={{ 
                            __html: section.content.substring(0, 200) + (section.content.length > 200 ? '...' : '') 
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleEditSection(section)}
                        className="p-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteSection(section.id)}
                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {sections.length === 0 && (
                <div className="text-center py-12">
                  <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">No sections created yet</p>
                  <button
                    onClick={handleCreateSection}
                    className="mt-4 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
                  >
                    Create your first section
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Page Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-slate-800/60 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Page Settings</h2>
              {editingSettings ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveSettings}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingSettings(false)
                      setErrors({})
                      loadData() // Reset settings
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingSettings(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Settings
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">Page Title</label>
                <input
                  type="text"
                  value={settings.pageTitle}
                  onChange={(e) => setSettings(prev => ({ ...prev, pageTitle: e.target.value }))}
                  disabled={!editingSettings}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="About IGANI"
                />
                {errors.pageTitle && <p className="text-red-400 text-sm mt-1">{errors.pageTitle}</p>}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Page Subtitle</label>
                <input
                  type="text"
                  value={settings.pageSubtitle}
                  onChange={(e) => setSettings(prev => ({ ...prev, pageSubtitle: e.target.value }))}
                  disabled={!editingSettings}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Crafting digital experiences with passion and precision"
                />
                {errors.pageSubtitle && <p className="text-red-400 text-sm mt-1">{errors.pageSubtitle}</p>}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Meta Description</label>
                <textarea
                  value={settings.metaDescription}
                  onChange={(e) => setSettings(prev => ({ ...prev, metaDescription: e.target.value }))}
                  disabled={!editingSettings}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Learn about IGANI - your trusted partner for premium web development and digital solutions."
                />
                {errors.metaDescription && <p className="text-red-400 text-sm mt-1">{errors.metaDescription}</p>}
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Hero Image URL (Optional)</label>
                <input
                  type="url"
                  value={settings.heroImage || ''}
                  onChange={(e) => setSettings(prev => ({ ...prev, heroImage: e.target.value }))}
                  disabled={!editingSettings}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="https://example.com/hero-image.jpg"
                />
                {errors.heroImage && <p className="text-red-400 text-sm mt-1">{errors.heroImage}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Section Modal */}
      {editingSection && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800 rounded-xl border border-slate-700/50 p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">
                {isCreating ? 'Create New Section' : 'Edit Section'}
              </h2>
              <button
                onClick={() => {
                  setEditingSection(null)
                  setIsCreating(false)
                  setErrors({})
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Title</label>
                  <input
                    type="text"
                    value={editingSection.title}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500"
                    placeholder="Section Title"
                  />
                  {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-white font-medium mb-2">Type</label>
                  <select
                    value={editingSection.type}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, type: e.target.value as any } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                  >
                    <option value="mission">Mission</option>
                    <option value="values">Values</option>
                    <option value="team">Team</option>
                    <option value="story">Story</option>
                    <option value="custom">Custom</option>
                  </select>
                  {errors.type && <p className="text-red-400 text-sm mt-1">{errors.type}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-medium mb-2">Order</label>
                  <input
                    type="number"
                    min="1"
                    value={editingSection.order}
                    onChange={(e) => setEditingSection(prev => prev ? { ...prev, order: parseInt(e.target.value) || 1 } : null)}
                    className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white"
                  />
                  {errors.order && <p className="text-red-400 text-sm mt-1">{errors.order}</p>}
                </div>

                <div>
                  <label className="flex items-center gap-2 text-white font-medium">
                    <input
                      type="checkbox"
                      checked={editingSection.published}
                      onChange={(e) => setEditingSection(prev => prev ? { ...prev, published: e.target.checked } : null)}
                      className="w-4 h-4 text-cyan-600 bg-slate-900 border-slate-600 rounded focus:ring-cyan-500"
                    />
                    Published
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-white font-medium mb-2">Content (HTML Supported)</label>
                <textarea
                  value={editingSection.content}
                  onChange={(e) => setEditingSection(prev => prev ? { ...prev, content: e.target.value } : null)}
                  rows={12}
                  className="w-full px-4 py-3 bg-slate-900/60 border border-slate-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white placeholder-slate-500 font-mono text-sm"
                  placeholder="<p>Your content here... HTML tags are supported.</p>"
                />
                {errors.content && <p className="text-red-400 text-sm mt-1">{errors.content}</p>}
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  onClick={() => {
                    setEditingSection(null)
                    setIsCreating(false)
                    setErrors({})
                  }}
                  className="px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSection}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 transition-all duration-300"
                >
                  {isCreating ? 'Create Section' : 'Save Changes'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}